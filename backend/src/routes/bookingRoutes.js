import express from 'express';
import {
    checkAvailability,
    createBooking,
    listMyBookings,
    cancelBooking,
    markAttendance
} from '../controllers/bookingController.js';
import { protectRoute, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/check-availability', protectRoute, checkAvailability);
router.get('/me', protectRoute, listMyBookings);
router.post('/', protectRoute, authorizeRoles('student', 'faculty', 'admin', 'executive'), createBooking);
router.post('/:id/cancel', protectRoute, cancelBooking);
router.post('/:id/attendance', protectRoute, authorizeRoles('caretaker', 'admin', 'executive'), markAttendance);

export default router;
