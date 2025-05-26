const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://josh:pd2235OJ@serverlessinstance0.mrxjbmd.mongodb.net/daytrack?retryWrites=true&w=majority&appName=ServerlessInstance0";
const client = new MongoClient(uri);

const defaultSettings = {
  flow: "any",
  reverseFlow: false,
  useInput: true,
  hasTarget: true,
  operator: "=",
  target: 0,
  starting: 0,
  timeScale: "daily"
};

function completeUnitSettings(existing = {}) {
  return {
    enabled: existing.enabled ?? true,
    flow: existing.flow ?? defaultSettings.flow,
    reverseFlow: existing.reverseFlow ?? defaultSettings.reverseFlow,
    useInput: existing.useInput ?? defaultSettings.useInput,
    hasTarget: existing.hasTarget ?? defaultSettings.hasTarget,
    operator: existing.operator ?? defaultSettings.operator,
    target: existing.target ?? defaultSettings.target,
    starting: existing.starting ?? defaultSettings.starting,
    timeScale: existing.timeScale ?? defaultSettings.timeScale
  };
}

async function migrate() {
  try {
    await client.connect();
    const db = client.db("daytrack");
    const goals = db.collection("goals");

    const cursor = goals.find({ "tasks.grouping": true });
    let updatedCount = 0;

    while (await cursor.hasNext()) {
      const goal = await cursor.next();
      let modified = false;

      for (const task of goal.tasks) {
        if (!task.grouping || !Array.isArray(task.units)) continue;

        task.unitSettings = task.unitSettings || {};

        for (const unit of task.units) {
          if (unit.type === "text") continue;

          const key = unit.key;
          const existing = task.unitSettings[key] || {};
          const complete = completeUnitSettings(existing);

          if (JSON.stringify(existing) !== JSON.stringify(complete)) {
            task.unitSettings[key] = complete;
            modified = true;
          }
        }
      }

      if (modified) {
        await goals.updateOne(
          { _id: goal._id },
          { $set: { tasks: goal.tasks, updatedAt: new Date() } }
        );
        console.log(`✅ Updated goal: ${goal._id}`);
        updatedCount++;
      }
    }

    console.log(`\nMigration complete. Updated ${updatedCount} goals.`);
  } catch (err) {
    console.error("❌ Migration error:", err);
  } finally {
    await client.close();
  }
}

migrate();
