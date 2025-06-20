const mongoose = require("mongoose");

const GoalUnitSchema = new mongoose.Schema({
  key: { type: String, required: true },
  name: { type: String },
  prefix: { type: String },
  suffix: { type: String },
  type: { type: String, enum: ["float", "integer", "string"], default: "float" },
  icon: { type: mongoose.Schema.Types.Mixed },
  order: { type: Number }, // ✅ new: unit display order
}, { _id: false });

const GoalTaskSchema = new mongoose.Schema({
  task_id: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
  path: { type: [String], required: true },
  order: { type: Number }, // ✅ new: task order

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
  unitSettings: { type: mongoose.Schema.Types.Mixed }, // ✅ keys can contain `.order`
  units: { type: [GoalUnitSchema], default: [] },       // ✅ typed now
  children: { type: [mongoose.Schema.Types.Mixed], default: [] },
  flow: { type: String, enum: ["any", "in", "out"], default: "any" },
  starting: { type: Number },
}, { _id: false });

const GoalSchema = new mongoose.Schema({
  header: { type: String, default: "" },
  order: { type: Number }, // ✅ new: overall goal ordering
  tasks: { type: [GoalTaskSchema], default: [] },
  countdowns: { type: mongoose.Schema.Types.Mixed },
  progress: {
    type: [
      {
        task_id: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
        unitKey: { type: String },
        value: { type: Number },
        date: { type: String },
        flow: { type: String, enum: ["in", "out", "any", "replace"] },
        replaceable: { type: Boolean, default: false },
        assignmentId: { type: String }
      }
    ],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model("Goal", GoalSchema);