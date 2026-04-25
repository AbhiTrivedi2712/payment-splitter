import mongoose from 'mongoose';

const expenseSchema = mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    payer: {
      type: String,
      required: true,
    },
    participants: [{
      type: String,
    }],
    category: {
      type: String,
      default: 'General',
    },
    splitType: {
      type: String,
      enum: ['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'],
      default: 'EQUAL',
    },
    splitDetails: [{
      user: { type: String, required: true },
      amount: { type: Number, required: true },
      percentage: { type: Number },
      shares: { type: Number }
    }],
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
