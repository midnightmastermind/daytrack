import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import goalProgressService from "../services/goalProgressService";
import {
  buildCompoundKey,
  splitCompoundKey,
  calculateUnitProgress
} from "../helpers/goalUtils";

export const fetchGoalProgress = createAsyncThunk("goalProgress/fetch", async () => {
  const res = await goalProgressService.getGoalProgress();
  return res.data;
});

export const createGoalProgress = createAsyncThunk("goalProgress/create", async (data) => {
  const res = await goalProgressService.createGoalProgress(data);
  console.log("✅ Created GoalProgress:", data);
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

const initialState = {
  progressRecords: [],
  pendingProgressUpdates: {},
  loading: false,
  error: null,
};

const goalProgressSlice = createSlice({
  name: "goalProgress",
  initialState,
  reducers: {
    addPendingProgress: (state, action) => {
      const {
        goalId,
        date,
        taskId,
        count,
        flow = "in",
        goalFlowDir = "any",
        reverseFlow = false,
        hasTarget = true,
        useInput = true,
        starting = 0
      } = action.payload;

      const key = `${goalId}_${date.slice(0, 10)}`;

      const shouldApply = goalFlowDir === "any" || flow === goalFlowDir;
      if (!shouldApply) return;

      if (!state.pendingProgressUpdates[key]) {
        state.pendingProgressUpdates[key] = {};
      }

      const adjustedCount = calculateUnitProgress({
        count: count || 0,
        value: count || 0,
        useInput,
        inputFlow: flow,
        goalFlow: goalFlowDir,
        reverseFlow,
        hasTarget,
        starting
      });

      state.pendingProgressUpdates[key][taskId] = adjustedCount;
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
        const meta = action.meta?.arg || {};
      
        const goalIdStr = updated.goal_id?.toString?.() || updated.goalId || meta.goalId || "";
        const taskId =
          updated.taskId ||
          updated.task_id ||
          (updated.task_id && updated.unit
            ? buildCompoundKey(updated.task_id, updated.unit)
            : undefined);
      
        const [rawTaskId, unit] = splitCompoundKey(taskId);
        const dateKey = new Date(updated.date || meta.date).toISOString().slice(0, 10);
      
        if (!goalIdStr || !taskId) {
          console.warn("⚠️ Skipping progress update due to missing goalId or taskId", { updated, meta });
          return;
        }
      
        const inputFlow = updated.inputFlow || meta.flow || "in";
        const goalFlowDir = updated.goalFlowDir || meta.goalFlowDir || "any";
      
        const shouldApply = goalFlowDir === "any" || inputFlow === goalFlowDir;
        if (!shouldApply) {
          console.log("⚠️ Skipping due to flow mismatch", { goalFlowDir, inputFlow });
          return;
        }
      
        const adjustedCount = calculateUnitProgress({
          count: updated.count || 0,
          value: updated.count || 0,
          useInput: updated.useInput ?? true,
          inputFlow,
          goalFlow: goalFlowDir,
          reverseFlow: updated.reverseFlow || false,
          hasTarget: updated.hasTarget ?? true,
          starting: updated.starting || 0,
        });
      
        const idx = state.progressRecords.findIndex(
          (r) =>
            r.goal_id?.toString?.() === goalIdStr &&
            new Date(r.date).toISOString().slice(0, 10) === dateKey
        );
      
        if (idx !== -1) {
          // Correct merge
          state.progressRecords[idx].progress = {
            ...(state.progressRecords[idx].progress || {}),
            [taskId]: adjustedCount,
          };
        } else {
          state.progressRecords.push({
            goal_id: goalIdStr,
            date: dateKey,
            progress: { [taskId]: adjustedCount },
          });
        }
      
        console.log("✅ Goal progress updated:", {
          goalId: goalIdStr,
          taskId,
          dateKey,
          adjustedCount,
        });
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

export const { addPendingProgress, clearPendingProgress } = goalProgressSlice.actions;
export default goalProgressSlice.reducer;
