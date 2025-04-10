// selectors/dayPlanSelectors.js
export const selectDayPlans = (state) => state.dayplans?.dayplans || [];

export const makeSelectDayPlanByDate = (date) => (state) => {
  const dayPlans = state.dayplans?.dayplans || [];
  return dayPlans.find((dp) => new Date(dp.date).toDateString() === new Date(date).toDateString()) || null;
};