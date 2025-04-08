import { createSelector } from 'reselect';

const selectDayPlanState = (state) => state.dayplans;

export const selectAllDayPlans = createSelector(
  [selectDayPlanState],
  (planState) => planState.dayplans
);

// Optional: get plan by selected date
export const makeSelectPlanForDate = (selectedDate) =>
  createSelector([selectAllDayPlans], (plans) => {
    return plans.find(
      (plan) => new Date(plan.date).toDateString() === selectedDate.toDateString()
    );
  });
