import express from 'express';
import { getMyPenalties } from '../controllers/penaltyController.js';
import { protectRoute } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/my', protectRoute, getMyPenalties);

export default router;
