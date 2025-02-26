const mongoose = require("mongoose");

const CounterSchema = new mongoose.Schema({
  name: { type: String, required: true },       // e.g., "Bank Balance", "Purchase Limit"
  type: { type: String, enum: ["currency", "integer"], required: true },
  current: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Counter", CounterSchema);