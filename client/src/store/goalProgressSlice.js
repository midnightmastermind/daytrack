// store/goalProgressSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import goalProgressService from "../services/goalProgressService";

// === Async Thunks ===
export const fetchGoalProgress = createAsyncThunk("goalProgress/fetch", async () => {
  const res = await goalProgressService.getGoalProgress();
  return res.data;
});

export const createGoalProgress = createAsyncThunk("goalProgress/create", async (data) => {
  const res = await goalProgressService.createGoalProgress(data);
  return res.data;
});

export const updateGoalProgress = createAsyncThunk("goalProgress/update", async ({ id, updates }) => {
  const res = await goalProgressService.updateGoalProgress(id, updates);
  return res.data;
});

export const deleteGoalProgress = createAsyncThunk("goalProgress/delete", async (id) => {
  await goalProgressService.deleteGoalProgress(id);
  return id;
});

// === Initial State ===
const initialState = {
  progressRecords: [],
  pendingProgressUpdates: {}, // keyed by `${goalId}_${date}`
  loading: false,
  error: null,
};

// === Slice ===
const goalProgressSlice = createSlice({
  name: "goalProgress",
  initialState,
  reducers: {
    addPendingProgress: (state, action) => {
      const { goalId, date, taskId, count } = action.payload;
      const key = `${goalId}_${date.slice(0, 10)}`;
    
      if (!state.pendingProgressUpdates[key]) {
        state.pendingProgressUpdates[key] = {};
      }
    
      // const prevCount = state.pendingProgressUpdates[key][taskId] || 0;
      state.pendingProgressUpdates[key][taskId] = count;
    },
    clearPendingProgress: (state, action) => {
      const { goalId, date } = action.payload;
      const key = `${goalId}_${date.slice(0, 10)}`;
      delete state.pendingProgressUpdates[key];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGoalProgress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGoalProgress.fulfilled, (state, action) => {
        state.loading = false;
        state.progressRecords = action.payload;
      })
      .addCase(fetchGoalProgress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(createGoalProgress.fulfilled, (state, action) => {
        const updated = action.payload;
        const goalIdStr = updated.goal_id?.toString?.();
        const dateKey = new Date(updated.date).toISOString().slice(0, 10);

        const idx = state.progressRecords.findIndex(
          (r) =>
            r.goal_id?.toString?.() === goalIdStr &&
            new Date(r.date).toISOString().slice(0, 10) === dateKey
        );

        if (idx !== -1) {
          state.progressRecords[idx] = updated;
        } else {
          state.progressRecords.push(updated);
        }
      })

      .addCase(updateGoalProgress.fulfilled, (state, action) => {
        const updated = action.payload;
        const idx = state.progressRecords.findIndex((r) => r._id === updated._id);
        if (idx !== -1) {
          state.progressRecords[idx] = updated;
        }
      })

      .addCase(deleteGoalProgress.fulfilled, (state, action) => {
        const id = action.payload;
        state.progressRecords = state.progressRecords.filter((r) => r._id !== id);
      });
  },
});

// === Exports ===
export const { addPendingProgress, clearPendingProgress } = goalProgressSlice.actions;
export default goalProgressSlice.reducer;
