const mongoose = require("mongoose");
const GoalTaskSchema = new mongoose.Schema({
  task_id: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
  path: { type: [String], required: true },

  // Regular goal fields
  target: { type: Number, default: 0 },
  operator: { type: String, enum: ["=", ">", "<"], default: "=" },
  valueType: { type: String, enum: ["integer", "currency", "percentage"], default: "integer" },
  timeScale: { type: String, enum: ["daily", "weekly", "overall"], default: "daily" },
  useInput: { type: Boolean, default: false },
  incrementValue: { type: Number, default: 1 },

  // Grouped/tracker-specific fields
  grouping: { type: Boolean, default: false },
  type: { type: String, enum: ["goal", "tracker"], default: "goal" },
  unit: { type: String },
  flow: { type: String, enum: ["any", "in", "out"], default: "any" },
  starting: { type: Number }  // optional for tracker
});

const GoalSchema = new mongoose.Schema({
  header: { type: String, default: "" },
  tasks: { type: [GoalTaskSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model("Goal", GoalSchema);