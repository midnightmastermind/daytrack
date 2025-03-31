import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import goalService from '../services/goalService';

export const fetchGoals = createAsyncThunk('goals/fetchGoals', async () => {
  const response = await goalService.getGoals();
  return response.data;
});

export const createGoal = createAsyncThunk('goals/createGoal', async (goalData) => {
  const response = await goalService.createGoal(goalData);
  return response.data;
});

export const updateGoal = createAsyncThunk('goals/updateGoal', async ({ id, goalData }) => {
  const response = await goalService.updateGoal(id, goalData);
  return response.data;
});

export const deleteGoal = createAsyncThunk('goals/deleteGoal', async (id) => {
  await goalService.deleteGoal(id);
  return id;
});

const goalSlice = createSlice({
  name: 'goals',
  initialState: {
    goals: [],
    loading: false,
    error: null,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGoals.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchGoals.fulfilled, (state, action) => {
        state.loading = false;
        state.goals = action.payload;
      })
      .addCase(fetchGoals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createGoal.fulfilled, (state, action) => {
        state.goals.push(action.payload);
      })
      .addCase(updateGoal.fulfilled, (state, action) => {
        const index = state.goals.findIndex(goal => goal._id === action.payload._id);
        if (index !== -1) {
          state.goals[index] = action.payload;
        }
      })
      .addCase(deleteGoal.fulfilled, (state, action) => {
        state.goals = state.goals.filter(goal => goal._id !== action.payload);
      });
  }
});

export default goalSlice.reducer;
