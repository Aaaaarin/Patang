import mongoose from 'mongoose';

const accessPassSchema = new mongoose.Schema(
    {
        subscription: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subscription',
            required: true,
            unique: true
        },
        qrToken: {
            type: String,
            required: true
        },
        validUntil: {
            type: Date,
            required: true
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

accessPassSchema.index({ qrToken: 1, validUntil: 1, isActive: 1 });

const AccessPass = mongoose.model('AccessPass', accessPassSchema);

export default AccessPass;
