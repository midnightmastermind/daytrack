const mongoose = require('mongoose');

const GoalProgressSchema = new mongoose.Schema({
  goalId: { type: mongoose.Schema.Types.ObjectId, ref: "Goal", required: true },
  taskId: { type: String, required: true },
  progressKey: { type: String, default: null }, // e.g., "amount", "calories"
  date: { type: Date, required: true },
  value: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('GoalProgress', GoalProgressSchema);
