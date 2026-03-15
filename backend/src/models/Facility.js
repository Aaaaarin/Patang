import mongoose from 'mongoose';

const facilitySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        facilityType: {
            type: String,
            enum: ['sports', 'gym', 'swimming'],
            required: true
        },
        sportType: {
            type: String,
            trim: true
        },
        location: {
            type: String,
            trim: true
        },
        totalCourts: {
            type: Number,
            default: 1,
            min: 1
        },
        capacity: {
            type: Number,
            default: 1,
            min: 1
        },
        allowedRoles: [
            {
                type: String,
                enum: ['student', 'faculty', 'caretaker', 'coach', 'executive', 'admin', 'guard', 'gym_admin', 'swim_admin']
            }
        ],
        isOperational: {
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

facilitySchema.index({ facilityType: 1, sportType: 1, isOperational: 1 });

const Facility = mongoose.model('Facility', facilitySchema);

export default Facility;
