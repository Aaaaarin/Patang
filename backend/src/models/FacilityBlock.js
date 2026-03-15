import mongoose from 'mongoose';

const facilityBlockSchema = new mongoose.Schema(
    {
        facility: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Facility',
            required: true
        },
        startTime: {
            type: Date,
            required: true
        },
        endTime: {
            type: Date,
            required: true
        },
        reason: {
            type: String,
            enum: ['team_practice', 'event', 'maintenance'],
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'cancelled'],
            default: 'approved'
        },
        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        notes: {
            type: String,
            trim: true
        }
    },
    { timestamps: true }
);

facilityBlockSchema.index({ facility: 1, startTime: 1, endTime: 1, status: 1 });

const FacilityBlock = mongoose.model('FacilityBlock', facilityBlockSchema);

export default FacilityBlock;
