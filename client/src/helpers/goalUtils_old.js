import { findTaskByIdDeep } from './taskUtils.js';

export const selectGoalTotals = (id) =>
  createSelector(
    (state) => state.goals.goals.find(g => g._id === id || g.tempId === id),
    (goal) => getGoalUnitTotals(goal)
  );
  export function enrichGoalWithProgress(goal, selectedDate = null) {
    return {
      ...goal,
      totals: getGoalUnitTotals(goal),
      totalsByDate: getGoalUnitTotalsByDate(goal),
      totalsByTask: getGoalUnitTotalsByTask(goal),
      totalsForSelectedDate: selectedDate
        ? getGoalUnitTotals(goal, { date: selectedDate })
        : {},
    };
  }

// === 🔁 Shared Helpers ===

function getGoalTaskAndSettings(goal, entry) {
  const goalTask = (goal.tasks || []).find(t => {
    if (t.grouping) {
      return Object.keys(t.unitSettings || {}).includes(entry.unitKey);
    } else {
      return t.task_id?.toString?.() === entry.task_id?.toString?.();
    }
  });

  if (!goalTask) return [null, null];

  const settings = goalTask.grouping
    ? goalTask.unitSettings?.[entry.unitKey] || null
    : goalTask;

  return [goalTask, settings];
}

export function getWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function shouldIncludeEntry(entry, settings, { date, task_id, flow }) {
  if (!settings) return false;

  if (task_id && entry.task_id?.toString?.() !== task_id) return false;
  if (flow && entry.flow !== flow) return false;

  // ✅ Match by time scale
  if (date && settings.timeScale && settings.timeScale !== "overall") {
    const entryDate = new Date(entry.date || date);
    const targetDate = new Date(date);

    const samePeriod = {
      daily: entryDate.toDateString() === targetDate.toDateString(),
      weekly: entryDate.getFullYear() === targetDate.getFullYear() &&
              getWeek(entryDate) === getWeek(targetDate),
      monthly: entryDate.getFullYear() === targetDate.getFullYear() &&
               entryDate.getMonth() === targetDate.getMonth(),
    };

    if (!samePeriod[settings.timeScale]) return false;
  }

  const direction = getFlowMultiplier(settings.flow || "any", entry.flow, settings.reverseFlow);
  return direction !== 0;
}

function getFlowMultiplier(goalFlow, inputFlow, reverseFlow = false) {
  if (inputFlow === "replace") return 0; // handled separately
  let direction = 0;
  if (goalFlow === "any") {
    direction = inputFlow === "in" ? 1 : -1;
  } else if (goalFlow === inputFlow) {
    direction = 1;
  }
  return reverseFlow ? -direction : direction;
}
// === ✅ Totals: Flat
export function getGoalUnitTotals(goal, options = {}) {
  const totals = {};

  for (const entry of goal.progress || []) {
    const [goalTask, settings] = getGoalTaskAndSettings(goal, entry);
    if (!goalTask || !settings) continue;

    const key = entry.unitKey;

    if (entry.flow === "replace") {
      // ✅ Only apply replace if explicitly allowed
      const isReplaceable = settings.replaceable === true;
      if (!isReplaceable) continue;

      totals[key] = entry.value;
      continue;
    }

    if (!shouldIncludeEntry(entry, settings, options)) continue;

    const direction = getFlowMultiplier(settings.flow || "any", entry.flow, settings.reverseFlow);
    totals[key] = (totals[key] || 0) + entry.value * direction;
  }

  return totals;
}

// === 📅 Totals: By Date
export function getGoalUnitTotalsByDate(goal, options = {}) {
  const byDate = {};

  for (const entry of goal.progress || []) {
    const [goalTask, settings] = getGoalTaskAndSettings(goal, entry);
    if (!goalTask || !settings) continue;

    const dateKey = entry.date || "unknown";
    const unitKey = entry.unitKey;

    if (!byDate[dateKey]) byDate[dateKey] = {};

    if (entry.flow === "replace") {
      const isReplaceable = settings.replaceable === true;
      if (!isReplaceable) continue;

      byDate[dateKey][unitKey] = entry.value;
      continue;
    }

    if (!shouldIncludeEntry(entry, settings, options)) continue;

    const direction = getFlowMultiplier(settings.flow || "any", entry.flow, settings.reverseFlow);
    byDate[dateKey][unitKey] = (byDate[dateKey][unitKey] || 0) + entry.value * direction;
  }

  return byDate;
}

// === 🧠 Totals: By Task
export function getGoalUnitTotalsByTask(goal, options = {}) {
  const byTask = {};

  for (const entry of goal.progress || []) {
    const [goalTask, settings] = getGoalTaskAndSettings(goal, entry);
    if (!goalTask || !settings) continue;

    const taskId = entry.task_id?.toString?.() || "unknown";
    const unitKey = entry.unitKey;

    if (!byTask[taskId]) byTask[taskId] = {};

    if (entry.flow === "replace") {
      const isReplaceable = settings.replaceable === true;
      if (!isReplaceable) continue;

      byTask[taskId][unitKey] = entry.value;
      continue;
    }

    if (!shouldIncludeEntry(entry, settings, options)) continue;

    const direction = getFlowMultiplier(settings.flow || "any", entry.flow, settings.reverseFlow);
    byTask[taskId][unitKey] = (byTask[taskId][unitKey] || 0) + entry.value * direction;
  }

  return byTask;
}


export function getGroupParentId(task) {
  // ✅ This now looks for any ancestry node marked as a grouping parent
  return task.assignmentAncestry?.find(
    (a) => a.properties?.group === true || a.properties?.grouping?.enabled === true
  )?._id?.toString?.();
}

export function buildProgressEntriesFromTask(task, goal, assignmentDate, assignmentId) {
  const entries = [];
  const seenKeys = new Set();
  const taskId = task._id?.toString?.() || task.id;
  
  for (const goalTask of goal.tasks || []) {
    const goalTaskId = goalTask.task_id?.toString?.();

    if (goalTask.grouping) {
      // ✅ Only match grouped goals if task is under the correct grouped parent
      if (goalTaskId !== getGroupParentId(task)) continue;

      const input = task.values?.input || {};

      for (const [unitKey, unitConfig] of Object.entries(goalTask.unitSettings || {})) {

        if (!unitConfig.enabled) continue;

        const val = input[unitKey];
        if (typeof val?.value !== "number") continue;

        const flowMatch = unitConfig.flow === "any" || val.flow === unitConfig.flow;
        if (!flowMatch) continue;

        const key = `${goalTaskId}__${unitKey}__${assignmentId}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        entries.push({
          task_id: goalTaskId,
          unitKey,
          value: val.value,
          flow: val.flow,
          date: assignmentDate,
          assignmentId,
        });
      }
    } else {
      if (goalTaskId !== taskId) continue;

      const trackInput = goalTask.useInput;
      const input = task.values?.input;
      const baseKey = `${taskId}__${assignmentId}`;

      if (trackInput && typeof input === "number" && !seenKeys.has(baseKey)) {
        seenKeys.add(baseKey);
        entries.push({
          task_id: taskId,
          unitKey: taskId,
          value: input,
          flow: "in",
          date: assignmentDate,
          assignmentId,
        });
      }

      if (!trackInput && task.values?.checkbox === true && !seenKeys.has(baseKey)) {
        seenKeys.add(baseKey);
        entries.push({
          task_id: taskId,
          unitKey: taskId,
          value: 1,
          flow: "in",
          date: assignmentDate,
          assignmentId,
        });
      }
    }
  }
  return entries;
}


export function rehydrate_goal_tasks(goal, tasks) {
  const groupedMap = {};
  const regularTasks = [];

  for (const task of goal.tasks || []) {
    const taskId = task.task_id?.toString?.();
    if (!taskId) continue;

    const original = findTaskByIdDeep(taskId, tasks);

    // Grouped Input Task
    if (task.grouping && task.unit) {
      const unitKey = task.unit;
      const group = groupedMap[taskId] || {
        task_id: taskId,
        path: task.path || [],
        grouping: true,
        type: task.type || "goal",
        units: original?.properties?.grouping?.units || task.units || [],
        unitSettings: {},
        children: [],
      };

      group.unitSettings[unitKey] = {
        enabled: true,
        flow: task.flow || "any",
        reverseFlow: task.reverseFlow ?? false,
        useInput: task.useInput ?? true,
        hasTarget: task.hasTarget ?? true,
        timeScale: task.timeScale || "daily",
        replaceable: task.replaceable ?? false,
        ...(task.hasTarget ?? true
          ? {
              operator: task.operator || "=",
              target: task.target ?? 0,
            }
          : {
              starting: task.starting ?? 0,
            }),
      };

      groupedMap[taskId] = group;
    }

    // Regular Goal Task (not grouped)
    else {
      const baseTask = {
        ...task,
        path: task.path || original?.path || [],
        type: task.type || "goal",
        target: task.target ?? 0,
        operator: task.operator || "=",
        timeScale: task.timeScale || "daily",
        reverseFlow: task.reverseFlow ?? false,
        flow: task.flow || "any",
        useInput: task.useInput ?? true,
        hasTarget: task.hasTarget ?? true,
        starting: task.starting ?? 0,
        replaceable: task.replaceable ?? false, // ✅ ADD THIS

      };

      regularTasks.push(baseTask);
    }
  }

  // Populate children array for each grouped task
  for (const group of Object.values(groupedMap)) {
    const children = group.units
      .filter((u) => u.type !== "text")
      .map((unit) => {
        const settings = group.unitSettings[unit.key] || {};
        return {
          unitKey: unit.key,
          unitLabel: unit.label,
          value: 0,
          ...settings,
        };
      });
    group.children = children;
  }

  return [...regularTasks, ...Object.values(groupedMap)];
}