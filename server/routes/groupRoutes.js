import express from 'express';
import { createGroup, getMyGroups, addMember, getGroupBalances } from '../controllers/groupController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').post(protect, createGroup).get(protect, getMyGroups);
router.post('/:id/members', protect, addMember);
router.get('/:id/balances', protect, getGroupBalances);

export default router;
