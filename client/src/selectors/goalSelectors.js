// === selectors/goalSelector.js ===
import { createSelector } from "reselect";

export const makeSelectGoalsWithProgress = (selectedDate) =>
  createSelector(
    [
      (state) => state.goals?.goals || [],
      (state) => state.goalProgress?.progressRecords || [],
      (state) => state.goalProgress?.pendingProgressUpdates || {},
    ],
    (goals, progressRecords, pendingUpdates) => {
      const dateStr = new Date(selectedDate).toISOString().slice(0, 10);

      return goals.map((goal) => {
        const goalId = goal._id?.toString?.() || goal.tempId;

        const progressRecord = progressRecords.find(
          (r) =>
            (r.goal_id === goalId || r.tempId === goalId) &&
            new Date(r.date).toISOString().slice(0, 10) === dateStr
        );

        const pendingKey = `${goalId}_${dateStr}`;
        const pendingForGoal = pendingUpdates[pendingKey] || {};

        const mergedProgress = {
          ...(progressRecord?.progress || {}),
          ...pendingForGoal,
        };

        const tasksWithProgress = (goal.tasks || []).map((task) => {
          const taskId = task.task_id?.toString?.() || task._id?.toString?.() || task.id?.toString?.();
          return {
            ...task,
            progress: mergedProgress[taskId] || 0,
          };
        });

        return {
          ...goal,
          tasks: tasksWithProgress,
        };
      });
    }
  );
