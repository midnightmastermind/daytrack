// const express = require('express');
// const router = express.Router();
// const Goal = require('../models/Goal');

// // GET all goals
// router.get('/all', async (req, res) => {
//   try {
//     const goals = await Goal.find({});
//     res.json(goals);
//   } catch (err) {
//     res.status(500).json({ error: 'Server error', details: err.message });
//   }
// });

// // GET a goal by ID
// router.get('/:id', async (req, res) => {
//   try {
//     const goal = await Goal.findById(req.params.id);
//     if (!goal) return res.status(404).json({ error: 'Goal not found' });
//     res.json(goal);
//   } catch (err) {
//     res.status(500).json({ error: 'Server error', details: err.message });
//   }
// });

// // POST a new goal
// router.post('/', async (req, res) => {
//   try {
//     const newGoal = new Goal(req.body);
//     const savedGoal = await newGoal.save();
//     res.status(201).json(savedGoal);
//   } catch (err) {
//     res.status(400).json({ error: 'Failed to create goal', details: err.message });
//   }
// });

// // PUT update a goal by ID
// router.put('/:id', async (req, res) => {
//   try {
//     const updatedGoal = await Goal.findByIdAndUpdate(req.params.id, req.body, { new: true });
//     res.json(updatedGoal);
//   } catch (err) {
//     res.status(400).json({ error: 'Failed to update goal', details: err.message });
//   }
// });

// // DELETE a goal by ID
// router.delete('/:id', async (req, res) => {
//   try {
//     await Goal.findByIdAndDelete(req.params.id);
//     res.json({ message: 'Goal deleted' });
//   } catch (err) {
//     res.status(400).json({ error: 'Failed to delete goal', details: err.message });
//   }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const Goal = require('../models/Goal');

// GET all goals
router.get('/', async (req, res) => {
  try {
    const goals = await Goal.find({});
    res.json(goals);
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
