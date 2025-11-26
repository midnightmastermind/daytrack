import { createSelector } from "@reduxjs/toolkit";
import { findTaskByIdDeep } from "./taskUtils.js";

// === 🔁 Top-Level Enrichment ===
export function calculateAllGoals(goals, selectedDate = null) {
  return goals.map((goal) => enrichGoalWithProgress(goal, selectedDate));
}

export function enrichGoalWithProgress(goal, selectedDate = null) {
  return {
    ...goal,
    goalItems: (goal.goalItems || []).map((item, idx) =>
      enrichGoalItem({ ...item, goalId: goal._id || goal.tempId, order: idx }, selectedDate)
    ),
  };
}

export const getTodayKey = () => new Date().toISOString().split("T")[0];

export function enrichGoalItem(item, selectedDate = null) {
  const enriched = {
    ...item,
    totals: {}, // temp
    totalsByDate: {},
    totalsByTask: {},
  };

  enriched.totals = calculateGoalItemTotals(enriched);
  enriched.totalsByDate = calculateGoalItemTotalsByDate(enriched);
  enriched.totalsByTask = calculateGoalItemTotalsByTask(enriched);

  return enriched;
}

// === 🔍 Settings Helper ===
function getSettingsForEntryFromGoalItem(item, entry) {
  const entryTaskId = entry.task_id?.toString?.();
  const unitKey = entry.unitKey;
 
  for (const task of item.tasks || []) {
    const taskId = task.task_id?.toString?.();
 
    // 🔁 Grouped input task
    if (task.grouping) {
      const setting = task.unitSettings?.[unitKey];
      if (setting?.enabled) return setting;
    }

    // ✅ Non-grouped tasks — treat task_id or unitKey match as valid
    if (taskId === entryTaskId || taskId === unitKey) {
      return {
        flow: task.flow || "any",
        reverseFlow: task.reverseFlow ?? false,
        replaceable: task.replaceable ?? false,
      };
    }
  }

  return null;
}
function shouldIncludeEntry(entry, settings, { date, task_id, flow } = {}, itemTimeScale) {

  if (!settings) return false;
  if (task_id && entry.task_id?.toString?.() !== task_id) return false;
  if (flow && entry.flow !== flow) return false;  
  if (date && itemTimeScale && itemTimeScale !== "overall") {
    const entryDate = new Date(entry.date);
    const targetDate = new Date(date);

    const samePeriod = {
      daily: entryDate.toDateString() === targetDate.toDateString(),
      weekly:
        entryDate.getFullYear() === targetDate.getFullYear() &&
        getWeek(entryDate) === getWeek(targetDate),
      monthly:
        entryDate.getFullYear() === targetDate.getFullYear() &&
        entryDate.getMonth() === targetDate.getMonth(),
    };

    if (!samePeriod[itemTimeScale]) return false;
  }

  const direction = getFlowMultiplier(settings.flow || "any", entry.flow, settings.reverseFlow);
  return direction !== 0;
}

function getFlowMultiplier(goalFlow, inputFlow, reverseFlow = false) {
  if (inputFlow === "replace") return 0;
  let direction = 0;
  if (goalFlow === "any") {
    direction = inputFlow === "in" ? 1 : -1;
  } else if (goalFlow === inputFlow) {
    direction = 1;
  }
  return reverseFlow ? -direction : direction;
}

// === 📊 Totals ===
export function calculateGoalItemTotals(item, options = {}) {
  const key = `${item.goalId}__item${item.order}`;
  let total = 0;
  for (const entry of item.progress || []) {

    if (entry.goalItemKey !== key) continue;

    const settings = getSettingsForEntryFromGoalItem(item, entry);
  

    if (entry.flow === "replace") {
      if (!settings.replaceable) continue;
      total = entry.value;
      continue;
    }

    if (!shouldIncludeEntry(entry, settings, options, item.timeScale)) continue;

    const direction = getFlowMultiplier(settings.flow || "any", entry.flow, settings.reverseFlow);
    
    total += entry.value * direction;

  }

  return { [key]: total };
}


export function calculateGoalItemTotalsByDate(item, options = {}) {
  const key = `${item.goalId}__item${item.order}`;
  const byDate = {};

  for (const entry of item.progress || []) {
    if (entry.goalItemKey !== key) continue;

    const settings = getSettingsForEntryFromGoalItem(item, entry);
    if (!settings) continue;

    const dateKey = new Date(entry.date).toISOString().split("T")[0];
    if (!byDate[dateKey]) byDate[dateKey] = {};

    if (entry.flow === "replace") {
      if (!settings.replaceable) continue;
      byDate[dateKey][key] = entry.value;
      continue;
    }

    if (!shouldIncludeEntry(entry, settings, options, item.timeScale)) continue;

    const direction = getFlowMultiplier(settings.flow || "any", entry.flow, settings.reverseFlow);
    byDate[dateKey][key] = (byDate[dateKey][key] || 0) + entry.value * direction;
  }

  return byDate;
}


export function calculateGoalItemTotalsByTask(item, options = {}) {
  const key = `${item.goalId}__item${item.order}`;
  const byTask = {};

  for (const entry of item.progress || []) {
    if (entry.goalItemKey !== key) continue;

    const settings = getSettingsForEntryFromGoalItem(item, entry);
    if (!settings) continue;

    const taskId = entry.task_id?.toString?.() || "unknown";
    if (!byTask[taskId]) byTask[taskId] = {};

    if (entry.flow === "replace") {
      if (!settings.replaceable) continue;
      byTask[taskId][key] = entry.value;
      continue;
    }

    if (!shouldIncludeEntry(entry, settings, options, item.timeScale)) continue;

    const direction = getFlowMultiplier(settings.flow || "any", entry.flow, settings.reverseFlow);
    byTask[taskId][key] = (byTask[taskId][key] || 0) + entry.value * direction;
  }

  return byTask;
}


// === 📆 Helpers ===
export function getWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

// === 🧩 Build Entries ===
export function buildProgressEntriesFromTask(task, goalItems, assignmentDate, assignmentId) {
  const entries = [];
  const seenKeys = new Set();
  const taskId = task._id?.toString?.() || task.id;

  for (const item of goalItems || []) {
    const goalItemKey = `${item.goalId}__item${item.order}`;

    for (const goalTask of item.tasks || []) {
      const goalTaskId = goalTask.task_id?.toString?.();

      console.log(goalItemKey);
      console.log(taskId);
      console.log(goalTask.task_id);

      if (goalTask.grouping) {
        const groupParentId = getGroupParentId(task);
        if (goalTaskId !== taskId && goalTaskId !== groupParentId) continue;

        const input = task.values?.input || {};
        for (const [unitKey, unitConfig] of Object.entries(goalTask.unitSettings || {})) {
          if (!unitConfig.enabled || unitConfig.useInput === false) continue;

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
            goalItemKey,
          });
        }

      } else {
        if (goalTaskId !== taskId) continue;

        const trackInput = goalTask.useInput ?? true;
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
            goalItemKey,
          });
        }

        if (!trackInput && task.values?.checkbox === true && !seenKeys.has(baseKey)) {

          entries.push({
            task_id: taskId,
            unitKey: taskId,
            value: 1,
            flow: "in",
            date: assignmentDate,
            assignmentId,
            goalItemKey,
          });
        }
      }
    }
  }
  
  return entries;
}

export function getGroupParentId(task) {
  return task.assignmentAncestry?.find(
    (a) => a.properties?.group === true || a.properties?.grouping?.enabled === true
  )?._id?.toString?.();
}

// === 🧩 Rehydration for UI ===
export function rehydrate_goal_items(goal, tasks) {
  return (goal.goalItems || []).map((item, idx) =>
    rehydrate_goal_item_tasks({ ...item, goalId: goal._id || goal.tempId, order: idx }, tasks)
  );
}

export function rehydrate_goal_item_tasks(goalItem, tasks) {
  const hydratedTasks = (goalItem.tasks || []).map((t) => {
    const original = findTaskByIdDeep(t.task_id, tasks);

    const hydrated = {
      ...t,
      path: t.path || original?.path || [],
      units: original?.properties?.grouping?.units || t.units || [],
    };

    if (t.grouping) {
      const unitSettings = {};
      const children = [];

      for (const unit of hydrated.units || []) {
        if (unit.type === "text") continue;

        const settings = t.unitSettings?.[unit.key] || {};
        unitSettings[unit.key] = {
          enabled: true,
          flow: settings.flow || "any",
          reverseFlow: settings.reverseFlow ?? false,
          useInput: settings.useInput ?? true,
          hasTarget: settings.hasTarget ?? true,
          timeScale: settings.timeScale || "daily",
          replaceable: settings.replaceable ?? false,
          ...(settings.hasTarget ?? true
            ? {
                operator: settings.operator || "=",
                target: settings.target ?? 0,
              }
            : {
                starting: settings.starting ?? 0,
              }),
        };

        children.push({
          unitKey: unit.key,
          unitLabel: unit.name || unit.key,
          value: 0,
          ...unitSettings[unit.key],
        });
      }

      hydrated.unitSettings = unitSettings;
      hydrated.children = children;
    }

    return hydrated;
  });

  return {
    ...goalItem,
    tasks: hydratedTasks,
  };
}
