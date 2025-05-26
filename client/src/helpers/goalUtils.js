import { findTaskByIdDeep } from './taskUtils.js';

export const selectGoalTotals = (id) =>
  createSelector(
    (state) => state.goals.goals.find(g => g._id === id || g.tempId === id),
    (goal) => getGoalUnitTotals(goal)
  );

export function enrichGoalWithProgress(goal) {
  return {
    ...goal,
    totals: getGoalUnitTotals(goal),
    totalsByDate: getGoalUnitTotalsByDate(goal),
    totalsByTask: getGoalUnitTotalsByTask(goal),
  };
}

export function flattenGoalTasksForSave(tasks = []) {
  const flattened = [];

  for (const t of tasks) {
    if (t.grouping && t.unitSettings) {
      for (const [unitKey, unit] of Object.entries(t.unitSettings)) {
        if (!unit?.enabled) continue;

        const base = {
          task_id: t.task_id,
          path: t.path,
          grouping: true,
          type: t.type,
          unit: unitKey,
          flow: unit.flow || "any",
          reverseFlow: unit.reverseFlow ?? false,
          useInput: unit.useInput ?? true,
          hasTarget: unit.hasTarget ?? true,
        };

        if (unit.hasTarget ?? true) {
          flattened.push({
            ...base,
            operator: unit.operator || "=",
            target: Number(unit.target || 0),
            timeScale: unit.timeScale || "daily",
          });
        } else {
          flattened.push({
            ...base,
            starting: Number(unit.starting || 0),
          });
        }
      }
    } else {
      // 📌 Fix regular non-grouped tasks to save flow/reverseFlow/useInput/hasTarget
      flattened.push({
        task_id: t.task_id,
        path: t.path,
        type: t.type || "goal",
        flow: t.flow || "any",
        reverseFlow: t.reverseFlow ?? false,
        useInput: t.useInput ?? true,
        hasTarget: t.hasTarget ?? true,
        starting: Number(t.starting || 0),
        ...(t.hasTarget ?? true
          ? {
            operator: t.operator || "=",
            target: Number(t.target || 0),
            timeScale: t.timeScale || "daily",
          }
          : {}),
      });
    }
  }

  return flattened;
}


/**
 * Build a consistent compound key for grouped unit progress tracking.
 * Uses double underscore as a delimiter.
 */

export const buildCompoundKey = (taskId, unit) => {
  if (!taskId || !unit) {
    console.warn("⚠️ buildCompoundKey: missing taskId or unitKey", { taskId, unit });
    return "";
  }
  return `${taskId}__${unit}`;
};

export const buildCompoundChildKey = (taskId, child, unit) => {
  if (!taskId || !unit) {
    console.warn("⚠️ buildCompoundKey: missing taskId or unitKey", { taskId, unit });
    return "";
  }
  return `${taskId}__${child}__${unit}`;
};


export function splitCompoundKey(compoundKey) {
  if (!compoundKey) return [null, null];
  const parts = compoundKey.split("__");
  if (parts.length < 2) return [compoundKey, null];
  const unit = parts.pop();
  const baseId = parts.join("__");
  return [baseId, unit];
}

export function calculateGoalProgressForGoal(goal, dayplans, taskMap) {
  const progress = {};

  for (const goalTask of goal.tasks || []) {
    const taskId = goalTask.task_id?.toString?.();
    if (!taskId) continue;

    const baseTask = taskMap.get(taskId);
    if (!baseTask) continue;

    const isGrouped = goalTask.grouping === true && Array.isArray(goalTask.units);

    if (isGrouped) {
      // Handle grouped goal
      for (const dayplan of dayplans) {
        for (const slot of dayplan.result || []) {
          for (const assigned of slot.assignedTasks || []) {
            const assignedTaskId = assigned.originalId || assigned.task_id;
            const assignedTask = taskMap.get(assignedTaskId);
            if (!assignedTask) continue;

            // Only include tasks under the same grouped parent
            const ancestryMatch = assigned.assignmentAncestry?.some(
              a => a._id?.toString?.() === baseTask._id?.toString?.()
            );
            if (!ancestryMatch) continue;

            const input = assigned.values?.input || {};
            for (const [unitKey, unitConfig] of Object.entries(goalTask.unitSettings || {})) {
              if (!unitConfig.enabled || typeof input[unitKey]?.value !== "number") continue;

              // flow filtering
              const matchesFlow =
                unitConfig.flow === "any" || input[unitKey].flow === unitConfig.flow;
              if (!matchesFlow) continue;

              progress[unitKey] = (progress[unitKey] || 0) + input[unitKey].value;
            }
          }
        }
      }
    } else {
      // Handle regular goal
      const trackCheckbox = goalTask.useInput === false;
      const trackInput = goalTask.useInput === true;

      for (const dayplan of dayplans) {
        for (const slot of dayplan.result || []) {
          for (const assigned of slot.assignedTasks || []) {
            const assignedTaskId = assigned.originalId || assigned.task_id;
            if (assignedTaskId !== taskId) continue;

            const values = assigned.values || {};
            if (trackCheckbox && values.checkbox) {
              progress[taskId] = (progress[taskId] || 0) + 1;
            }

            if (trackInput && typeof values.input === "number") {
              progress[taskId] = (progress[taskId] || 0) + values.input;
            }
          }
        }
      }
    }
  }

  // Return array format (ready for goal.progress = [...])
  return Object.entries(progress).map(([unitKey, value]) => ({
    unitKey,
    value,
  }));
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


function shouldIncludeEntry(entry, settings, { date, task_id, flow }) {
  if (!settings) return false; // 🛑 Fix: prevent crash

  if (date && entry.date?.slice(0, 10) !== date.slice(0, 10)) return false;
  if (task_id && entry.task_id?.toString?.() !== task_id) return false;
  if (flow && entry.flow !== flow) return false;

  const direction = getFlowMultiplier(settings.flow || "any", entry.flow, settings.reverseFlow);
  return direction !== 0;
}

function getFlowMultiplier(goalFlow, inputFlow, reverseFlow = false) {
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

    if (!goalTask || !shouldIncludeEntry(entry, settings, options)) continue;

    const direction = getFlowMultiplier(settings.flow || "any", entry.flow, settings.reverseFlow);
    const key = entry.unitKey;
    totals[key] = (totals[key] || 0) + entry.value * direction;
  }

  return totals;
}

// === 📅 Totals: By Date

export function getGoalUnitTotalsByDate(goal, options = {}) {
  const byDate = {};

  for (const entry of goal.progress || []) {
    const [goalTask, settings] = getGoalTaskAndSettings(goal, entry);
    if (!goalTask || !shouldIncludeEntry(entry, settings, options)) continue;

    const direction = getFlowMultiplier(settings.flow || "any", entry.flow, settings.reverseFlow);
    const dateKey = entry.date || "unknown";
    if (!byDate[dateKey]) byDate[dateKey] = {};

    const unitKey = entry.unitKey;
    byDate[dateKey][unitKey] = (byDate[dateKey][unitKey] || 0) + entry.value * direction;
  }

  return byDate;
}

// === 🧠 Totals: By Task

export function getGoalUnitTotalsByTask(goal, options = {}) {
  const byTask = {};

  for (const entry of goal.progress || []) {
    const [goalTask, settings] = getGoalTaskAndSettings(goal, entry);
    if (!goalTask || !shouldIncludeEntry(entry, settings, options)) continue;

    const direction = getFlowMultiplier(settings.flow || "any", entry.flow, settings.reverseFlow);
    const taskId = entry.task_id?.toString?.() || "unknown";
    if (!byTask[taskId]) byTask[taskId] = {};

    const unitKey = entry.unitKey;
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
      console.log(getGroupParentId(task));
      // ✅ Only match grouped goals if task is under the correct grouped parent
      if (goalTaskId !== getGroupParentId(task)) continue;

      const input = task.values?.input || {};
      console.log(task);
      console.log(goalTask);
      console.log(input);
      for (const [unitKey, unitConfig] of Object.entries(goalTask.unitSettings || {})) {
        console.log(unitKey);
        console.log(unitConfig);
        if (!unitConfig.enabled) continue;

        const val = input[unitKey];
        console.log(val);
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
console.log(entries);
  return entries;
}

/**
 * Calculates progress for a single unit task (grouped or not).
 */
export function calculateUnitProgress({
  value = 0,
  useInput = true,
  taskFlow = "in",
  flow = "any",
  reverseFlow = false,
  hasTarget = true,
  starting = 0,
}) {
  const direction = getFlowMultiplier(flow, taskFlow, reverseFlow);
  const delta = value;
  const netChange = delta * direction;

  // console.log("[📊 UnitCalc]", {
  //   value,
  //   useInput,
  //   taskFlow,
  //   flow,
  //   reverseFlow,
  //   hasTarget,
  //   starting,
  //   direction,
  //   delta,
  //   netChange,
  //   result: hasTarget ? netChange : starting + netChange
  // });

  return hasTarget ? netChange : starting + netChange;
}

export function calculateGoalProgress(goalProgressParams) {
  const {
    goal,
    countArray,
    valueArray,
    tasks,
  } = goalProgressParams;
  const newProgress = {};

  for (const goalTask of goal.tasks) {
    const taskId = goalTask.task_id;
    if (goalTask.task_id in countArray) {
      const taskCount = countArray[taskId];
      const taskValue = valueArray[taskId];

      if (goalTask.grouping) {
        newProgress[taskId] = {};
        for (const [unitIndex, unit] of Object.entries(goalTask.units || {})) {
          const unitSettings = goalTask.unitSettings[unit.key];
          newProgress[taskId][unit.key] = 0;
          if (unitSettings && unitSettings.useInput) {
            for (const [childKey, childObject] of Object.entries(taskValue || {})) {
              if (childObject[unit.key]) {
                const calculationParams = {
                  taskFlow: childObject[unit.key].flow || "in",
                  value: childObject[unit.key].value || 0,
                  ...unitSettings
                };

                const progress = calculateUnitProgress(calculationParams);
                if (unitSettings.flow === "any" || unitSettings.flow === taskFlow) {
                  newProgress[taskId][unit.key] = newProgress[taskId][unit.key] + (parseInt(progress));
                }
              }
            }
          } else if (unitSettings && !unitSettings.useInput) {
            // for (const [childKey, childObject] of Object.entries(taskCountObject || {})) {
            //   if (childObject[unit.key]) {
            //     const calculationParams = {
            //       taskFlow: childObject[unit.key].flow || "in",
            //       value: childObject[unit.key].value || 0,
            //       ...unitSettings
            //     };

            //     const progress = calculateUnitProgress(calculationParams);
            //     newProgress[unit.key] += progress;
            //     console.log(newProgress);
            //   }
            // }
          }
        }

      } else {
        const realTask = findTaskByIdDeep(taskId, tasks);
        newProgress[taskId] = 0;

        if (goalTask.useInput) {
          // console.log("useInput");
        } else {
          const value = taskCount;
          if (typeof value == "number") {
            const calculationParams = {
              taskFlow: realTask.flow || "in",
              value,
              ...goalTask
            };

            const progress = calculateUnitProgress(calculationParams);
            if (goalTask.flow === "any" || goalTask.flow === (realTask.flow || "in")) {
              newProgress[taskId] = progress;
            }
          }
        }
      }
    }
  }
  return newProgress;
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