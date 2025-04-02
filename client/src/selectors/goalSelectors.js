import { createSelector } from "reselect";
export const makeSelectGoalsWithProgress = (selectedDate) =>
  createSelector(
    [
      (state) => {
        console.log("🧠 Selector: goals", state.goals?.goals);
        return state.goals?.goals || [];
      },
      (state) => {
        console.log("🧠 Selector: goalProgress.progressRecords", state.goalProgress?.progressRecords);
        return state.goalProgress?.progressRecords || [];
      },
    ],
    (goals, progressData) => {
      const dateStr = new Date(selectedDate).toISOString().slice(0, 10);
      console.log("📅 Selector - selectedDate:", dateStr);

      return goals.map((goal) => {
        const goalIdStr = goal._id?.toString?.() || goal.tempId;

        if (!goalIdStr) {
          console.warn("⚠️ Goal missing _id and tempId", goal);
          return goal;
        }

        const goalProgressForDate =
          progressData.find((gp) =>
            (gp.goal_id?.toString?.() === goalIdStr || gp.tempId === goalIdStr) &&
            new Date(gp.date).toISOString().slice(0, 10) === dateStr
          ) || {
            goal_id: goalIdStr,
            date: selectedDate,
            progress: {},
          };

        const progressMap = {};
        Object.entries(goalProgressForDate.progress || {}).forEach(([key, val]) => {
          progressMap[key.toString()] = val;
        });

        return {
          ...goal,
          tasks: goal.tasks.map((task) => {
            const taskIdStr = task.task_id?.toString?.() || task._id?.toString?.() || task.id?.toString?.();
            const progress = progressMap[taskIdStr] || 0;
            console.log(`🧩 Task: ${taskIdStr} | Progress: ${progress}`);
            return { ...task, progress };
          }),
        };
      });
    }
  );

  