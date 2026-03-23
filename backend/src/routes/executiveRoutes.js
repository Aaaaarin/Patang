import express from 'express';
import { protectRoute, authorizeRoles } from '../middlewares/authMiddleware.js';
import { validateVenueReview, validateRoleUpdate, validatePenaltyClear } from '../middlewares/executiveValidation.js';
import {
    getDashboard,
    getAnalyticsOverview,
    getBookingAnalytics,
    getSubscriptionAnalytics,
    listUsers,
    getUserDetail,
    updateUserRoles,
    listPenalties,
    updatePenalty,
    listFacilitiesAdmin,
    updateFacility,
    getAuditLog
} from '../controllers/executiveController.js';
import { getPendingVenues, reviewVenue } from '../controllers/executiveVenueController.js';

const router = express.Router();

// All executive routes require executive or admin role
const execAuth = [protectRoute, authorizeRoles('executive', 'admin')];

// ── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', ...execAuth, getDashboard);

// ── Venue Approval ───────────────────────────────────────────────────────────
router.get('/venues/pending', ...execAuth, getPendingVenues);
router.patch('/venues/:blockId', ...execAuth, validateVenueReview, reviewVenue);

// ── Analytics ────────────────────────────────────────────────────────────────
router.get('/analytics/overview', ...execAuth, getAnalyticsOverview);
router.get('/analytics/bookings', ...execAuth, getBookingAnalytics);
router.get('/analytics/subscriptions', ...execAuth, getSubscriptionAnalytics);

// ── User Management ──────────────────────────────────────────────────────────
router.get('/users', ...execAuth, listUsers);
router.get('/users/:userId', ...execAuth, getUserDetail);
router.patch('/users/:userId/roles', ...execAuth, validateRoleUpdate, updateUserRoles);

// ── Penalty Management ───────────────────────────────────────────────────────
router.get('/penalties', ...execAuth, listPenalties);
router.patch('/penalties/:penaltyId', ...execAuth, validatePenaltyClear, updatePenalty);

// ── Facility Management ──────────────────────────────────────────────────────
router.get('/facilities', ...execAuth, listFacilitiesAdmin);
router.patch('/facilities/:facilityId', ...execAuth, updateFacility);

// ── Audit Log ────────────────────────────────────────────────────────────────
router.get('/audit-log', ...execAuth, getAuditLog);

export default router;
