import User from '../models/User.js';
import SubscriptionV2 from '../models/SubscriptionV2.js';
import Penalty from '../models/Penalty.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * GET /api/settings
 *
 * Returns the settings page data:
 * - Full profile details (editable fields highlighted)
 * - Account status & role info
 * - Active subscriptions summary
 * - Penalty / suspension status
 */
export const getSettingsPage = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const userId = req.user._id;

        const [activeSubscriptions, activePenaltyCount, suspensionPenalty] = await Promise.all([
            SubscriptionV2.find({
                userId,
                status: { $in: ['Pending', 'Approved'] }
            })
                .select('facilityType plan status startDate endDate passId')
                .maxTimeMS(5000)
                .lean(),

            Penalty.countDocuments({ userId, isActive: true }),

            Penalty.findOne({
                userId,
                isActive: true,
                suspendedUntil: { $gt: new Date() }
            })
                .select('suspendedUntil type')
                .maxTimeMS(5000)
                .lean()
        ]);

        const profile = {
            _id: req.user._id,
            name: req.user.name || null,
            email: req.user.email,
            roles: req.user.roles,
            captainOf: req.user.captainOf || null,
            status: req.user.status,
            isVerified: req.user.isVerified,
            profileDetails: {
                rollNumber: req.user.profileDetails?.rollNumber || null,
                program: req.user.profileDetails?.program || null,
                department: req.user.profileDetails?.department || null,
                designation: req.user.profileDetails?.designation || null
            },
            createdAt: req.user.createdAt,
            lastLogin: req.user.lastLogin
        };

        const editableFields = ['name', 'profileDetails.program', 'profileDetails.department', 'profileDetails.designation'];

        res.set('Cache-Control', 'private, max-age=30');
        return successResponse(res, 200, {
            profile,
            editableFields,
            account: {
                status: req.user.status,
                isSuspended: !!suspensionPenalty,
                suspendedUntil: suspensionPenalty?.suspendedUntil || null,
                activePenalties: activePenaltyCount
            },
            subscriptions: activeSubscriptions,
            supportContact: 'sports_office@iitk.ac.in'
        });
    } catch (error) {
        console.error('[Settings/Get] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * PATCH /api/settings/profile
 *
 * Update editable profile fields.
 * Body: { name, program, department, designation }
 */
export const updateProfile = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const { name, program, department, designation } = req.body;

        const user = await User.findById(req.user._id);
        if (!user) {
            return errorResponse(res, 404, 'USER_NOT_FOUND', 'User not found');
        }

        // Update allowed fields only
        if (name !== undefined) {
            if (!name.trim()) {
                return errorResponse(res, 400, 'VALIDATION_ERROR', 'Name cannot be empty');
            }
            user.name = name.trim();
        }

        if (!user.profileDetails) user.profileDetails = {};
        if (program !== undefined) user.profileDetails.program = program?.trim() || null;
        if (department !== undefined) user.profileDetails.department = department?.trim() || null;
        if (designation !== undefined) user.profileDetails.designation = designation?.trim() || null;

        await user.save();

        return successResponse(res, 200, {
            name: user.name,
            profileDetails: {
                rollNumber: user.profileDetails.rollNumber,
                program: user.profileDetails.program,
                department: user.profileDetails.department,
                designation: user.profileDetails.designation
            }
        }, 'Profile updated successfully');
    } catch (error) {
        console.error('[Settings/UpdateProfile] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * PATCH /api/settings/password
 *
 * Change password (requires current password verification).
 * Body: { currentPassword, newPassword, confirmPassword }
 */
export const changePassword = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'All password fields are required');
        }

        if (newPassword !== confirmPassword) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'New password and confirmation do not match');
        }

        if (newPassword.length < 8) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'New password must be at least 8 characters');
        }

        if (currentPassword === newPassword) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'New password must differ from current password');
        }

        // Fetch user with password field (auth middleware excludes it)
        const user = await User.findById(req.user._id);
        if (!user) {
            return errorResponse(res, 404, 'USER_NOT_FOUND', 'User not found');
        }

        // Verify current password
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return errorResponse(res, 401, 'INVALID_PASSWORD', 'Current password is incorrect');
        }

        // Update password (pre-save hook will hash it)
        user.password = newPassword;
        await user.save();

        return successResponse(res, 200, null, 'Password changed successfully');
    } catch (error) {
        console.error('[Settings/ChangePassword] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};

/**
 * GET /api/settings/profile-card
 *
 * Lightweight profile data for the avatar dropdown / popup.
 * Fast — minimal queries, no heavy aggregations.
 */
export const getProfileCard = async (req, res) => {
    try {
        if (!req.user?._id) {
            return errorResponse(res, 401, 'AUTH_REQUIRED', 'Authentication required');
        }

        const userId = req.user._id;

        const [activeSubscriptions, activePenaltyCount] = await Promise.all([
            SubscriptionV2.find({
                userId,
                status: 'Approved'
            })
                .select('facilityType plan endDate')
                .maxTimeMS(3000)
                .lean(),

            Penalty.countDocuments({ userId, isActive: true })
        ]);

        // Derive quick fair-use label
        let fairUseLabel;
        if (activePenaltyCount === 0) fairUseLabel = 'Good Standing';
        else if (activePenaltyCount <= 2) fairUseLabel = 'Moderate';
        else fairUseLabel = 'Restricted';

        // Primary role for display
        const displayRole = req.user.roles?.includes('faculty') ? 'Faculty'
            : req.user.roles?.includes('admin') ? 'Admin'
            : req.user.roles?.includes('executive') ? 'Executive'
            : req.user.roles?.includes('caretaker') ? 'Caretaker'
            : req.user.roles?.includes('captain') ? `Captain (${req.user.captainOf || 'Unassigned'})`
            : 'Student';

        res.set('Cache-Control', 'private, max-age=60');
        return successResponse(res, 200, {
            _id: req.user._id,
            name: req.user.name || null,
            email: req.user.email,
            displayRole,
            rollNumber: req.user.profileDetails?.rollNumber || null,
            department: req.user.profileDetails?.department || null,
            accountStatus: req.user.status,
            fairUse: fairUseLabel,
            activeSubscriptions: activeSubscriptions.map(s => ({
                facilityType: s.facilityType,
                plan: s.plan,
                validUntil: s.endDate
            })),
            memberSince: req.user.createdAt,
            lastLogin: req.user.lastLogin
        });
    } catch (error) {
        console.error('[Settings/ProfileCard] Error:', error);
        return errorResponse(res, 500, 'SERVER_ERROR', error.message);
    }
};
