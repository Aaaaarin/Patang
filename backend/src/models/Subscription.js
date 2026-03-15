import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        plan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SubscriptionPlan',
            required: true
        },
        facility: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Facility'
        },
        type: {
            type: String,
            enum: ['gym', 'swimming'],
            required: true
        },
        planDuration: {
            type: String,
            enum: ['monthly', 'semesterly', 'yearly'],
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'active', 'expired'],
            default: 'pending'
        },
        paymentProof: {
            url: String,
            fileName: String,
            uploadedAt: Date,
            receiptNumber: String
        },
        adminReview: {
            reviewedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            reviewedAt: Date,
            reason: String
        },
        startsAt: Date,
        endsAt: Date
    },
    { timestamps: true }
);

subscriptionSchema.index({ user: 1, type: 1, status: 1 });
subscriptionSchema.index({ status: 1, createdAt: -1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
