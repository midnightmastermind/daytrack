const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { syncGoalsWithTask } = require('../helper/goalSync');

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
// Recursive function to save a task tree
async function saveTaskTree(taskData, parentId = null) {
  const children = taskData.children || [];
  delete taskData.children; // remove nested children for now

  // Create the current task without children
  const task = new Task(taskData);
  const savedTask = await task.save();

  // Save each child and attach their IDs to this task
  const childIds = [];
  for (const child of children) {
    const savedChild = await saveTaskTree(child, savedTask._id);
    childIds.push(savedChild._id);
  }

  // Update current task with child IDs
  if (childIds.length > 0) {
    savedTask.children = childIds;
    await savedTask.save();
  }

  // Attach to parent if provided
  if (parentId) {
    await Task.findByIdAndUpdate(parentId, {
      $push: { children: savedTask._id }
    });
  }

  return savedTask;
}

// POST a nested task tree
router.post('/', async (req, res) => {
  try {
    const savedRoot = await saveTaskTree(req.body);
    const populatedRoot = await Task.findById(savedRoot._id).populate(buildDeepPopulate(6));
    res.status(201).json(populatedRoot)
  } catch (err) {
    console.error("POST error:", err);
    res.status(400).json({ error: 'Failed to create task tree', details: err.message });
  }
});

async function updateTaskTree(taskData, parentId = null, options = {}) {
  const { dryRun = false } = options;
  const { _id, children = [], ...rest } = taskData;

  let savedTask;

  // Detect if we're updating or creating
  const isExisting = _id && typeof _id === 'string' && _id.match(/^[0-9a-fA-F]{24}$/);

  if (isExisting) {
    savedTask = await Task.findByIdAndUpdate(_id, rest, { new: true });
  } else {
    const newTask = new Task(rest);
    savedTask = await newTask.save();
  }

  await syncGoalsWithTask(savedTask, { dryRun });
  // Get existing child IDs from DB for comparison
  const existing = await Task.findById(savedTask._id).populate("children");
  const existingChildIds = existing?.children?.map(c => c._id.toString()) || [];

  // Recursively update children and collect their real _ids
  const incomingChildIds = [];
  for (const child of children) {
    const savedChild = await updateTaskTree(child, savedTask._id);
    incomingChildIds.push(savedChild._id.toString());
  }

  // Delete removed children
  const toDelete = existingChildIds.filter(id => !incomingChildIds.includes(id));
  if (toDelete.length > 0) {
    await Task.deleteMany({ _id: { $in: toDelete } });
  }

  // Update child references
  savedTask.children = incomingChildIds;
  await savedTask.save();

  if (parentId) {
    await Task.findByIdAndUpdate(parentId, {
      $addToSet: { children: savedTask._id }
    });
  }

  return savedTask;
}



router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dryRun = req.query.dryRun === 'true'; // ← get it here
    const rootTaskData = { ...req.body, _id: id };
    const updatedTree = await updateTaskTree(rootTaskData, null, { dryRun }); // ← pass it in
    const populatedTree = await Task.findById(updatedTree._id).populate(buildDeepPopulate(6));
    res.status(200).json(populatedTree);
  } catch (err) {
    console.error("PUT error:", err);
    res.status(400).json({ error: 'Failed to update task tree', details: err.message });
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
