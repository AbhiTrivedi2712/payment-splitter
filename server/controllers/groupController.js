import Group from '../models/Group.js';
import User from '../models/User.js';
import Expense from '../models/Expense.js';

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
export const createGroup = async (req, res) => {
  try {
    const { name, description, creator, currency } = req.body;
    
    console.log("Create Group Body:", req.body);

    const groupCreator = creator || req.user?._id;
    if (!groupCreator) {
        return res.status(400).json({ message: "Creator required" });
    }

    const group = await Group.create({
      name,
      description,
      currency: currency || '$',
      creator: groupCreator,
      members: [req.user.name], // Creator's name is automatically a member
    });

    res.status(201).json({ group });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's groups
// @route   GET /api/groups
// @access  Private
export const getMyGroups = async (req, res) => {
  try {
    if (!req.user || !req.user._id) return res.status(401).json({ message: 'User not authenticated' });

    const groups = await Group.find({ creator: req.user._id });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add member to group
// @route   POST /api/groups/:id/members
// @access  Private
export const addMember = async (req, res) => {
  try {
    const { name } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized, only creator can add members' });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Member name is required' });
    }

    const memberName = name.trim();

    if (group.members.includes(memberName)) {
      return res.status(400).json({ message: 'Member already in group' });
    }

    group.members.push(memberName);
    await group.save();

    res.json({ message: 'Member added', group });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get group balances / simplified debts
// @route   GET /api/groups/:id/balances
// @access  Private
export const getGroupBalances = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.creator?.toString() !== req.user?._id?.toString()) {
      return res.status(403).json({ message: 'Not authorized to view balances' });
    }

    const expenses = await Expense.find({ group: req.params.id });

    const balances = {};
    group.members.forEach(m => {
      balances[m] = 0;
    });

    expenses.forEach(expense => {
      const amount = expense.amount;
      const payerId = expense.payer; // String name
      const participants = expense.participants || [];
      const splitType = expense.splitType || 'EQUAL';
      const splitDetails = expense.splitDetails || [];
      
      if (participants.length === 0 && splitDetails.length === 0) return;
      
      if (balances[payerId] !== undefined) balances[payerId] += amount;

      if (splitType === 'EQUAL' || splitDetails.length === 0) {
        const share = amount / participants.length;
        participants.forEach(p => {
          if (balances[p] !== undefined) balances[p] -= share;
        });
      } else {
        splitDetails.forEach(detail => {
          if (balances[detail.user] !== undefined) {
             balances[detail.user] -= detail.amount;
          }
        });
      }
    });

    const debtors = [];
    const creditors = [];

    group.members.forEach(m => {
      const b = balances[m];
      if (b < -0.01) debtors.push({ user: m, amount: Math.abs(b) });
      else if (b > 0.01) creditors.push({ user: m, amount: b });
    });

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const settlements = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(debtor.amount, creditor.amount);

      settlements.push({
        from: debtor.user,
        to: creditor.user,
        amount: Number(amount.toFixed(2))
      });

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    res.json(settlements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
