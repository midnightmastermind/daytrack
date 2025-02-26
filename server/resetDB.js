// seed.js
const mongoose = require("mongoose");
const Task = require("./models/Task"); // Adjust the path as needed
require("dotenv").config();

const taskStructure = [
  {
    name: "check-in with me",
    category: null,
    columns: [
      {
        name: "subtasks",
        subtasks: [
          { name: "meds", type: "bool", value: false },
          { name: "water", type: "bool", value: false },
          { name: "eat", type: "bool", value: false },
          { name: "todo", type: "bool", value: false }
        ]
      }
    ]
  },
  {
    name: "check-in with others",
    category: null,
    columns: [
      {
        name: "subtasks",
        subtasks: [
          { name: "messages", type: "bool", value: false },
          { name: "feed cats", type: "bool", value: false },
          { name: "pet cats", type: "bool", value: false },
          { name: "mom", type: "bool", value: false }
        ]
      }
    ]
  },
  {
    name: "clean-up",
    category: null,
    columns: [
      {
        name: "physical",
        subtasks: [
          { name: "laundry", type: "bool", value: false },
          { name: "trash", type: "bool", value: false },
          { name: "dishes", type: "bool", value: false },
          { name: "items", type: "bool", value: false }
        ]
      },
      {
        name: "virtual",
        subtasks: [
          { name: "images", type: "bool", value: false },
          { name: "documents", type: "bool", value: false },
          { name: "videos", type: "bool", value: false },
          { name: "code", type: "bool", value: false },
          { name: "bookmarks", type: "bool", value: false }
        ]
      },
      {
        name: "work-area",
        subtasks: [
          { name: "surrounding", type: "bool", value: false },
          { name: "session", type: "bool", value: false },
          { name: "notes", type: "bool", value: false }
        ]
      }
    ]
  },
  {
    name: "work",
    category: null,
    columns: [
      {
        name: "options",
        subtasks: [
          { name: "action", type: "text", value: "" }
        ]
      }
    ]
  },
  {
    name: "play",
    category: null,
    columns: [
      {
        name: "options",
        subtasks: [
          { name: "action", type: "text", value: "" }
        ]
      }
    ]
  },
  {
    name: "finance",
    category: null,
    columns: null
  },
  {
    name: "nutrition",
    category: null,
    columns: null
  },
  {
    name: "fitness",
    category: null,
    columns: null
  },
  {
    name: "bath-time",
    category: null,
    columns: null
  },
  {
    name: "meditate",
    category: null,
    columns: [
      {
        name: "actions",
        subtasks: [
          { name: "plan", type: "bool", value: false },
          { name: "reflect", type: "bool", value: false },
          { name: "create", type: "bool", value: false }
        ]
      }
    ]
  }
];

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/taskdb";

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB connected");
    // Clear existing tasks if needed
    return Task.deleteMany({});
  })
  .then(() => {
    console.log("Existing tasks cleared");
    // Insert the new task structure
    return Task.insertMany(taskStructure);
  })
  .then((insertedTasks) => {
    console.log(`${insertedTasks.length} tasks inserted.`);
    mongoose.disconnect();
  })
  .catch((error) => {
    console.error("Error seeding data:", error);
    mongoose.disconnect();
  });
