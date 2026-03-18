import express from 'express';
import { apply, getMySubscriptions, verifyEntry } from '../controllers/subscriptionControllerV2.js';
import { protectRoute, authorizeRoles } from '../middlewares/authMiddleware.js';
import { subscriptionUpload, handleUploadError } from '../middlewares/upload.js';
import { validateSubscriptionApply } from '../middlewares/validate.js';

const router = express.Router();

router.post('/apply', protectRoute, authorizeRoles('student', 'faculty'), subscriptionUpload, handleUploadError, validateSubscriptionApply, apply);
router.get('/my', protectRoute, getMySubscriptions);
router.post('/verify-entry', protectRoute, authorizeRoles('caretaker', 'admin'), verifyEntry);

export default router;
