import Penalty from '../models/Penalty.js';
import Booking from '../models/Booking.js';
import TimeSlot from '../models/TimeSlot.js';

const FAIR_USE_WINDOW_MS = 72 * 60 * 60 * 1000; // 72 hours
const MAX_ACTIVE_BOOKINGS = 2;

/**
 * Check if user is currently suspended.
 * Returns the active suspension penalty or null.
 */
export const checkUserSuspension = async (userId) => {
    const suspension = await Penalty.findOne({
        userId,
        isActive: true,
        suspendedUntil: { $gt: new Date() }
    });
    return suspension;
};

/**
 * Check fair-use quota: count user's active bookings in 72h window.
 * Returns { count, allowed }.
 */
export const checkFairUseQuota = async (userId) => {
    const windowStart = new Date(Date.now() - FAIR_USE_WINDOW_MS);
    const count = await Booking.countDocuments({
        userId,
        status: { $in: ['Confirmed', 'Provisioned'] },
        bookingDate: { $gte: windowStart }
    });
    return { count, allowed: count < MAX_ACTIVE_BOOKINGS };
};

/**
 * Check for overlapping active bookings for the user on the same date/time.
 */
export const checkOverlappingBooking = async (userId, slotId) => {
    const slot = await TimeSlot.findById(slotId);
    if (!slot) return null;

    const overlap = await Booking.findOne({
        userId,
        status: { $in: ['Confirmed', 'Provisioned'] },
        slotId: { $ne: slotId }
    }).populate('slotId');

    if (!overlap || !overlap.slotId) return null;

    const existingStart = overlap.slotId.startTime;
    const existingEnd = overlap.slotId.endTime;

    // Check time overlap
    if (slot.startTime < existingEnd && slot.endTime > existingStart) {
        return overlap;
    }

    return null;
};

/**
 * Update slot status using optimistic concurrency.
 * Returns the updated slot or null if race condition.
 */
export const updateSlotStatus = async (slotId, fromStatus, toStatus) => {
    const updatedSlot = await TimeSlot.findOneAndUpdate(
        { _id: slotId, status: fromStatus },
        { status: toStatus },
        { new: true }
    );
    return updatedSlot;
};
