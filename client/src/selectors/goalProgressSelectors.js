import { createSelector } from "reselect";
export const makeSelectGoalsWithProgress = (selectedDate) =>
  createSelector(
    [
      (state) => state.goals?.goals || [],
      (state) => state.goalProgress?.progressRecords || [],
      (state) => state.goalProgress?.pendingProgressUpdates || {},
    ],
    (goals, progressData, pendingProgressUpdates) => {
      const dateStr = new Date(selectedDate).toISOString().slice(0, 10);

      return goals.map((goal) => {
        const goalIdStr = goal._id?.toString?.() || goal.tempId;
        const goalProgressForDate =
          progressData.find((gp) =>
            (gp.goal_id?.toString?.() === goalIdStr || gp.tempId === goalIdStr) &&
            new Date(gp.date).toISOString().slice(0, 10) === dateStr
          ) || {
            goal_id: goalIdStr,
            date: selectedDate,
            progress: {},
          };

        const baseProgress = { ...(goalProgressForDate.progress || {}) };

        // Overwrite with any pending counts
        const pendingKey = `${goalIdStr}_${dateStr}`;
        const pending = pendingProgressUpdates[pendingKey] || {};
        for (const [taskId, count] of Object.entries(pending)) {
          baseProgress[taskId] = count;
        }

        return {
          ...goal,
          tasks: goal.tasks.map((task) => {
            const taskIdStr = task.task_id?.toString?.() || task._id?.toString?.() || task.id?.toString?.();
            return { ...task, progress: baseProgress[taskIdStr] || 0 };
          }),
        };
      });
    }
  );