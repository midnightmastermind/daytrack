import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import goalProgressService from '../services/goalProgressService';

export const fetchGoalProgress = createAsyncThunk('goalProgress/fetchGoalProgress', async () => {
  const response = await goalProgressService.getGoalProgress();
  return response.data;
});

export const createGoalProgress = createAsyncThunk('goalProgress/createGoalProgress', async (data) => {
  const response = await goalProgressService.createGoalProgress(data);
  return response.data;
});

export const updateGoalProgress = createAsyncThunk('goalProgress/updateGoalProgress', async ({ id, data }) => {
  const response = await goalProgressService.updateGoalProgress(id, data);
  return response.data;
});

export const deleteGoalProgress = createAsyncThunk('goalProgress/deleteGoalProgress', async (id) => {
  await goalProgressService.deleteGoalProgress(id);
  return id;
});

const goalProgressSlice = createSlice({
  name: 'goalProgress',
  initialState: {
    progressRecords: [],
    loading: false,
    error: null,
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
        state.progressRecords.push(action.payload);
      })
      .addCase(updateGoalProgress.fulfilled, (state, action) => {
        const index = state.progressRecords.findIndex(record => record._id === action.payload._id);
        if (index !== -1) {
          state.progressRecords[index] = action.payload;
        }
      })
      .addCase(deleteGoalProgress.fulfilled, (state, action) => {
        state.progressRecords = state.progressRecords.filter(record => record._id !== action.payload);
      });
  }
});

export default goalProgressSlice.reducer;
