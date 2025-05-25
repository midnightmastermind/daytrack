import { createSelector } from "@reduxjs/toolkit";
import {
  getGoalUnitTotals,
  getGoalUnitTotalsByDate,
  getGoalUnitTotalsByTask,
} from "../helpers/goalUtils";

export const makeSelectGoalsWithProgress = (selectedDate) =>
  createSelector([(state) => state.goals.goals], (goals) => {
    return goals.map((goal) => ({
      ...goal,
      totals: getGoalUnitTotals(goal, { date: selectedDate.toISOString().slice(0, 10) }),
      totalsByDate: getGoalUnitTotalsByDate(goal),
      totalsByTask: getGoalUnitTotalsByTask(goal),
    }));
  });
