// store/dayPlanSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import dayPlanService from "../services/dayPlanService";

export const fetchAllDayPlans = createAsyncThunk("dayplans/fetchAll", async () => {
  const response = await dayPlanService.getAllDayPlans();
  return response.data;
});

export const createDayPlan = createAsyncThunk("dayplans/createDayPlan", async (dayPlanData) => {
  const response = await dayPlanService.createDayPlan(dayPlanData);
  return response.data;
});

export const updateDayPlan = createAsyncThunk("dayplans/updateDayPlan", async ({ id, dayPlanData }) => {
  const response = await dayPlanService.updateDayPlan(id, dayPlanData);
  return response.data;
});

const dayPlanSlice = createSlice({
  name: "dayplans",
  initialState: { dayplans: [] },
  reducers: {
    setDayPlanOptimistic: (state, action) => {
      const idx = state.dayplans.findIndex((dp) => dp.date === action.payload.date);
      if (idx !== -1) state.dayplans[idx] = action.payload;
      else state.dayplans.push(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllDayPlans.fulfilled, (state, action) => {
        state.dayplans = action.payload;
      })
      .addCase(createDayPlan.fulfilled, (state, action) => {
        const idx = state.dayplans.findIndex((dp) => dp.date === action.payload.date);
        if (idx === -1) state.dayplans.push(action.payload);
        else state.dayplans[idx] = action.payload;
      })
      .addCase(updateDayPlan.fulfilled, (state, action) => {
        const idx = state.dayplans.findIndex((dp) => dp._id === action.payload._id);
        if (idx !== -1) state.dayplans[idx] = action.payload;
      });
  },
});

export const { setDayPlanOptimistic } = dayPlanSlice.actions;
export default dayPlanSlice.reducer;
