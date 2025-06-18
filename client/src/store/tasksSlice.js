// store/tasksSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import taskService from "../services/tasksService";
import { insertTaskById, replaceTaskByTempId, updateTaskById } from "../helpers/taskUtils";

export const fetchTasks = createAsyncThunk("tasks/fetchTasks", async () => {
  const response = await taskService.getTasks();
  return response.data;
});

export const createTask = createAsyncThunk("tasks/createTask", async (taskData) => {
  const response = await taskService.createTask(taskData);
  return response.data;
});

export const updateTask = createAsyncThunk("tasks/updateTask", async ({ id, updates }) => {
  const response = await taskService.updateTask(id, updates);
  return response.data;
});

export const deleteTask = createAsyncThunk("tasks/deleteTask", async (id) => {
  await taskService.deleteTask(id);
  return id;
});

export const bulkReorderTasks = createAsyncThunk("tasks/bulkReorder", async (tasks) => {
  const response = await taskService.bulkReorderTasks(tasks);
  return response.data;
});

const tasksSlice = createSlice({
  name: "tasks",
  initialState: {
    tasks: [],
    loading: false,
    error: null,
  },
  reducers: {
    addTaskOptimistic: (state, action) => {
      const task = action.payload;
      const parentId = task.parentId;
    
      if (parentId) {
        const updated = insertTaskById(state.tasks, parentId, task);
        state.tasks = updated; // ✅ Use the returned tree
      } else {
        state.tasks.push(task);
      }
    },
    updateTaskOptimistic: (state, action) => {
      const { id, updates } = action.payload;
      updateTaskById(state.tasks, id, updates);
    },
    deleteTaskOptimistic: (state, action) => {
      const id = action.payload;
      state.tasks = state.tasks.filter((t) => t._id !== id && t.tempId !== id);
    },
    reorderTasksOptimistic: (state, action) => {
      for (const updated of action.payload) {
        const idx = state.tasks.findIndex(t => t._id === updated._id);
        if (idx !== -1) {
          state.tasks[idx].properties.order = updated.properties.order;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        const created = action.payload;
        const tempId = action.meta.arg.tempId;
        if (replaceTaskByTempId(state.tasks, tempId, created)) return;
      
        const parentId = action.meta.arg.parentId || created.parentId;
        if (parentId) {
          const inserted = insertTaskById(state.tasks, parentId, created);
          if (!inserted) {
            state.tasks.push(created);
          }
        } else {
          state.tasks.push(created);
        }
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const idx = state.tasks.findIndex((t) => t._id === action.payload._id);
        if (idx !== -1) state.tasks[idx] = action.payload;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter((t) => t._id !== action.payload);
      }).addCase(bulkReorderTasks.pending, (state) => {
        state.loading = true;
      })
      .addCase(bulkReorderTasks.fulfilled, (state, action) => {
        state.loading = false;
        // Optional: ensure the final order is reflected
        for (const updated of action.payload) {
          const idx = state.tasks.findIndex(t => t._id === updated._id);
          if (idx !== -1) {
            state.tasks[idx].properties.order = updated.properties.order;
          }
        }
      })
      .addCase(bulkReorderTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const {
  addTaskOptimistic,
  updateTaskOptimistic,
  deleteTaskOptimistic,
  reorderTasksOptimistic
} = tasksSlice.actions;

export default tasksSlice.reducer;
