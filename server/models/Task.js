const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  // Instead of embedding children objects, we store references to other Task documents.
  children: { type: [mongoose.Schema.Types.ObjectId], ref: "Task", default: [] },
  // The new properties object holds UI flags for this task.
  properties: {
    card: { type: Boolean, default: false },
    checkbox: { type: Boolean, default: false },
    input: { type: Boolean, default: false },
    category: { type: Boolean, default: false },
  },
  // Values object for the inputs and checkboxes
  values: {
    checkbox: { type: Boolean, default: false },
    input: { type: String, default: "" }
  },
  // Goals and counters will be set as empty arrays by default.
  goals: { type: [mongoose.Schema.Types.Mixed], default: [] },
  counters: { type: [mongoose.Schema.Types.Mixed], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Task", TaskSchema);
