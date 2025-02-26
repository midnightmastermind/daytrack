const mongoose = require('mongoose');

const SubtaskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed, default: null }
});

const ColumnSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subtasks: [SubtaskSchema]
});

const TaskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, default: null },
  columns: [ColumnSchema]
});

module.exports = mongoose.model('Task', TaskSchema);
