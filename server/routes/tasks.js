const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

function buildDeepPopulate(levels = 4) {
  let root = { path: "children" };
  let current = root;

  for (let i = 1; i < levels; i++) {
    current.populate = { path: "children" };
    current = current.populate;
  }

  return root;
}

// GET all top-level card tasks with deeply populated children
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find({ "properties.card": true })
      .populate(buildDeepPopulate(6)); // adjust depth here if needed

    res.json(tasks);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: 'Server error' });
  }
});
// POST a new task
router.post('/', async (req, res) => {
  try {
    const newTask = new Task(req.body);
    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create task' });
  }
});

// PUT update a task
router.put('/:id', async (req, res) => {
  try {
    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedTask);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update task' });
  }
});

// DELETE a task
router.delete('/:id', async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
