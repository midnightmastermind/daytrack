// migrate.js
require('dotenv').config();
const mongoose = require("mongoose");

// Use your MongoDB URI
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/your_db_name";

// Import the old models
// (Assuming your collections haven't been renamed. If they are using the same collection names, we can use the new model definitions.)
const OldTask = require("./models/Task");       // old Task documents have "columns"
const OldDayPlan = require("./models/DayPlan");   // old DayPlan documents

async function migrateTasks() {
  try {
    const tasks = await OldTask.find({});
    console.log(`Found ${tasks.length} tasks for migration.`);
    
    for (const task of tasks) {
      // Only migrate if the document has the old "columns" field
      if (task.columns && Array.isArray(task.columns)) {
        console.log(`Migrating task: ${task.name}`);
        
        // Create a new children array by converting each column into a category node
        const newChildren = task.columns.map((col) => {
          // Map each subtask (from the old "subtasks" array) to a new child task object.
          const childrenTasks = (col.subtasks || []).map((st) => ({
            name: st.name,
            type: "task",          // New tasks are marked as "task"
            value: st.value,       // Preserve the old value
            oldType: st.type       // Optionally store the old type for debugging/reference
          }));
          return {
            name: col.name,
            type: "category",       // Mark this node as a category
            children: childrenTasks // The mapped child tasks
          };
        });
        
        // Set the new "children" field on the task
        task.children = newChildren;
        // Remove the old "columns" field
        task.columns = undefined;
        task.updatedAt = new Date();
        
        console.log(`Task "${task.name}" migrated. New children:`, newChildren);
        await task.save();
      } else {
        console.log(`Task "${task.name}" does not have "columns". Skipping migration.`);
      }
    }
  } catch (error) {
    console.error("Error migrating tasks:", error);
  }
}

async function migrateDayPlans() {
  try {
    const dayPlans = await OldDayPlan.find({});
    console.log(`Found ${dayPlans.length} day plans for migration.`);
    
    for (const dp of dayPlans) {
      // If "result" is missing or empty, set it equal to "plan"
      if (!dp.result || dp.result.length === 0) {
        console.log(`Migrating DayPlan for date: ${dp.date}`);
        dp.result = dp.plan;
        dp.updatedAt = new Date();
        await dp.save();
        console.log(`DayPlan for date ${dp.date} updated.`);
      } else {
        console.log(`DayPlan for date ${dp.date} already has a "result" field. Skipping.`);
      }
    }
  } catch (error) {
    console.error("Error migrating day plans:", error);
  }
}

async function runMigration() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");
    
    await migrateTasks();
    await migrateDayPlans();
    
    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

runMigration();