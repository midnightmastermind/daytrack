import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import goalProgressService from '../services/goalProgressService';

export const fetchGoalProgress = createAsyncThunk('goalProgress/fetchGoalProgress', async () => {
  const response = await goalProgressService.getGoalProgress();
  return response.data;
});

export const createGoalProgress = createAsyncThunk('goalProgress/createGoalProgress', async (data, { dispatch }) => {
  const { goalId, date, taskId, count, tempId } = data;

  const progressDoc = await goalProgressService.createGoalProgress({
    goalId,
    date,
    count,
    taskId,
  });

  dispatch(clearPendingProgress({ goalId, date }));

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
      const { goalId, date, taskId, count } = action.payload;
      const dateStr = new Date(date).toISOString().slice(0, 10);
      const key = `${goalId}_${dateStr}`;

      if (!state.pendingProgressUpdates[key]) {
        state.pendingProgressUpdates[key] = {};
      }

      state.pendingProgressUpdates[key][taskId] = count;

      // Also update progressRecords optimistically so selector reflects it instantly
      const record = state.progressRecords.find(
        (r) =>
          (r.goal_id?.toString?.() === goalId || r.tempId === goalId) &&
          new Date(r.date).toISOString().slice(0, 10) === dateStr
      );

      if (record) {
        record.progress[taskId] = count;
      } else {
        state.progressRecords.push({
          goal_id: goalId,
          date,
          progress: { [taskId]: count },
        });
      }

      console.log("🧩 SET PENDING PROGRESS + local record:", key, taskId, count);
    },

    clearPendingProgress: (state, action) => {
      const { goalId, date } = action.payload;
      const key = `${goalId}_${new Date(date).toISOString().slice(0, 10)}`;
      delete state.pendingProgressUpdates[key];
      console.log("🧹 Cleared pending progress for", key);
    },

    syncTempGoalId: (state, action) => {
      const { tempId, realId } = action.payload;
      for (const record of state.progressRecords) {
        if (record.tempId === tempId) {
          record.goal_id = realId;
          delete record.tempId;
          console.log(`🔁 Synced tempId "${tempId}" → "${realId}"`);
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
        const index = state.progressRecords.findIndex(r =>
          r.goal_id?.toString?.() === updated.goal_id?.toString?.() &&
          new Date(r.date).toISOString().slice(0, 10) === new Date(updated.date).toISOString().slice(0, 10)
        );
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
