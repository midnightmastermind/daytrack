const mongoose = require('mongoose');

const AssignedTaskSchema = new mongoose.Schema({
  task: { type: String, required: true },
  // Stores the task details (columns/subtasks) as JSON
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Stores the original Task's ObjectId; default is null
  parent_id: { type: mongoose.Schema.Types.ObjectId, default: null }
});

const TimeSlotSchema = new mongoose.Schema({
  timeSlot: { type: String, required: true },
  // Array of assigned tasks for this timeslot
  assignedTasks: [AssignedTaskSchema]
});

const DayPlanSchema = new mongoose.Schema({
  // The date for this plan (stored as a Date object)
  date: { type: Date, required: true, unique: true },
  // The planned assignments for the day
  plan: [TimeSlotSchema],
  // The result for the day (same structure as plan)
  result: [TimeSlotSchema]
}, { timestamps: true });

module.exports = mongoose.model('DayPlan', DayPlanSchema);
