import { configureStore } from "@reduxjs/toolkit";
import messageReducer from "./messageSlice";
import tasksReducer from "./tasksSlice";
import dayPlansReducer from "./dayPlanSlice";

const store = configureStore({
  reducer: {
    message: messageReducer,
    tasks: tasksReducer,
    dayplans: dayPlansReducer
  },
});

export default store;