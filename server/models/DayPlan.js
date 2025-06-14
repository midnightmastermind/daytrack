const mongoose = require('mongoose');

const DayPlanSchema = new mongoose.Schema({
  date: { type: Date },
  // The "plan" field represents the planned schedule.
  plan: { type: Array, default: [] },
  // The "result" field represents what was actually executed.
  result: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  name: { type: String, default: ""}
});

module.exports = mongoose.model("DayPlan", DayPlanSchema);