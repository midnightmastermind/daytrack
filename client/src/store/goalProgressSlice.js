import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import goalProgressService from '../services/goalProgressService';

export const fetchGoalProgress = createAsyncThunk('goalProgress/fetchGoalProgress', async () => {
  const response = await goalProgressService.getGoalProgress();
  return response.data;
});

export const createGoalProgress = createAsyncThunk('goalProgress/createGoalProgress', async (data, { dispatch }) => {
  const { goalId, date, taskId, increment, tempId } = data;

  const progressDoc = await goalProgressService.createGoalProgress({
    goalId: goalId,
    date,
    increment,
    taskId,
  });

  dispatch(clearPendingProgress({ goalId, date, taskId, diff: increment }));

  // If this was a temp goal, sync it by replacing tempId
  if (tempId) {
    dispatch(syncTempGoalId({ tempId, realId: progressDoc.data.goal_id }));
  }

  return progressDoc.data;
});

const goalProgressSlice = createSlice({
  name: 'goalProgress',
  initialState: {
    progressRecords: [],
    pendingProgressUpdates: {},
    loading: false,
    error: null,
  },
  reducers: {
    addPendingProgress: (state, action) => {
      const { goalId, date, taskId, diff } = action.payload;
      const dateStr = new Date(date).toISOString().slice(0, 10);
    
      console.log("🧩 ADD PENDING PROGRESS", { goalId, dateStr, taskId, diff });
    
      let record = state.progressRecords.find(
        (r) =>
          (r.goal_id?.toString?.() === goalId || r.tempId === goalId) &&
          new Date(r.date).toISOString().slice(0, 10) === dateStr
      );
    
      if (!record) {
        console.log("🆕 No existing record found, creating temporary");
        record = {
          goal_id: goalId,
          date,
          progress: {},
        };
        state.progressRecords.push(record);
      }
    
      const taskKey = taskId.toString();
      record.progress[taskKey] = (record.progress[taskKey] || 0) + diff;
      console.log("✅ Updated local progress:", record.progress);
    },    
    clearPendingProgress: (state, action) => {
      const { goalId, date, taskId, diff } = action.payload;
      const key = `${goalId}_${new Date(date).toISOString().slice(0, 10)}`;
      if (state.pendingProgressUpdates[key]?.[taskId]) {
        state.pendingProgressUpdates[key][taskId] -= diff;
        if (state.pendingProgressUpdates[key][taskId] === 0) {
          delete state.pendingProgressUpdates[key][taskId];
        }
        if (Object.keys(state.pendingProgressUpdates[key]).length === 0) {
          delete state.pendingProgressUpdates[key];
        }
      }
    },

    syncTempGoalId: (state, action) => {
      const { tempId, realId } = action.payload;
      for (const record of state.progressRecords) {
        if (record.tempId === tempId) {
          record.goal_id = realId;
          delete record.tempId;
          console.log(`🔁 Synced tempId "${tempId}" → "${realId}" in progressRecords`);
        }
      }
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchGoalProgress.pending, (state) => {
        state.loading = true;
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
        const index = state.progressRecords.findIndex(r => r._id === updated._id);
        if (index !== -1) {
          state.progressRecords[index] = updated;
        } else {
          state.progressRecords.push(updated);
        }
      });
  }
});

export const {
  addPendingProgress,
  clearPendingProgress,
  syncTempGoalId,
} = goalProgressSlice.actions;

export default goalProgressSlice.reducer;
