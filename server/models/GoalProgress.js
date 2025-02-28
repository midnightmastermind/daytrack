const mongoose = require('mongoose');

const GoalProgressSchema = new mongoose.Schema({
  goal_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', required: true },
  date: { type: Date, required: true },
  progress: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('GoalProgress', GoalProgressSchema);
