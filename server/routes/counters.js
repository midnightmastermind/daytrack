const express = require('express');
const router = express.Router();
const Counter = require('../models/Counter');

// GET all counters
router.get('/all', async (req, res) => {
  try {
    const counters = await Counter.find({});
    res.json(counters);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// GET a counter by ID
router.get('/:id', async (req, res) => {
  try {
    const counter = await Counter.findById(req.params.id);
    if (!counter) return res.status(404).json({ error: 'Counter not found' });
    res.json(counter);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// POST a new counter
router.post('/', async (req, res) => {
  try {
    const newCounter = new Counter(req.body);
    const savedCounter = await newCounter.save();
    res.status(201).json(savedCounter);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create counter', details: err.message });
  }
});

// PUT update a counter by ID
router.put('/:id', async (req, res) => {
  try {
    const updatedCounter = await Counter.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedCounter);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update counter', details: err.message });
  }
});

// DELETE a counter by ID
router.delete('/:id', async (req, res) => {
  try {
    await Counter.findByIdAndDelete(req.params.id);
    res.json({ message: 'Counter deleted' });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete counter', details: err.message });
  }
});

module.exports = router;
