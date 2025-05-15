// // selectors/goalSelectors.js
// import { createSelector } from "reselect";
// import { findTaskByIdDeep } from "../helpers/taskUtils";
// import {
//   buildCompoundKey,
//   calculateGoalProgress,
// } from "../helpers/goalUtils";

// export const makeSelectGoalsWithProgress = (selectedDate) =>
//   createSelector(
//     [
//       (state) => state.goals?.goals || [],
//       (state) => state.goalProgress?.progressRecords || [],
//       (state) => state.goalProgress?.pendingProgressUpdates || {},
//       (state) => state.tasks?.tasks || [],
//     ],
//     (goals, progressData, pendingProgressUpdates, taskTree) => {
//       const dateStr = selectedDate.toISOString().slice(0, 10);

//       return goals.map((goal) => {
//         const goalIdStr = goal._id?.toString?.() || goal.tempId;

//         const progressForGoal =
//           progressData.find((gp) =>
//             (gp.goal_id?.toString?.() === goalIdStr || gp.tempId === goalIdStr) &&
//             gp.date?.slice?.(0, 10) === dateStr
//           ) || { progress: {} };

//         const progressMap = {
//           ...progressForGoal.progress,
//           ...(pendingProgressUpdates[`${goalIdStr}_${dateStr}`] || {}),
//         };

//         if (Object.keys(progressMap).length === 0) {
//           console.warn("⚠️ No matching progress found for goal", goalIdStr, "on", dateStr);
//         }

//         const enrichedTasks = goal.tasks.map((task) => {
//           const taskId = task.task_id?.toString?.();
//           const original = findTaskByIdDeep(taskId, taskTree);
//           const units = original?.properties?.grouping?.units || [];

//           // === GROUPED TASK from DB (flattened) ===
//           if (task.grouping && task.unit && units.length) {
//             const compoundKey = buildCompoundKey(taskId, task.unit);

//             const enrichedUnits = units.map((u) => {
//               const unitKey = u.key;
//               const progress = progressMap[buildCompoundKey(taskId, unitKey)] || 0;
//               return {
//                 ...u,
//                 progress,
//                 count: progress, // if not using input, treat progress as count
//                 useInput: true,  // assume true from DB structure
//               };
//             });

//             return {
//               ...task,
//               units: enrichedUnits,
//               progress: progressMap[compoundKey] || 0,
//             };
//           }

//           // === GROUPED TASK from GoalForm ===
//           if (task.grouping && task.units && task.unitSettings) {
//             const enrichedUnits = task.units.map((u) => {
//               const unitKey = u.key;
//               const progress = progressMap[buildCompoundKey(taskId, unitKey)] || 0;
//               const settings = task.unitSettings[unitKey] || {};
//               return {
//                 ...u,
//                 progress,
//                 count: progress,
//                 useInput: settings.useInput ?? true,
//                 starting: settings.starting || 0,
//                 flow: settings.flow || "any",
//               };
//             });

//             return {
//               ...task,
//               units: enrichedUnits,
//             };
//           }

//           // === REGULAR TASK ===
//           const progress = progressMap[taskId] || 0;
//           return {
//             ...task,
//             progress,
//             count: progress,
//             useInput: task.useInput ?? true,
//             starting: task.starting || 0,
//             flow: task.flow || "any",
//           };
//         });
        
//         // ✅ Attach totalProgress using new helper
//         //const totalProgress = calculateGoalProgress({ ...goal, tasks: enrichedTasks });

//         return {
//           ...goal,
//           tasks: enrichedTasks,
//           //totalProgress,
//         };
//       });
//     }
//   );

import { createSelector } from "reselect";

export const selectGoalProgress = (state) => state.goalProgress.goalprogress;

export const makeSelectGoalsWithProgress = (selectedDate) =>
  createSelector(
    [(state) => state.goals.goals, selectGoalProgress],
    (goals, progressRecords) => {
      const selectedDateKey = new Date(selectedDate).toISOString().slice(0, 10);
      return goals.map((goal) => {
        const goalId = goal._id?.toString?.() || goal.tempId;

        const enrichedTasks = (goal.tasks || []).map((task) => {
          if (task.grouping && Array.isArray(task.units)) {
            const children = Object.entries(task.unitSettings || {})
              .filter(([unitKey, unit]) => {
                const unitMeta = task.units.find((u) => u.key === unitKey);
                return unit.enabled && unitMeta?.type !== "text";
              })
              .map(([unitKey, unit]) => {
                const unitMeta = task.units.find((u) => u.key === unitKey);
                const record = progressRecords.find(
                  (p) =>
                    p.goalId === goalId &&
                    p.taskId === task.task_id &&
                    p.progressKey === unitKey &&
                    new Date(p.date).toISOString().slice(0, 10) === selectedDateKey
                );

                return {
                  ...unit,
                  unitKey,
                  unitLabel: unitMeta?.label || unitKey,
                  value: record?.value || 0,
                };
              });

            return { ...task, children };
          }

          // Regular task (not grouped)
          const record = progressRecords.find(
            (p) =>
              p.goalId === goalId &&
              p.taskId === task.task_id &&
              (p.progressKey === null || p.progressKey === undefined) &&
              new Date(p.date).toISOString().slice(0, 10) === selectedDateKey
          );

          return { ...task, value: record?.value || 0 };
        });

        return { ...goal, tasks: enrichedTasks };
      });
    }
  );
