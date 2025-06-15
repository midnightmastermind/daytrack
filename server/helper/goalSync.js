const Goal = require('../models/Goal');
const deepEqual = require('fast-deep-equal'); // Install if not yet: `npm i fast-deep-equal`

function mergeUnits(taskUnits = [], goalUnits = []) {
  return taskUnits.map(taskUnit => {
    const goalUnit = goalUnits.find(u => u.key === taskUnit.key) || {};

    return {
      ...goalUnit, // preserve goal-specific fields
      name: taskUnit.name,
      label: taskUnit.label,
      icon: taskUnit.icon,
      prefix: taskUnit.prefix,
      suffix: taskUnit.suffix,
      type: taskUnit.type,
      key: taskUnit.key
    };
  });
}

async function syncGoalsWithTask(task, { dryRun = true } = {}) {
  const goals = await Goal.find({ 'tasks.task_id': task._id });

  for (const goal of goals) {
    let changed = false;

    for (let i = 0; i < goal.tasks.length; i++) {
      const goalTask = goal.tasks[i];
      if (String(goalTask.task_id) !== String(task._id)) continue;

      const originalUnits = goalTask.units || [];
      const mergedUnits = mergeUnits(task.properties?.grouping?.units || [], originalUnits);

      if (!deepEqual(originalUnits, mergedUnits)) {
        if (dryRun) {
          console.log(`Goal "${goal.header}" task ${goalTask.task_id} units will change:`);
          console.log('Before:', JSON.stringify(originalUnits, null, 2));
          console.log('After: ', JSON.stringify(mergedUnits, null, 2));
        } else {
          goal.tasks[i].units = mergedUnits;
          changed = true;
        }
      }
    }

    if (!dryRun && changed) {
      await goal.save();
      console.log(`Updated goal: ${goal.header}`);
    }
  }
}

module.exports = {
  syncGoalsWithTask
};
