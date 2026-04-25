import express from 'express';
import { addExpense, getGroupExpenses, deleteExpense, updateExpense } from '../controllers/expenseController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/expenses          → add an expense
router.post('/', protect, addExpense);

// GET /api/expenses/group/:groupId  → get all expenses for a group
router.get('/group/:groupId', protect, getGroupExpenses);

// DELETE /api/expenses/:id    → delete one expense
router.delete('/:id', protect, deleteExpense);

// PUT /api/expenses/:id       → edit an expense
router.put('/:id', protect, updateExpense);

export default router;
