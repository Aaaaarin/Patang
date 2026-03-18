import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Cultural', 'Technical', 'Sports', 'Notice', 'Other']
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    venue: {
        type: String,
        default: null
    },
    venueSlotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TimeSlot',
        default: null
    },
    organizingClub: {
        type: String,
        required: true
    },
    registrationLink: {
        type: String,
        default: null
    },
    posterUrl: {
        type: String,
        default: null
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Approved', 'Rejected', 'Cancelled', 'ChangesRequested'],
        default: 'Pending'
    },
    // Moderation
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    reviewedAt: {
        type: Date,
        default: null
    },
    rejectionReason: {
        type: String,
        default: null
    },
    changeRequestNote: {
        type: String,
        default: null
    }
}, { timestamps: true });

eventSchema.index({ status: 1, startTime: 1 });
eventSchema.index({ category: 1, status: 1 });
eventSchema.index({ createdBy: 1 });
eventSchema.index({ startTime: 1, endTime: 1 });

const Event = mongoose.model('Event', eventSchema);

export default Event;
