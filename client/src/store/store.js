import { configureStore } from "@reduxjs/toolkit";
import messageReducer from "./messageSlice";
import tasksReducer from "./tasksSlice";
import dayPlansReducer from "./dayPlanSlice";
import goalReducer from "./goalSlice";
import goalProgressReducer from "./goalProgressSlice";

const store = configureStore({
  reducer: {
    message: messageReducer,
    tasks: tasksReducer,
    dayplans: dayPlansReducer,
    goals: goalReducer,
    goalProgress: goalProgressReducer,
  },
});

export default store;