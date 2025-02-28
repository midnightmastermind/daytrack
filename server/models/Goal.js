// const mongoose = require("mongoose");

// const GoalSchema = new mongoose.Schema({
//   task_id: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
//   // Optional: if the goal applies to a specific subtask or option, you may record its name.
//   option: { type: String, default: "" },
//   valueType: { type: String, enum: ["integer", "currency", "percentage"], required: true },
//   operator: { type: String, enum: [">", "<", "="], required: true },
//   target: { type: Number, required: true },
//   current: { type: Number, default: 0 },
//   timeScale: { type: String, enum: ["daily", "weekly", "overall"], required: true },
//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now }
// });

// module.exports = mongoose.model("Goal", GoalSchema);


const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
  header: { type: String, default: "" },
  // tasks: an array of mixed objects for now (or you can specify a sub-schema)
  tasks: { type: [mongoose.Schema.Types.Mixed], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Goal', GoalSchema);
