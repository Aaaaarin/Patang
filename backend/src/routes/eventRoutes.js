import express from 'express';
import { getApprovedEvents, getMyEvents, createEvent, updateEvent, cancelEvent } from '../controllers/eventController.js';
import { protectRoute, authorizeRoles } from '../middlewares/authMiddleware.js';
import { posterUpload, handleUploadError } from '../middlewares/upload.js';
import { validateEventCreate, validateEventUpdate } from '../middlewares/validate.js';

const router = express.Router();

router.get('/', protectRoute, getApprovedEvents);
router.get('/my', protectRoute, authorizeRoles('admin', 'executive', 'student', 'faculty'), getMyEvents);
router.post('/', protectRoute, authorizeRoles('admin', 'executive', 'student', 'faculty'), posterUpload, handleUploadError, validateEventCreate, createEvent);
router.put('/:eventId', protectRoute, posterUpload, handleUploadError, validateEventUpdate, updateEvent);
router.delete('/:eventId', protectRoute, cancelEvent);

export default router;
