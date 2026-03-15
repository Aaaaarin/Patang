import mongoose from 'mongoose';

const sportsBookingSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        facility: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Facility',
            required: true
        },
        slot: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SportsSlot',
            required: true
        },
        bookingDate: {
            type: Date,
            required: true
        },
        slotStartAt: {
            type: Date,
            required: true
        },
        slotEndAt: {
            type: Date,
            required: true
        },
        status: {
            type: String,
            enum: ['confirmed', 'group_pending', 'cancelled', 'completed', 'no_show', 'waitlisted'],
            default: 'confirmed'
        },
        attendanceStatus: {
            type: String,
            enum: ['pending', 'present', 'absent'],
            default: 'pending'
        },
        isGroupBooking: {
            type: Boolean,
            default: false
        },
        minPlayersRequired: {
            type: Number,
            default: 1
        },
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        ],
        checkInDeadlineMinutes: {
            type: Number,
            default: 10
        },
        cancellationReason: {
            type: String,
            trim: true
        }
    },
    { timestamps: true }
);

sportsBookingSchema.index({ user: 1, slotStartAt: 1, status: 1 });
sportsBookingSchema.index({ facility: 1, slotStartAt: 1, slotEndAt: 1, status: 1 });
sportsBookingSchema.index({ slot: 1, bookingDate: 1, status: 1 });

const SportsBooking = mongoose.model('SportsBooking', sportsBookingSchema);

export default SportsBooking;
