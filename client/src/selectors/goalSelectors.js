import { createSelector } from 'reselect';

// Base selectors
const selectGoalsState = (state) => state.goals;
const selectGoalProgressState = (state) => state.goalProgress;

// Select all goals (combined with pending optimistic ones if needed)
export const selectAllGoals = createSelector(
  [selectGoalsState],
  (goalsState) => goalsState.goals
);

// Select all goal progress records
export const selectGoalProgressRecords = createSelector(
  [selectGoalProgressState],
  (progressState) => progressState.progressRecords
);

// Select pending progress updates (not yet confirmed)
export const selectPendingProgress = createSelector(
  [selectGoalProgressState],
  (progressState) => progressState.pendingProgressUpdates
);

// Memoized selector to combine goal progress with pending values
export const makeSelectGoalsWithProgress = (selectedDate) =>
  createSelector(
    [selectAllGoals, selectGoalProgressRecords, selectPendingProgress],
    (goals, records, pending) => {
      const dateStr = new Date(selectedDate).toISOString().slice(0, 10);
      const withProgress = goals.map((goal) => {
        const goalId = goal._id?.toString() || goal.tempId;
        const key = `${goalId}_${dateStr}`;
        const server = records.find(
          (r) => r.goal_id?.toString?.() === goalId && new Date(r.date).toISOString().slice(0, 10) === dateStr
        );
        const pendingForDate = pending?.[key] || {};
        return {
          ...goal,
          progress: {
            ...(server?.progress || {}),
            ...pendingForDate,
          },
        };
      });
      return withProgress;
    }
  );
