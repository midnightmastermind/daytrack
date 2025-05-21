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
  unitSettings: { type: mongoose.Schema.Types.Mixed }, // ✅ allow object
  units: { type: [mongoose.Schema.Types.Mixed], default: [] }, // ✅ array of unit objects
  children: { type: [mongoose.Schema.Types.Mixed], default: [] }, // ✅ for rendering grouped preview
  flow: { type: String, enum: ["any", "in", "out"], default: "any" },
  starting: { type: Number },
});

const GoalSchema = new mongoose.Schema({
  header: { type: String, default: "" },
  tasks: { type: [GoalTaskSchema], default: [] },
  progress: {
    type: [
      {
        task_id: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
        unitKey: { type: String },
        value: { type: Number },
        date: { type: String },
        flow: { type: String, enum: ["in", "out", "any"] },
        assignmentId: { type: String }
      }
    ],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model("Goal", GoalSchema);