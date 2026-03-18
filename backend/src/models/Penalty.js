import mongoose from 'mongoose';

const penaltySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['NoShow', 'LateCancellation', 'Misuse']
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    suspendedUntil: {
        type: Date,
        default: null
    },
    description: {
        type: String,
        default: null
    }
}, { timestamps: true });

penaltySchema.index({ userId: 1, isActive: 1 });
penaltySchema.index({ userId: 1, type: 1, createdAt: -1 });

const Penalty = mongoose.model('Penalty', penaltySchema);

export default Penalty;
