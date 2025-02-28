const express = require('express');
const router = express.Router();
const GoalProgress = require('../models/GoalProgress');

// GET all goal progress records
router.get('/', async (req, res) => {
  try {
    const records = await GoalProgress.find({});
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create a new goal progress record
router.post('/', async (req, res) => {
  try {
    const newRecord = new GoalProgress(req.body);
    const savedRecord = await newRecord.save();
    res.status(201).json(savedRecord);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update a goal progress record by id
router.put('/:id', async (req, res) => {
  try {
    const updatedRecord = await GoalProgress.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedRecord);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE a goal progress record by id
router.delete('/:id', async (req, res) => {
  try {
    await GoalProgress.findByIdAndDelete(req.params.id);
    res.json({ message: 'Goal progress record deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
