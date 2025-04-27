import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import goalService from "../services/goalService";

// === Thunks ===
export const fetchGoals = createAsyncThunk("goals/fetch", async () => {
  const res = await goalService.getGoals();
  return res.data;
});

export const createGoal = createAsyncThunk("goals/create", async (goalData) => {
  console.log("🚀 createGoal thunk called with:", goalData);
  const res = await goalService.createGoal(goalData);
  console.log("✅ createGoal API response:", res.data);
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
      state.goals.push(action.payload);
    },
    updateGoalOptimistic: (state, action) => {
      const { id, updates } = action.payload;
      const idx = state.goals.findIndex((g) => g._id === id || g.tempId === id);
      if (idx !== -1) {
        state.goals[idx] = {
          ...state.goals[idx],
          ...updates,
        };
      }
    },
    deleteGoalOptimistic: (state, action) => {
      const id = action.payload;
      state.goals = state.goals.filter((g) => g._id !== id && g.tempId !== id);
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
        state.goals = action.payload;
      })
      .addCase(fetchGoals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(createGoal.fulfilled, (state, action) => {
        const serverGoal = action.payload;
        const tempId = serverGoal.tempId;
      
        console.log("📥 createGoal.fulfilled", serverGoal);
      
        const idx = state.goals.findIndex((g) => g.tempId === tempId);
        if (idx !== -1) {
          console.log("🔁 Merging serverGoal into optimistic goal at idx:", idx);
          state.goals[idx] = { ...state.goals[idx], ...serverGoal };
        } else {
          console.log("➕ Pushing new serverGoal (not found by tempId)");
          state.goals.push(serverGoal);
        }
      })

      .addCase(updateGoal.fulfilled, (state, action) => {
        const updatedGoal = action.payload;
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
      });
  },
});

export const {
  addGoalOptimistic,
  updateGoalOptimistic,
  deleteGoalOptimistic,
} = goalSlice.actions;

export default goalSlice.reducer;
