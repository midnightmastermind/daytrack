import { createSelector } from 'reselect';

const selectTaskState = (state) => state.tasks;

export const selectAllTasks = createSelector(
  [selectTaskState],
  (taskState) => taskState.tasks
);
