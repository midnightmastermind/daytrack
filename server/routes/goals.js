

const express = require('express');
const router = express.Router();
const Goal = require('../models/Goal');
const mongoose = require('mongoose');

// GET all goals
router.get('/', async (req, res) => {
  try {
    const goals = await Goal.find({});
    res.json(goals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/reorder", async (req, res) => {
  const goals  = req.body;

  if (!Array.isArray(goals)) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  try {
    const updates = [];
    for (const g of goals) {
      if (!mongoose.Types.ObjectId.isValid(g._id)) continue;
      const updated = await Goal.findByIdAndUpdate(g._id, { order: g.order }, { new: true });
      if (updated) updates.push(updated);
    }
    res.json(updates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// POST create a new goal
router.post('/', async (req, res) => {
  try {
    const newGoal = new Goal(req.body);
    const savedGoal = await newGoal.save();
    res.status(201).json(savedGoal);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update an existing goal by id
router.put('/:id', async (req, res) => {
  try {
    const updatedGoal = await Goal.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedGoal);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE a goal by id
router.delete('/:id', async (req, res) => {
  try {
    await Goal.findByIdAndDelete(req.params.id);
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


module.exports = router;
