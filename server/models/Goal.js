const mongoose = require("mongoose");

// === Unit settings for grouped unit tasks
const GoalUnitSchema = new mongoose.Schema({
  key: { type: String, required: true },
  name: { type: String },
  prefix: { type: String },
  suffix: { type: String },
  type: { type: String, enum: ["float", "integer", "string"], default: "float" },
  icon: { type: mongoose.Schema.Types.Mixed },
  order: { type: Number },
}, { _id: false });

// === Progress entries (now per goalItem)
const GoalProgressSchema = new mongoose.Schema({
  task_id: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
  unitKey: { type: String },
  value: { type: Number },
  goalItemKey: { type: String},
  date: { type: String },
  flow: { type: String, enum: ["in", "out", "any", "replace"] },
  replaceable: { type: Boolean, default: false },
  assignmentId: { type: String }
}, { _id: false });

// === GoalTask (attached to each GoalItem)
const GoalTaskSchema = new mongoose.Schema({
  task_id: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
  path: { type: [String], required: true },
  order: { type: Number },

  useInput: { type: Boolean, default: false },
  incrementValue: { type: Number, default: 1 },
  reverseFlow: { type: Boolean, default: false },
  replaceable: { type: Boolean, default: false },

  grouping: { type: Boolean, default: false },
  type: { type: String, enum: ["goal", "tracker"], default: "goal" },
  unit: { type: String },
  unitSettings: { type: mongoose.Schema.Types.Mixed },
  units: { type: [GoalUnitSchema], default: [] },
  children: { type: [mongoose.Schema.Types.Mixed], default: [] },
  flow: { type: String, enum: ["any", "in", "out"], default: "any" },

  // 🕰️ Legacy per-task logic (now handled at GoalItem level)
  // target: { type: Number, default: 0 },
  // operator: { type: String, enum: ["=", ">", "<"], default: "=" },
  // valueType: { type: String, enum: ["integer", "currency", "percentage"], default: "integer" },
  // timeScale: { type: String, enum: ["daily", "weekly", "overall"], default: "daily" },
  // hasTarget: { type: Boolean, default: true },
  // starting: { type: Number },
}, { _id: false });

// === GoalItem: Now contains logic, progress, and task list
const GoalItemSchema = new mongoose.Schema({
  label: { type: String },
  tasks: { type: [GoalTaskSchema], default: [] },
  progress: { type: [GoalProgressSchema], default: [] },
  unitPrefix: { type: String, default: "" },
  unitSuffix: { type: String, default: "" },
  // 🎯 Logic for the entire goal item
  target: { type: Number, default: 0 },
  operator: { type: String, enum: ["=", ">", "<"], default: "=" },
  valueType: { type: String, enum: ["integer", "currency", "percentage"], default: "integer" },
  timeScale: { type: String, enum: ["daily", "weekly", "overall"], default: "daily" },
  hasTarget: { type: Boolean, default: true },
  starting: { type: Number },
}, { _id: false });

// === Main Goal schema
const GoalSchema = new mongoose.Schema({
  header: { type: String, default: "" },
  order: { type: Number },

  // ✅ New structure (preferred)
  goalItems: { type: [GoalItemSchema], default: [] },

  // 🧟 Legacy flat task list (optional for migration support)
  // tasks: { type: [GoalTaskSchema], default: [] },

  countdowns: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model("Goal", GoalSchema);
