const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task", default: [] }],
  properties: {
    card: { type: Boolean, default: false },
    checkbox: { type: Boolean, default: false },
    input: { type: Boolean, default: false },
    category: { type: Boolean, default: false }
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