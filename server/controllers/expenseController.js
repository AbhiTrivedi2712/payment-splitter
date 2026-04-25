import Expense from '../models/Expense.js';
import Group from '../models/Group.js';

// @desc    Add an expense to a group
// @route   POST /api/expenses
// @access  Private
export const addExpense = async (req, res) => {
  try {
    const { description, amount, groupId, participants, paidBy, category, splitType, splitDetails } = req.body;

    if (amount <= 0) return res.status(400).json({ message: 'Amount must be greater than zero' });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Make sure user is the creator of the group
    if (group.creator?.toString() !== req.user?._id?.toString()) {
      return res.status(403).json({ message: 'You must be the creator of the group to add an expense' });
    }

    let expenseParticipants = participants !== undefined ? participants : group.members;
    
    if (expenseParticipants.length === 0) {
        return res.status(400).json({ message: 'Expense must have at least one participant' });
    }

    const expense = await Expense.create({
      description,
      amount,
      payer: paidBy || req.user?.name,
      participants: expenseParticipants,
      category: category || 'General',
      splitType: splitType || 'EQUAL',
      splitDetails: splitDetails || [],
      group: groupId,
      createdBy: req.user._id,
    });

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get expenses for a group
// @route   GET /api/expenses/group/:groupId
// @access  Private
export const getGroupExpenses = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.creator?.toString() !== req.user?._id?.toString()) {
      return res.status(403).json({ message: 'Not authorized to view these expenses' });
    }

    const expenses = await Expense.find({ group: req.params.groupId }).sort({ createdAt: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
// @access  Private
export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    
    const group = await Group.findById(expense.group);
    
    if (group && group.creator?.toString() !== req.user?._id?.toString()) {
      return res.status(403).json({ message: 'You can only delete expenses for your own groups' });
    }

    await expense.deleteOne();
    res.json({ message: 'Expense removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update an expense
// @route   PUT /api/expenses/:id
// @access  Private
export const updateExpense = async (req, res) => {
  try {
    const { description, amount, participants, paidBy, category, splitType, splitDetails } = req.body;
    
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    
    const group = await Group.findById(expense.group);
    if (group && group.creator?.toString() !== req.user?._id?.toString()) {
      return res.status(403).json({ message: 'You can only update expenses for your own groups' });
    }

    if (description) expense.description = description;
    if (amount) expense.amount = amount;
    if (participants) expense.participants = participants;
    if (paidBy) expense.payer = paidBy;
    if (category) expense.category = category;
    if (splitType) expense.splitType = splitType;
    if (splitDetails) expense.splitDetails = splitDetails;

    const updatedExpense = await expense.save();
    res.json(updatedExpense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
