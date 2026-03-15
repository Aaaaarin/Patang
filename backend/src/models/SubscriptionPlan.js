import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
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
        price: {
            type: Number,
            required: true,
            min: 0
        },
        capacity: {
            type: Number,
            min: 1
        },
        validityDays: {
            type: Number,
            required: true,
            min: 1
        },
        isActive: {
            type: Boolean,
            default: true
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    { timestamps: true }
);

subscriptionPlanSchema.index({ type: 1, planDuration: 1, isActive: 1 });

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

export default SubscriptionPlan;
