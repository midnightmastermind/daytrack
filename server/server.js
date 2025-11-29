const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const cors = require("cors");
const tasksRoutes = require('./routes/tasks');
const dayplansRoutes = require('./routes/dayplans'); // updated routes
const goalRoutes = require('./routes/goals');
const goalProgressRoutes = require('./routes/goalprogress');
const counterRoutes = require('./routes/counters');

const app = express();
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

app.get("/", (req, res) => {
  res.json({ message: "Server is running..." });
});

/* User Routes */
const User = require("./models/User");

// Get all users
app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a user
app.post("/users", async (req, res) => {
  try {
    const newUser = new User(req.body);
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/api/tasks', tasksRoutes);
app.use('/api/dayplans', dayplansRoutes); // register day plan routes
app.use('/api/goals', goalRoutes);
app.use('/api/counters', counterRoutes);
app.use('/api/goalprogress', goalProgressRoutes);

app.listen(5000, () => console.log("Server started on port 5000"));