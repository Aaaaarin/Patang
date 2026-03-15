import mongoose from 'mongoose';

const sportsSlotSchema = new mongoose.Schema(
    {
        facility: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Facility',
            required: true
        },
        label: {
            type: String,
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
        capacity: {
            type: Number,
            default: 1,
            min: 1
        },
        minPlayersRequired: {
            type: Number,
            default: 1,
            min: 1
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

sportsSlotSchema.index({ facility: 1, startTime: 1, endTime: 1, isActive: 1 });

const SportsSlot = mongoose.model('SportsSlot', sportsSlotSchema);

export default SportsSlot;
