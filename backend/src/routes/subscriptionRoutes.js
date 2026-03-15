import express from 'express';
import {
    listSubscriptionPlans,
    createSubscriptionPlan,
    createSubscriptionRequest,
    listMySubscriptions,
    listPendingSubscriptionRequests,
    approveSubscriptionRequest,
    rejectSubscriptionRequest,
    scanAccessPass,
    authorizeSubscriptionAdmin
} from '../controllers/subscriptionController.js';
import { protectRoute, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/plans', protectRoute, listSubscriptionPlans);
router.get('/me', protectRoute, listMySubscriptions);
router.post('/plans', protectRoute, authorizeSubscriptionAdmin, createSubscriptionPlan);
router.post('/requests', protectRoute, createSubscriptionRequest);
router.get('/requests', protectRoute, authorizeSubscriptionAdmin, listPendingSubscriptionRequests);
router.post('/requests/:id/approve', protectRoute, authorizeSubscriptionAdmin, approveSubscriptionRequest);
router.post('/requests/:id/reject', protectRoute, authorizeSubscriptionAdmin, rejectSubscriptionRequest);
router.post('/scan', protectRoute, authorizeRoles('caretaker', 'admin', 'executive', 'gym_admin', 'swim_admin'), scanAccessPass);

export default router;
