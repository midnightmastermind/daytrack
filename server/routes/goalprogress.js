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

// Normalize date to midnight UTC
const normalizeDate = (d) => {
  const dt = new Date(d);
  dt.setUTCHours(0, 0, 0, 0);
  return dt;
};

// POST - create or update a single goal progress entry
router.post('/', async (req, res) => {
  try {
    const { taskId, goalId, progressKey = null, date, value } = req.body;

    if (!goalId || !taskId || typeof value !== 'number') {
      return res.status(400).json({ error: 'Missing goalId, taskId, or value' });
    }

    const filter = {
      goalId,
      taskId,
      progressKey,
      date: normalizeDate(date)
    };

    const update = { $set: { value } };

    const updated = await GoalProgress.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
    });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT - update by record ID
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

// DELETE - delete a specific goal progress record by ID
router.delete('/:id', async (req, res) => {
  console.log(req);
  try {
    await GoalProgress.findByIdAndDelete(req.params.id);
    res.json({ id: req.params.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
