import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    roles: [{
        type: String,
        enum: ['student', 'faculty', 'caretaker', 'coach', 'executive', 'admin', 'guard', 'gym_admin', 'swim_admin'],
        default: 'student'
    }],
    status: {
        type: String,
        enum: ['active', 'suspended', 'disabled'],
        default: 'active'
    },
    lastLogin: {
        type: Date
    },
    profileDetails: {
        rollNumber: { type: String },
        program: { type: String },
        department: { type: String },
        designation: { type: String },
        assignedFacilities: [{ type: mongoose.Schema.Types.ObjectId }]
    },
    fairUseScore: {
        type: String
    },
    currentPenalties: [{
        type: mongoose.Schema.Types.ObjectId
    }],
    isVerified: {
        type: Boolean,
        default: false
    },
    otp: {
        type: String
    },
    resetPasswordOtp: {
        type: String
    },
    resetPasswordExpires: {
        type: Date
    }
}, { timestamps: true });

userSchema.pre('save', async function () {
    // If the password hasn't been changed, simply return to skip hashing
    if (!this.isModified('password')) {
        return; 
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
