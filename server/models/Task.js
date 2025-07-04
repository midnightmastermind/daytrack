const mongoose = require("mongoose");

const UnitSchema = new mongoose.Schema({
  name: { type: String, required: true },       // Display name
  label: { type: String, default: "" },       // Display name
  key: { type: String, required: true },        // Internal ID
  icon: {
    type: mongoose.Schema.Types.Mixed, // allows object like { type, value }
    default: null,
  },
  prefix: { type: String, default: "" },        // Display prefix (e.g., "$")
  suffix: { type: String, default: "" },        // Display suffix (e.g., "g")
  type: { type: String, enum: ["string", "integer", "float"], default: "float" },
  enabled: { type: Boolean, default: true },    // Can be toggled per goal
  isMulti: { type: Boolean, default: false }    // Allows multiple entries
}, { _id: false });

const TaskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task", default: [] }],
  properties: {
    group: { type: Boolean, default: false },
    adhoc: { type: Boolean, default: false },
    order: { type: Number, default: 0, required: true},
    card: { type: Boolean, default: false },
    checkbox: { type: Boolean, default: false },
    input: { type: Boolean, default: false },
    category: { type: Boolean, default: false },
    preset: { type: Boolean, default: false }, // Subtask is preset
    icon: {
      type: mongoose.Schema.Types.Mixed, // allows object like { type, value }
      default: null,
    },
    grouping: {
      input: { type: mongoose.Schema.Types.Mixed, default: "" },
      units: { type: [UnitSchema], default: [] } // Full unit definitions
    }
  },
  values: {
    checkbox: { type: Boolean, default: false },
    input: { type: mongoose.Schema.Types.Mixed, default: "" }
  },
  goals: { type: [mongoose.Schema.Types.Mixed], default: [] },
  counters: { type: [mongoose.Schema.Types.Mixed], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Task", TaskSchema);