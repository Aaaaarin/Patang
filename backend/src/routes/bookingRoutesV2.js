import express from 'express';
import { createBooking, joinGroupBooking, cancelBooking, checkIn } from '../controllers/bookingControllerV2.js';
import { protectRoute, authorizeRoles } from '../middlewares/authMiddleware.js';
import { validateBooking } from '../middlewares/validate.js';

const router = express.Router();

router.post('/', protectRoute, authorizeRoles('student', 'faculty', 'admin', 'executive'), validateBooking, createBooking);
router.patch('/:bookingId/join', protectRoute, authorizeRoles('student', 'faculty'), joinGroupBooking);
router.delete('/:bookingId', protectRoute, cancelBooking);
router.post('/:bookingId/check-in', protectRoute, authorizeRoles('caretaker', 'admin'), checkIn);

export default router;
