import express from 'express';
import { getPendingEvents, reviewEvent } from '../controllers/eventAdminController.js';
import { protectRoute, authorizeRoles } from '../middlewares/authMiddleware.js';
import { validateAdminAction } from '../middlewares/validate.js';

const router = express.Router();

router.get('/pending', protectRoute, authorizeRoles('admin', 'executive'), getPendingEvents);
router.patch('/:eventId', protectRoute, authorizeRoles('admin', 'executive'), validateAdminAction, reviewEvent);

export default router;
