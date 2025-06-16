const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const DayPlan = require('../models/DayPlan');

// GET all day plans
router.get('/all', async (req, res) => {
  try {
    const dayPlans = await DayPlan.find({});
    res.json(dayPlans);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// GET a day plan for a specific date (expecting ?date=YYYY-MM-DD in query)
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date query parameter is required' });
    }
    const parsedDate = new Date(date);
    const dayPlan = await DayPlan.findOne({ date: parsedDate });
    res.json(dayPlan);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// POST create a new day plan
router.post('/', async (req, res) => {
  try {
    const { date, plan, result, name } = req.body;
    const newDayPlan = new DayPlan({ date, plan, result, name });
    const savedDayPlan = await newDayPlan.save();

    console.log("📝 Saved new DayPlan:", savedDayPlan);
    res.status(201).json(savedDayPlan);
  } catch (err) {
    console.error("❌ Error in POST /dayplans:", err.message);
    res.status(400).json({ error: 'Failed to create day plan', details: err.message });
  }
});

// PUT update an existing day plan
router.put('/:id', async (req, res) => {
  try {
    const updatedDayPlan = await DayPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedDayPlan);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update day plan', details: err.message });
  }
});

// DELETE a day plan by ID
router.delete('/:id', async (req, res) => {
  try {
    await DayPlan.findByIdAndDelete(req.params.id);
    res.json({ message: 'Day plan deleted' });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete day plan', details: err.message });
  }
});

module.exports = router;
