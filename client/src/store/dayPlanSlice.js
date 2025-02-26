import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import dayPlanService from '../services/dayPlanService';

export const fetchAllDayPlans = createAsyncThunk('dayplans/fetchAllDayPlans', async () => {
  const response = await dayPlanService.getAllDayPlans();
  return response.data;
});

export const createDayPlan = createAsyncThunk('dayplans/createDayPlan', async (dayPlanData) => {
  const response = await dayPlanService.createDayPlan(dayPlanData);
  return response.data;
});

export const updateDayPlan = createAsyncThunk('dayplans/updateDayPlan', async ({ id, dayPlanData }) => {
  const response = await dayPlanService.updateDayPlan(id, dayPlanData);
  return response.data;
});

const dayPlanSlice = createSlice({
  name: 'dayplans',
  initialState: {
    dayplans: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllDayPlans.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAllDayPlans.fulfilled, (state, action) => {
        state.loading = false;
        state.dayplans = action.payload;
      })
      .addCase(fetchAllDayPlans.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createDayPlan.fulfilled, (state, action) => {
        state.dayplans.push(action.payload);
      })
      .addCase(updateDayPlan.fulfilled, (state, action) => {
        const index = state.dayplans.findIndex(plan => plan._id === action.payload._id);
        if (index !== -1) {
          state.dayplans[index] = action.payload;
        }
      });
  }
});

export default dayPlanSlice.reducer;
