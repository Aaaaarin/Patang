import Booking from '../models/Booking.js';
import TimeSlot from '../models/TimeSlot.js';
import Facility from '../models/Facility.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { isWithinNextDays, hoursUntil } from '../utils/dateUtils.js';
import { checkUserSuspension, checkFairUseQuota, updateSlotStatus } from '../services/bookingService.js';
import { createPenalty } from '../services/penaltyService.js';
import { decodeBookingQR, generateBookingQR } from '../services/qrService.js';

/**
 * POST /api/v2/bookings
 * Create a new booking (individual or group).
 */
export const createBooking = async (req, res) => {
    try {
        const { facilityId, slotId, isGroupBooking = false } = req.body;
        const userId = req.user._id;

        // 1. Check suspension
        const suspension = await checkUserSuspension(userId);
        if (suspension) {
            return errorResponse(res, 403, 'USER_SUSPENDED', `You are suspended until ${suspension.suspendedUntil.toISOString()}`);
        }

        // 2. Check fair-use quota
        const quota = await checkFairUseQuota(userId);
        if (!quota.allowed) {
            return errorResponse(res, 400, 'QUOTA_EXCEEDED', 'You have reached the maximum of 2 active bookings in a 72-hour window');
        }

        // 3. Validate facility
        const facility = await Facility.findById(facilityId);
        if (!facility || !facility.isOperational) {
            return errorResponse(res, 404, 'FACILITY_NOT_FOUND', 'Facility not found');
        }

        // 4. Validate slot
        const slot = await TimeSlot.findById(slotId);
        if (!slot) {
            return errorResponse(res, 404, 'SLOT_NOT_FOUND', 'Time slot not found');
        }

        if (slot.status !== 'Available') {
            return errorResponse(res, 400, 'SLOT_UNAVAILABLE', 'This slot is not available');
        }

        // 5. Check slot is within 3-day window
        if (!isWithinNextDays(slot.date, 3)) {
            return errorResponse(res, 400, 'DATE_OUT_OF_RANGE', 'Slot date is beyond the 3-day advance booking window');
        }

        // 6. Check overlapping bookings
        const existingBooking = await Booking.findOne({
            userId,
            status: { $in: ['Confirmed', 'Provisioned'] },
            slotId
        });
        if (existingBooking) {
            return errorResponse(res, 409, 'OVERLAPPING_BOOKING', 'You already have a booking for this slot');
        }

        // 7. Determine status and update slot (optimistic concurrency)
        const bookingStatus = isGroupBooking ? 'Provisioned' : 'Confirmed';
        const newSlotStatus = isGroupBooking ? 'Reserved' : 'Booked';

        const updatedSlot = await updateSlotStatus(slotId, 'Available', newSlotStatus);
        if (!updatedSlot) {
            return errorResponse(res, 400, 'SLOT_UNAVAILABLE', 'Slot was just taken by another user');
        }

        // 8. Create booking
        const groupRequiredCount = isGroupBooking ? (facility.metadata?.minGroupSize || facility.capacity || 2) : 2;

        const booking = await Booking.create({
            userId,
            facilityId,
            slotId,
            bookingDate: new Date(),
            slotDate: slot.date,
            status: bookingStatus,
            isGroupBooking,
            groupRequiredCount,
            joinedUsers: []
        });

        // Generate QR token for check-in
        const qrToken = generateBookingQR(booking._id, userId);

        return successResponse(res, 201, {
            _id: booking._id,
            userId: booking.userId,
            facilityId: booking.facilityId,
            slotId: booking.slotId,
            status: booking.status,
            isGroupBooking: booking.isGroupBooking,
            bookingDate: booking.bookingDate,
            slotDate: booking.slotDate,
            qrToken
        }, 'Booking created successfully');
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * PATCH /api/v2/bookings/:bookingId/join
 * Join an existing group booking.
 */
export const joinGroupBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user._id;

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return errorResponse(res, 404, 'BOOKING_NOT_FOUND', 'Booking not found');
        }

        if (!booking.isGroupBooking) {
            return errorResponse(res, 400, 'NOT_GROUP_BOOKING', 'This is not a group booking');
        }

        if (booking.status !== 'Provisioned') {
            return errorResponse(res, 400, 'GROUP_FULL', 'Group booking is no longer accepting members');
        }

        // Check if user is the creator
        if (String(booking.userId) === String(userId)) {
            return errorResponse(res, 400, 'ALREADY_JOINED', 'You are the creator of this booking');
        }

        // Check if already joined
        if (booking.joinedUsers.map(String).includes(String(userId))) {
            return errorResponse(res, 400, 'ALREADY_JOINED', 'You have already joined this group');
        }

        // Check fair-use quota
        const quota = await checkFairUseQuota(userId);
        if (!quota.allowed) {
            return errorResponse(res, 400, 'QUOTA_EXCEEDED', 'Your fair-use quota is exceeded');
        }

        // Add user
        booking.joinedUsers.push(userId);

        // Check if group is now full (joinedUsers + creator >= required)
        const totalMembers = booking.joinedUsers.length + 1;
        if (totalMembers >= booking.groupRequiredCount) {
            booking.status = 'Confirmed';
            // Update slot status from Reserved to Booked
            await updateSlotStatus(booking.slotId, 'Reserved', 'Booked');
        }

        await booking.save();

        return successResponse(res, 200, {
            _id: booking._id,
            status: booking.status,
            joinedUsers: booking.joinedUsers,
            groupRequiredCount: booking.groupRequiredCount
        }, 'Successfully joined group booking');
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * DELETE /api/v2/bookings/:bookingId
 * Cancel a booking.
 */
export const cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user._id;

        const booking = await Booking.findById(bookingId).populate('slotId');
        if (!booking) {
            return errorResponse(res, 404, 'BOOKING_NOT_FOUND', 'Booking not found');
        }

        if (String(booking.userId) !== String(userId)) {
            return errorResponse(res, 403, 'NOT_OWNER', 'You can only cancel your own bookings');
        }

        if (!['Confirmed', 'Provisioned'].includes(booking.status)) {
            return errorResponse(res, 400, 'CANNOT_CANCEL', 'This booking cannot be cancelled');
        }

        // Calculate time until slot start
        const slotStartTime = booking.slotId?.startTime;
        const hrsUntilSlot = slotStartTime ? hoursUntil(slotStartTime) : Infinity;

        let penaltyApplied = false;

        if (hrsUntilSlot >= 2) {
            booking.status = 'Cancelled';
        } else {
            booking.status = 'LateCancelled';
            await createPenalty(userId, 'LateCancellation', booking._id, 'Late cancellation within 2 hours of slot start');
            penaltyApplied = true;
        }

        booking.cancelledAt = new Date();
        booking.cancellationReason = req.body?.reason || 'User cancelled';
        await booking.save();

        // Release the slot
        await TimeSlot.findByIdAndUpdate(booking.slotId._id, { status: 'Available' });

        return successResponse(res, 200, {
            status: booking.status,
            penaltyApplied
        }, 'Booking cancelled successfully');
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * POST /api/v2/bookings/:bookingId/check-in
 * Caretaker scans QR to mark attendance.
 */
export const checkIn = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { qrToken } = req.body;

        if (!qrToken) {
            return errorResponse(res, 400, 'INVALID_QR', 'qrToken is required');
        }

        // Decode QR
        const decoded = decodeBookingQR(qrToken);
        if (!decoded) {
            return errorResponse(res, 400, 'INVALID_QR', 'QR token is invalid or expired');
        }

        if (decoded.bookingId !== bookingId) {
            return errorResponse(res, 400, 'INVALID_QR', 'QR token does not match this booking');
        }

        const booking = await Booking.findById(bookingId).populate('slotId');
        if (!booking) {
            return errorResponse(res, 404, 'BOOKING_NOT_FOUND', 'Booking not found');
        }

        if (booking.status === 'Attended') {
            return errorResponse(res, 400, 'ALREADY_CHECKED_IN', 'User has already checked in');
        }

        if (booking.status !== 'Confirmed') {
            return errorResponse(res, 400, 'INVALID_QR', 'Booking is not in a confirmed state');
        }

        // Check 15-minute window from slot start
        const slotStart = booking.slotId?.startTime;
        if (slotStart) {
            const now = new Date();
            const windowEnd = new Date(slotStart.getTime() + 15 * 60 * 1000);
            if (now > windowEnd) {
                return errorResponse(res, 400, 'CHECK_IN_WINDOW_CLOSED', 'Check-in window has closed (more than 15 minutes past slot start)');
            }
        }

        booking.status = 'Attended';
        booking.checkedInAt = new Date();
        booking.checkedInBy = req.user._id;
        await booking.save();

        return successResponse(res, 200, {
            bookingId: booking._id,
            status: 'Attended',
            checkedInAt: booking.checkedInAt
        }, 'Check-in successful');
    } catch (error) {
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};
