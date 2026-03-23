import express from 'express';
import { protectRoute, authorizeRoles } from '../middlewares/authMiddleware.js';
import {
    listCaptains,
    appointCaptain,
    dismissCaptain,
    getPendingPracticeBlocks,
    reviewPracticeBlock
} from '../controllers/captainAdminController.js';

const router = express.Router();

// All routes require executive or admin role
const executiveAuth = [protectRoute, authorizeRoles('executive', 'admin')];

// ── Captain Management ───────────────────────────────────────────────────────
// GET    /api/executive/captains         — list all captains
router.get('/captains', ...executiveAuth, listCaptains);

// POST   /api/executive/captains         — appoint a user as captain
router.post('/captains', ...executiveAuth, appointCaptain);

// DELETE /api/executive/captains/:userId — dismiss a captain
router.delete('/captains/:userId', ...executiveAuth, dismissCaptain);

// ── Practice Block Review ────────────────────────────────────────────────────
// GET    /api/executive/practice-blocks/pending     — list pending blocks
router.get('/practice-blocks/pending', ...executiveAuth, getPendingPracticeBlocks);

// PATCH  /api/executive/practice-blocks/:blockId    — approve/reject a block
router.patch('/practice-blocks/:blockId', ...executiveAuth, reviewPracticeBlock);

export default router;
