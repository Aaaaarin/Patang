import mongoose from 'mongoose';

const subscriptionV2Schema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    facilityType: {
        type: String,
        required: true,
        enum: ['Gym', 'SwimmingPool']
    },
    plan: {
        type: String,
        required: true,
        enum: ['Monthly', 'Semesterly', 'Yearly']
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Approved', 'Rejected', 'Expired', 'Revoked'],
        default: 'Pending'
    },
    startDate: {
        type: Date,
        default: null
    },
    endDate: {
        type: Date,
        default: null
    },
    medicalCertUrl: {
        type: String,
        required: true
    },
    paymentReceiptUrl: {
        type: String,
        required: true
    },
    // QR Pass
    qrCode: {
        type: String,
        default: null
    },
    passId: {
        type: String,
        default: null,
        unique: true,
        sparse: true
    },
    // Admin actions
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
    }
}, { timestamps: true });

subscriptionV2Schema.index({ userId: 1, status: 1 });
subscriptionV2Schema.index({ facilityType: 1, status: 1 });
subscriptionV2Schema.index({ endDate: 1 });
subscriptionV2Schema.index({ passId: 1 }, { unique: true, sparse: true });

const SubscriptionV2 = mongoose.model('SubscriptionV2', subscriptionV2Schema);

export default SubscriptionV2;
