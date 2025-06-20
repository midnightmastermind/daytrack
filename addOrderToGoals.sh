#!/bin/bash

MONGO_URI='mongodb+srv://josh:pd2235OJ@serverlessinstance0.mrxjbmd.mongodb.net/daytrack?retryWrites=true&w=majority&appName=ServerlessInstance0'

mongosh "$MONGO_URI" <<EOF
use daytrack;

const goals = db.goals.find().toArray();

for (let i = 0; i < goals.length; i++) {
  const goal = goals[i];
  goal.order = i; // ✅ save goal order (grid-based index)

  if (!Array.isArray(goal.tasks)) continue;

  for (let j = 0; j < goal.tasks.length; j++) {
    const task = goal.tasks[j];
    task.order = j; // ✅ save task order

    if (Array.isArray(task.units)) {
      for (let k = 0; k < task.units.length; k++) {
        const unit = task.units[k];
        unit.order = k; // ✅ save unit order

        // Also update unitSettings
        if (task.unitSettings && task.unitSettings[unit.key]) {
          task.unitSettings[unit.key].order = k;
        }
      }
    }
  }

  db.goals.updateOne(
    { _id: goal._id },
    {
      \$set: {
        order: goal.order,
        tasks: goal.tasks
      }
    }
  );

  print("✅ Updated goal: " + goal._id);
}

print("🎉 Done updating all goal, task, and unit orders.");
EOF

