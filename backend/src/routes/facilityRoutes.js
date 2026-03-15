import express from 'express';
import {
    listFacilities,
    createFacility,
    createSportsSlot,
    getFacilitySlots,
    createFacilityBlock
} from '../controllers/facilityController.js';
import { protectRoute, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', protectRoute, listFacilities);
router.get('/:facilityId/slots', protectRoute, getFacilitySlots);
router.post('/', protectRoute, authorizeRoles('admin', 'executive'), createFacility);
router.post('/slots', protectRoute, authorizeRoles('admin', 'executive', 'coach'), createSportsSlot);
router.post('/blocks', protectRoute, authorizeRoles('admin', 'executive', 'coach'), createFacilityBlock);

export default router;
