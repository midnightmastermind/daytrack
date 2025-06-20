import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import goalService from "../services/goalService";
import { enrichGoalWithProgress } from "../helpers/goalUtils";

// === Thunks ===
export const fetchGoals = createAsyncThunk("goals/fetch", async () => {
  const res = await goalService.getGoals();
  return res.data;
});

export const createGoal = createAsyncThunk("goals/create", async (goalData) => {
  const res = await goalService.createGoal(goalData);
  return { ...res.data, tempId: goalData.tempId };
});

export const updateGoal = createAsyncThunk("goals/update", async ({ id, goalData }) => {
  const res = await goalService.updateGoal(id, goalData);
  return res.data;
});

export const deleteGoal = createAsyncThunk("goals/delete", async (id) => {
  await goalService.deleteGoal(id);
  return id;
});

export const reorderGoalsOptimistic = (goals) => ({
  type: "goals/reorderGoalsOptimistic",
  payload: goals,
});


export const bulkReorderGoals = createAsyncThunk("goals/bulkReorder", async (goals) => {
  const response = await goalService.bulkReorderGoals(goals);
  return response.data;
});


// === Slice ===
const goalSlice = createSlice({
  name: "goals",
  initialState: {
    goals: [],
    loading: false,
    error: null,
  },
  reducers: {
    addGoalOptimistic: (state, action) => {
      const enriched = enrichGoalWithProgress(action.payload);
      state.goals.push(enriched);
    },
    updateGoalOptimistic: (state, action) => {
      const { id, updates } = action.payload;
      const index = state.goals.findIndex(g => g._id === id || g.tempId === id);
      if (index !== -1) {
        const merged = { ...state.goals[index], ...updates };
        state.goals[index] = enrichGoalWithProgress(merged);
      }
    },
    deleteGoalOptimistic: (state, action) => {
      const id = action.payload;
      state.goals = state.goals.filter((g) => g._id !== id && g.tempId !== id);
    },
    setGoals: (state, action) => {
      state.goals = action.payload.map(enrichGoalWithProgress);
    },
    reorderGoalsOptimistic: (state, action) => {
      state.goals = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGoals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGoals.fulfilled, (state, action) => {
        state.loading = false;
        state.goals = action.payload.map(enrichGoalWithProgress);
      })
      .addCase(fetchGoals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(createGoal.fulfilled, (state, action) => {
        const serverGoal = enrichGoalWithProgress(action.payload);
        const tempId = serverGoal.tempId;

        const idx = state.goals.findIndex((g) => g.tempId === tempId);
        if (idx !== -1) {
          state.goals[idx] = { ...state.goals[idx], ...serverGoal };
        } else {
          state.goals.push(serverGoal);
        }
      })

      .addCase(updateGoal.fulfilled, (state, action) => {
        const updatedGoal = enrichGoalWithProgress(action.payload);
        const idx = state.goals.findIndex((g) => g._id === updatedGoal._id);
        if (idx !== -1) {
          state.goals[idx] = {
            ...state.goals[idx],
            ...updatedGoal,
          };
        }
      })
      .addCase(deleteGoal.fulfilled, (state, action) => {
        const id = action.payload;
        state.goals = state.goals.filter((g) => g._id !== id);
      })
      .addCase(bulkReorderGoals.fulfilled, (state, action) => {
        state.goals = action.payload.map(enrichGoalWithProgress);
      });
  },
});

export const {
  addGoalOptimistic,
  updateGoalOptimistic,
  deleteGoalOptimistic,
  setGoals,
} = goalSlice.actions;

export default goalSlice.reducer;
