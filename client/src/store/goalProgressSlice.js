// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import goalProgressService from "../services/goalProgressService";
// import {
//   buildCompoundKey,
//   splitCompoundKey,
//   calculateUnitProgress
// } from "../helpers/goalUtils";

// export const fetchGoalProgress = createAsyncThunk("goalProgress/fetch", async () => {
//   const res = await goalProgressService.getGoalProgress();
//   return res.data;
// });

// export const createGoalProgress = createAsyncThunk("goalProgress/create", async (data) => {
//   const res = await goalProgressService.createGoalProgress(data);
//   console.log("✅ Created GoalProgress:", data);
//   return res.data;
// });

// export const updateGoalProgress = createAsyncThunk("goalProgress/update", async ({ id, updates }) => {
//   const res = await goalProgressService.updateGoalProgress(id, updates);
//   return res.data;
// });

// export const deleteGoalProgress = createAsyncThunk("goalProgress/delete", async ({ id, taskId }) => {
//   const res = await goalProgressService.deleteGoalProgress(id, taskId);
//   return { id, taskId, updated: res.data };
// });

// const initialState = {
//   progressRecords: [],
//   pendingProgressUpdates: {},
//   loading: false,
//   error: null,
// };

// const goalProgressSlice = createSlice({
//   name: "goalProgress",
//   initialState,
//   reducers: {
//     addPendingProgress: (state, action) => {
//       const {
//         goalId,
//         date,
//         taskId,
//         value
//       } = action.payload;
//       console.log("====addPendingProgress====");
//       const key = `${goalId}_${date.slice(0, 10)}`;
//       // const shouldApply = goalFlow === "any" || flow === goalFlow;
//       // if (!shouldApply) return;

//       if (!state.pendingProgressUpdates[key]) {
//         state.pendingProgressUpdates[key] = {};
//       }
//       // console.log("progress payload: ", action.payload);
//       // const adjustedCount = calculateUnitProgress({
//       //   count: count || 0,
//       //   value: count || 0,
//       //   useInput,
//       //   inputFlow: inputFlow,
//       //   goalFlow: goalFlow,
//       //   reverseFlow,
//       //   hasTarget,
//       //   starting
//       // });
//       // console.log("adjustedCount: ", action.payload);
//       state.pendingProgressUpdates[key][taskId] = value;
//     },

//     clearPendingProgress: (state, action) => {
//       const { goalId, date } = action.payload;
//       const key = `${goalId}_${date.slice(0, 10)}`;
//       delete state.pendingProgressUpdates[key];
//     },
//   },

//   extraReducers: (builder) => {
//     builder
//       .addCase(fetchGoalProgress.pending, (state) => {
//         state.loading = true;
//         state.error = null;
//       })
//       .addCase(fetchGoalProgress.fulfilled, (state, action) => {
//         state.loading = false;
//         state.progressRecords = action.payload;
//       })
//       .addCase(fetchGoalProgress.rejected, (state, action) => {
//         state.loading = false;
//         state.error = action.error.message;
//       })
//       .addCase(createGoalProgress.fulfilled, (state, action) => {
//         const updated = action.payload;
//         const meta = action.meta?.arg || {};
      
//         const {
//           goalId,
//           taskId,
//           date,
//           value
//         } = updated;
//         // const goalIdStr = updated.goal_id?.toString?.() || updated.goalId || meta.goalId || "";
//         // const taskId =
//         //   updated.taskId ||
//         //   updated.task_id ||
//         //   (updated.task_id && updated.unit
//         //     ? buildCompoundKey(updated.task_id, updated.unit)
//         //     : undefined);
      
//         // const [rawTaskId, unit] = splitCompoundKey(taskId);
//         const dateKey = new Date(updated.date || meta.date).toISOString().slice(0, 10);
      
//         if (!goalId || !taskId) {
//           console.warn("⚠️ Skipping progress update due to missing goalId or taskId", { updated, meta });
//           return;
//         }
      
//         // const inputFlow = updated.inputFlow || meta.flow || "in";
//         // const goalFlow = updated.goalFlow || meta.goalFlow || "any";
      
//         // const shouldApply = goalFlow === "any" || inputFlow === goalFlow;
//         // if (!shouldApply) {
//         //   console.log("⚠️ Skipping due to flow mismatch", { goalFlow, inputFlow });
//         //   return;
//         // }
      
//         // const adjustedCount = calculateUnitProgress({
//         //   count: updated.count || 0,
//         //   value: updated.count || 0,
//         //   useInput: updated.useInput ?? true,
//         //   inputFlow,
//         //   goalFlow: goalFlow,
//         //   reverseFlow: updated.reverseFlow || false,
//         //   hasTarget: updated.hasTarget ?? true,
//         //   starting: updated.starting || 0,
//         // });
      
//         const idx = state.progressRecords.findIndex(
//           (r) =>
//             r.goal_id?.toString?.() === goalId &&
//             new Date(r.date).toISOString().slice(0, 10) === dateKey
//         );
      
//         if (idx !== -1) {
//           // Correct merge
//           state.progressRecords[idx].progress = {
//             ...(state.progressRecords[idx].progress || {}),
//             [taskId]: value,
//           };
//         } else {
//           state.progressRecords.push({
//             goal_id: goalId,
//             date: dateKey,
//             progress: { [taskId]: value },
//           });
//         }
      
//         console.log("✅ Goal progress updated:", {
//           goalId: goalId,
//           taskId,
//           dateKey,
//           value,
//         });
//       })      
//       .addCase(updateGoalProgress.fulfilled, (state, action) => {
//         const updated = action.payload;
//         const idx = state.progressRecords.findIndex((r) => r._id === updated._id);
//         if (idx !== -1) {
//           state.progressRecords[idx] = updated;
//         }
//       })
//       .addCase(deleteGoalProgress.fulfilled, (state, action) => {
//         const { id, taskId } = action.payload;
//         const record = state.progressRecords.find((r) => r._id === id);
//         if (record && taskId) {
//           delete record.progress?.[taskId];
//         }
//       });
//   },
// });

// export const { addPendingProgress, clearPendingProgress } = goalProgressSlice.actions;
// export default goalProgressSlice.reducer;


import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import goalProgressService from "../services/goalProgressService";

export const fetchGoalProgress = createAsyncThunk(
  "goalProgress/fetchAll",
  async () => {
    const response = await goalProgressService.getAllGoalProgress();
    return response.data; // ✅ use .data
  }
);

export const createGoalProgress = createAsyncThunk(
  "goalProgress/create",
  async (progressData) => {
    const response = await goalProgressService.createGoalProgress(progressData);
    return response.data; // ✅ use .data
  }
);

export const updateGoalProgress = createAsyncThunk(
  "goalProgress/update",
  async ({ id, progressData }) => {
    const response = await goalProgressService.updateGoalProgress(id, progressData);
    return response.data; // ✅ use .data
  }
);

export const deleteGoalProgress = createAsyncThunk(
  "goalProgress/delete",
  async ({ id }) => {
    console.log("hit", id);
    await goalProgressService.removeGoalProgress(id);
    return { id, taskId }; // ✅ return both so reducer can unset correct key
  }
);
const goalProgressSlice = createSlice({
  name: "goalProgress",
  initialState: {
    goalprogress: [], // [{ goalId, taskId, progressKey, date, value, _id }]
    status: "idle",
    error: null,
  },
  reducers: {
    addPendingProgress: (state, action) => {
      const { goalId, taskId, date, progressKey = null, value } = action.payload;
      const existing = state.goalprogress.find(
        (p) =>
          p.goalId === goalId &&
          p.taskId === taskId &&
          p.progressKey === progressKey &&
          new Date(p.date).toISOString() === new Date(date).toISOString()
      );
      if (existing) {
        existing.value = value;
      } else {
        state.goalprogress.push({ goalId, taskId, date, progressKey, value });
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGoalProgress.fulfilled, (state, action) => {
        state.goalprogress = action.payload || [];
        state.status = "succeeded";
      })
      .addCase(createGoalProgress.fulfilled, (state, action) => {
        const updated = action.payload;
        const index = state.goalprogress.findIndex(
          (p) =>
            p.goalId === updated.goalId &&
            p.taskId === updated.taskId &&
            p.progressKey === updated.progressKey &&
            new Date(p.date).toISOString() === new Date(updated.date).toISOString()
        );
        if (index !== -1) {
          state.goalprogress[index] = updated;
        } else {
          state.goalprogress.push(updated);
        }
      })
      .addCase(updateGoalProgress.fulfilled, (state, action) => {
        const updated = action.payload;
        const index = state.goalprogress.findIndex((p) => p._id === updated._id);
        if (index !== -1) {
          state.goalprogress[index] = updated;
        }
      })
      .addCase(deleteGoalProgress.fulfilled, (state, action) => {
        const id = action.payload;
        state.goalprogress = state.goalprogress.filter((p) => p._id !== id);
      });
  },
});

export const { addPendingProgress } = goalProgressSlice.actions;
export default goalProgressSlice.reducer;
