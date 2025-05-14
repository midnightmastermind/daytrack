

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import goalProgressService from "../services/goalProgressService";

export const fetchGoalProgress = createAsyncThunk(
  "goalProgress/fetchAll",
  async () => {
    const response = await goalProgressService.getAllGoalProgress();
    return response.data; // ✅ use .data
  }
);

export const createGoalProgress = createAsyncThunk(
  "goalProgress/create",
  async (progressData) => {
    const response = await goalProgressService.createGoalProgress(progressData);
    return response.data; // ✅ use .data
  }
);

export const updateGoalProgress = createAsyncThunk(
  "goalProgress/update",
  async ({ id, progressData }) => {
    const response = await goalProgressService.updateGoalProgress(id, progressData);
    return response.data; // ✅ use .data
  }
);

export const deleteGoalProgress = createAsyncThunk(
  "goalProgress/delete",
  async ({ id }) => {
    console.log("hit", id);
    await goalProgressService.removeGoalProgress(id);
    return { id, taskId }; // ✅ return both so reducer can unset correct key
  }
);
const goalProgressSlice = createSlice({
  name: "goalProgress",
  initialState: {
    goalprogress: [], // [{ goalId, taskId, progressKey, date, value, _id }]
    status: "idle",
    error: null,
  },
  reducers: {
    addPendingProgress: (state, action) => {
      const { goalId, taskId, date, progressKey = null, value } = action.payload;
      const existing = state.goalprogress.find(
        (p) =>
          p.goalId === goalId &&
          p.taskId === taskId &&
          p.progressKey === progressKey &&
          new Date(p.date).toISOString() === new Date(date).toISOString()
      );
      if (existing) {
        existing.value = value;
      } else {
        state.goalprogress.push({ goalId, taskId, date, progressKey, value });
      }
    },
    removePendingProgress: (state, action) => {
      const id = action.payload;
      state.goalprogress = state.goalprogress.filter((p) => p._id !== id);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGoalProgress.fulfilled, (state, action) => {
        state.goalprogress = action.payload || [];
        state.status = "succeeded";
      })
      .addCase(createGoalProgress.fulfilled, (state, action) => {
        const updated = action.payload;
        const index = state.goalprogress.findIndex(
          (p) =>
            p.goalId === updated.goalId &&
            p.taskId === updated.taskId &&
            p.progressKey === updated.progressKey &&
            new Date(p.date).toISOString() === new Date(updated.date).toISOString()
        );
        if (index !== -1) {
          state.goalprogress[index] = updated;
        } else {
          state.goalprogress.push(updated);
        }
      })
      .addCase(updateGoalProgress.fulfilled, (state, action) => {
        const updated = action.payload;
        const index = state.goalprogress.findIndex((p) => p._id === updated._id);
        if (index !== -1) {
          state.goalprogress[index] = updated;
        }
      })
      .addCase(deleteGoalProgress.fulfilled, (state, action) => {
        const id = action.payload;
        state.goalprogress = state.goalprogress.filter((p) => p._id !== id);
      });
  },
});

export const { addPendingProgress, removePendingProgress } = goalProgressSlice.actions;
export default goalProgressSlice.reducer;
