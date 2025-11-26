// goalSelectors.js
import { createSelector } from "@reduxjs/toolkit";
import {
  calculateGoalItemTotals,
  calculateGoalItemTotalsByDate,
  calculateGoalItemTotalsByTask,
} from "../helpers/goalUtils";

export const makeSelectGoalsWithProgress = (selectedDate) =>
  createSelector([(state) => state.goals.goals], (goals) => {
    console.log(selectedDate);
    const sortedGoals = [...goals].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return sortedGoals.map((goal) => {
      const goalItems = goal.goalItems || [];

      // Aggregate totals across all goalItems
      const totals = {};
      const totalsByDate = {};
      const totalsByTask = {};

      for (const item of goalItems) {
        const itemTotals = calculateGoalItemTotals(item);
        const itemTotalsByDate = calculateGoalItemTotalsByDate(item);
        const itemTotalsByTask = calculateGoalItemTotalsByTask(item);


        // Merge item totals
        for (const key in itemTotals) {
          totals[key] = (totals[key] || 0) + itemTotals[key];
        }

        for (const date in itemTotalsByDate) {
          totalsByDate[date] = totalsByDate[date] || {};
          for (const key in itemTotalsByDate[date]) {
            totalsByDate[date][key] =
              (totalsByDate[date][key] || 0) + itemTotalsByDate[date][key];
          }
        }

        for (const taskId in itemTotalsByTask) {
          totalsByTask[taskId] = totalsByTask[taskId] || {};
          for (const key in itemTotalsByTask[taskId]) {
            totalsByTask[taskId][key] =
              (totalsByTask[taskId][key] || 0) + itemTotalsByTask[taskId][key];
          }
        }
      }

      return {
        ...goal,
        totals,
        totalsByDate,
        totalsByTask,
      };
    });
  });
