import mongoose from 'mongoose';

const timeSlotSchema = new mongoose.Schema({
    facilityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Facility',
        required: true
    },
    date: {
        type: Date,
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
    status: {
        type: String,
        required: true,
        enum: ['Available', 'Booked', 'Reserved', 'Maintenance'],
        default: 'Available'
    }
}, { timestamps: true });

timeSlotSchema.index({ facilityId: 1, date: 1, status: 1 });
timeSlotSchema.index({ startTime: 1 });

const TimeSlot = mongoose.model('TimeSlot', timeSlotSchema);

export default TimeSlot;
