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

// POST create or increment progress for a task within a goal
router.post('/', async (req, res) => {
  try {
    const { taskId, goalId, date, increment } = req.body;

    if (!goalId || !taskId || typeof increment !== 'number') {
      return res.status(400).json({ error: 'Missing goalId, taskId, or increment' });
    }

    const update = { $inc: { [`progress.${taskId}`]: increment } };
    const filter = { goal_id: goalId, date: new Date(date) };

    const updated = await GoalProgress.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
    });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT replace a full goal progress record by ID
router.put('/:id', async (req, res) => {
  try {
    const updatedRecord = await GoalProgress.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedRecord);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE a goal progress record by ID
router.delete('/:id', async (req, res) => {
  try {
    await GoalProgress.findByIdAndDelete(req.params.id);
    res.json({ message: 'Goal progress record deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
