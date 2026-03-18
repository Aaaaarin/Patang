import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    facilityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Facility',
        required: true
    },
    slotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TimeSlot',
        required: true
    },
    bookingDate: {
        type: Date,
        required: true
    },
    slotDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['Confirmed', 'Provisioned', 'Cancelled', 'LateCancelled', 'Attended', 'NoShow', 'AutoCancelled'],
        default: 'Confirmed'
    },
    // Group booking fields
    isGroupBooking: {
        type: Boolean,
        default: false
    },
    groupRequiredCount: {
        type: Number,
        default: 2
    },
    joinedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Check-in tracking
    checkedInAt: {
        type: Date,
        default: null
    },
    checkedInBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // Cancellation tracking
    cancelledAt: {
        type: Date,
        default: null
    },
    cancellationReason: {
        type: String,
        default: null
    }
}, { timestamps: true });

bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ slotId: 1 });
bookingSchema.index({ userId: 1, bookingDate: 1 });
bookingSchema.index({ isGroupBooking: 1, status: 1 });
bookingSchema.index({ slotDate: 1, status: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
