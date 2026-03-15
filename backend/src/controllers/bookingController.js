import Facility from '../models/Facility.js';
import SportsSlot from '../models/SportsSlot.js';
import FacilityBlock from '../models/FacilityBlock.js';
import SportsBooking from '../models/SportsBooking.js';

const ACTIVE_BOOKING_STATUSES = ['confirmed', 'group_pending', 'waitlisted'];
const CANCELLABLE_STATUSES = ['confirmed', 'group_pending', 'waitlisted'];
const FAIR_USE_WINDOW_IN_MS = 3 * 24 * 60 * 60 * 1000;

const buildSlotDateTime = (bookingDate, timeString) => {
    const date = new Date(bookingDate);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    const [hours, minutes] = timeString.split(':').map(Number);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return null;
    }

    date.setHours(hours, minutes, 0, 0);
    return date;
};

const getQuotaWindow = (slotStartAt) => ({
    $gte: new Date(slotStartAt.getTime() - FAIR_USE_WINDOW_IN_MS),
    $lte: new Date(slotStartAt.getTime() + FAIR_USE_WINDOW_IN_MS)
});

const canUserAccessFacility = (facility, userRoles) => {
    if (!facility.allowedRoles?.length) {
        return true;
    }

    return userRoles.some((role) => facility.allowedRoles.includes(role));
};

export const checkAvailability = async (req, res) => {
    try {
        const { slotId, bookingDate } = req.query;

        if (!slotId || !bookingDate) {
            return res.status(400).json({ message: 'slotId and bookingDate are required' });
        }

        const slot = await SportsSlot.findById(slotId).populate('facility');

        if (!slot || !slot.isActive) {
            return res.status(404).json({ message: 'Slot not found' });
        }

        const slotStartAt = buildSlotDateTime(bookingDate, slot.startTime);
        const slotEndAt = buildSlotDateTime(bookingDate, slot.endTime);

        if (!slotStartAt || !slotEndAt || slotEndAt <= slotStartAt) {
            return res.status(400).json({ message: 'Invalid slot date/time combination' });
        }

        const [activeBookings, quotaUsage, activeBlock] = await Promise.all([
            SportsBooking.countDocuments({
                slot: slot._id,
                bookingDate: {
                    $gte: new Date(new Date(bookingDate).setHours(0, 0, 0, 0)),
                    $lte: new Date(new Date(bookingDate).setHours(23, 59, 59, 999))
                },
                status: { $in: ACTIVE_BOOKING_STATUSES }
            }),
            SportsBooking.countDocuments({
                user: req.user._id,
                slotStartAt: getQuotaWindow(slotStartAt),
                status: { $in: ACTIVE_BOOKING_STATUSES }
            }),
            FacilityBlock.findOne({
                facility: slot.facility._id,
                status: 'approved',
                startTime: { $lt: slotEndAt },
                endTime: { $gt: slotStartAt }
            })
        ]);

        res.json({
            facility: slot.facility,
            slot,
            bookingDate,
            capacity: slot.capacity,
            activeBookings,
            remainingCapacity: Math.max(slot.capacity - activeBookings, 0),
            userQuotaUsage: quotaUsage,
            quotaLimit: 2,
            isBlocked: Boolean(activeBlock),
            blockReason: activeBlock?.reason ?? null
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createBooking = async (req, res) => {
    try {
        const { slotId, bookingDate, isGroupBooking = false, participantIds = [] } = req.body;

        if (!slotId || !bookingDate) {
            return res.status(400).json({ message: 'slotId and bookingDate are required' });
        }

        if (req.user.status !== 'active') {
            return res.status(403).json({ message: 'Only active users can create bookings' });
        }

        const slot = await SportsSlot.findById(slotId).populate('facility');

        if (!slot || !slot.isActive) {
            return res.status(404).json({ message: 'Slot not found' });
        }

        if (slot.facility.facilityType !== 'sports') {
            return res.status(400).json({ message: 'Only sports facilities can be booked through this endpoint' });
        }

        if (!slot.facility.isOperational) {
            return res.status(400).json({ message: 'Selected facility is not operational' });
        }

        if (!canUserAccessFacility(slot.facility, req.user.roles)) {
            return res.status(403).json({ message: 'You are not allowed to book this facility' });
        }

        const slotStartAt = buildSlotDateTime(bookingDate, slot.startTime);
        const slotEndAt = buildSlotDateTime(bookingDate, slot.endTime);

        if (!slotStartAt || !slotEndAt || slotEndAt <= slotStartAt) {
            return res.status(400).json({ message: 'Invalid slot date/time combination' });
        }

        const [quotaUsage, activeBlock, activeBookings, existingBooking] = await Promise.all([
            SportsBooking.countDocuments({
                user: req.user._id,
                slotStartAt: getQuotaWindow(slotStartAt),
                status: { $in: ACTIVE_BOOKING_STATUSES }
            }),
            FacilityBlock.findOne({
                facility: slot.facility._id,
                status: 'approved',
                startTime: { $lt: slotEndAt },
                endTime: { $gt: slotStartAt }
            }),
            SportsBooking.countDocuments({
                slot: slot._id,
                bookingDate: {
                    $gte: new Date(new Date(bookingDate).setHours(0, 0, 0, 0)),
                    $lte: new Date(new Date(bookingDate).setHours(23, 59, 59, 999))
                },
                status: { $in: ACTIVE_BOOKING_STATUSES }
            }),
            SportsBooking.findOne({
                user: req.user._id,
                slot: slot._id,
                bookingDate: {
                    $gte: new Date(new Date(bookingDate).setHours(0, 0, 0, 0)),
                    $lte: new Date(new Date(bookingDate).setHours(23, 59, 59, 999))
                },
                status: { $in: ACTIVE_BOOKING_STATUSES }
            })
        ]);

        if (quotaUsage >= 2) {
            return res.status(400).json({ message: 'Booking quota exceeded for the rolling 3-day window' });
        }

        if (activeBlock) {
            return res.status(400).json({ message: `Slot unavailable due to ${activeBlock.reason}` });
        }

        if (activeBookings >= slot.capacity) {
            return res.status(400).json({ message: 'Selected slot is already full' });
        }

        if (existingBooking) {
            return res.status(400).json({ message: 'You already hold an active booking for this slot/date' });
        }

        const participants = [...new Set([String(req.user._id), ...participantIds.map(String)])];
        const minPlayersRequired = isGroupBooking ? Math.max(slot.minPlayersRequired, participants.length) : 1;

        const booking = await SportsBooking.create({
            user: req.user._id,
            facility: slot.facility._id,
            slot: slot._id,
            bookingDate: new Date(bookingDate),
            slotStartAt,
            slotEndAt,
            status: isGroupBooking ? 'group_pending' : 'confirmed',
            isGroupBooking,
            minPlayersRequired,
            participants
        });

        const populatedBooking = await SportsBooking.findById(booking._id)
            .populate('facility')
            .populate('slot')
            .populate('user', 'name email roles');

        res.status(201).json(populatedBooking);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const listMyBookings = async (req, res) => {
    try {
        const bookings = await SportsBooking.find({ user: req.user._id })
            .populate('facility')
            .populate('slot')
            .sort({ slotStartAt: 1 });

        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const cancelBooking = async (req, res) => {
    try {
        const booking = await SportsBooking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        const isOwner = String(booking.user) === String(req.user._id);
        const isPrivileged = req.user.roles.some((role) => ['caretaker', 'admin', 'executive'].includes(role));

        if (!isOwner && !isPrivileged) {
            return res.status(403).json({ message: 'You are not allowed to cancel this booking' });
        }

        if (!CANCELLABLE_STATUSES.includes(booking.status)) {
            return res.status(400).json({ message: 'This booking can no longer be cancelled' });
        }

        booking.status = 'cancelled';
        booking.cancellationReason = req.body.reason;
        await booking.save();

        res.json(booking);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const markAttendance = async (req, res) => {
    try {
        const { attendanceStatus } = req.body;
        const booking = await SportsBooking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (!['present', 'absent'].includes(attendanceStatus)) {
            return res.status(400).json({ message: 'attendanceStatus must be present or absent' });
        }

        booking.attendanceStatus = attendanceStatus;
        booking.status = attendanceStatus === 'present' ? 'completed' : 'no_show';
        await booking.save();

        res.json(booking);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
