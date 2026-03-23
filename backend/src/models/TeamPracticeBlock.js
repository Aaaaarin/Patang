import mongoose from 'mongoose';

const teamPracticeBlockSchema = new mongoose.Schema(
    {
        captain: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        facility: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Facility',
            required: true
        },
        sport: {
            type: String,
            required: true,
            trim: true
        },
        startTime: {
            type: String,
            required: true
        },
        endTime: {
            type: String,
            required: true
        },
        daysOfWeek: [
            {
                type: Number,
                min: 0,
                max: 6
            }
        ],
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'cancelled'],
            default: 'pending'
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reviewedAt: {
            type: Date
        },
        rejectionReason: {
            type: String,
            trim: true
        },
        notes: {
            type: String,
            trim: true
        }
    },
    { timestamps: true }
);

teamPracticeBlockSchema.index({ facility: 1, status: 1, daysOfWeek: 1 });
teamPracticeBlockSchema.index({ captain: 1, status: 1 });

const TeamPracticeBlock = mongoose.model('TeamPracticeBlock', teamPracticeBlockSchema);

export default TeamPracticeBlock;
