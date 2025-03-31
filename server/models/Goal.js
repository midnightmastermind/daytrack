const mongoose = require("mongoose");

const GoalTaskSchema = new mongoose.Schema({
  task_id: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
  path: { type: [String], required: true }, // full path as an array of strings
  target: { type: Number, default: 0 },
  operator: { type: String, enum: ["=", ">", "<"], default: "=" },
  valueType: { type: String, enum: ["integer", "currency", "percentage"], default: "integer" },
  timeScale: { type: String, enum: ["daily", "weekly", "overall"], default: "daily" },
  progress: { type: Number, default: 0 },
  useInput: { type: Boolean, default: false },
  incrementValue: { type: Number, default: 1 }
});

const GoalSchema = new mongoose.Schema({
  header: { type: String, default: "" },
  tasks: { type: [GoalTaskSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model("Goal", GoalSchema);