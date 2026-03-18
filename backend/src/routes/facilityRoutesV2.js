import express from 'express';
import { listFacilities, getAvailability } from '../controllers/facilityControllerV2.js';
import { protectRoute } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', protectRoute, listFacilities);
router.get('/:facilityId/availability', protectRoute, getAvailability);

export default router;
