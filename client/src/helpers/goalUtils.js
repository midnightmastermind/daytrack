import { findTaskByIdDeep } from './taskUtils.js';

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
export function getGoalUnitTotals(goal, options = {}) {
  const { date = null, task_id = null, flow = null } = options;

  const totals = {};

  for (const entry of goal.progress || []) {
    if (date && entry.date !== date) continue;
    if (task_id && entry.task_id?.toString?.() !== task_id) continue;
    if (flow && entry.flow !== flow) continue;

    const key = entry.unitKey;
    totals[key] = (totals[key] || 0) + entry.value;
  }

  return totals;
}

export function getGoalUnitTotalsByDate(goal, { task_id = null, flow = null } = {}) {
  const byDate = {};

  for (const entry of goal.progress || []) {
    if (task_id && entry.task_id?.toString?.() !== task_id) continue;
    if (flow && entry.flow !== flow) continue;

    const dateKey = entry.date || "unknown";
    if (!byDate[dateKey]) byDate[dateKey] = {};

    const unitKey = entry.unitKey;
    byDate[dateKey][unitKey] = (byDate[dateKey][unitKey] || 0) + entry.value;
  }

  return byDate;
}

export function getGoalUnitTotalsByTask(goal, { date = null, flow = null } = {}) {
  const byTask = {};

  for (const entry of goal.progress || []) {
    if (date && entry.date !== date) continue;
    if (flow && entry.flow !== flow) continue;

    const taskId = entry.task_id?.toString?.() || "unknown";
    if (!byTask[taskId]) byTask[taskId] = {};

    const unitKey = entry.unitKey;
    byTask[taskId][unitKey] = (byTask[taskId][unitKey] || 0) + entry.value;
  }

  return byTask;
}


export function buildProgressEntriesFromTask(task, goal, assignmentDate, assignmentId) {
  const entries = [];

  for (const goalTask of goal.tasks || []) {
    if (goalTask.grouping && goalTask.unitSettings) {
      const input = task.values?.input || {};
      for (const [unitKey, unitConfig] of Object.entries(goalTask.unitSettings)) {
        if (!unitConfig.enabled) continue;

        const val = input[unitKey];
        if (typeof val?.value === "number") {
          const flowMatch = unitConfig.flow === "any" || val.flow === unitConfig.flow;
          if (!flowMatch) continue;

          entries.push({
            task_id: task._id,
            unitKey,
            value: val.value,
            flow: val.flow,
            date: assignmentDate,
            assignmentId
          });
        }
      }
    } else {
      const trackInput = goalTask.useInput;
      const input = task.values?.input;
      if (trackInput && typeof input === "number") {
        entries.push({
          task_id: task._id,
          unitKey: goalTask.task_id?.toString?.() || "unknown",
          value: input,
          flow: "in",
          date: assignmentDate,
          assignmentId
        });
      }

      if (!trackInput && task.values?.checkbox === true) {
        entries.push({
          task_id: task._id,
          unitKey: goalTask.task_id?.toString?.() || "unknown",
          value: 1,
          flow: "in",
          date: assignmentDate,
          assignmentId
        });
      }
    }
  }

  return entries;
}

// helpers/goalUtils.js (append to existing file)

/**
 * Computes the directional multiplier based on flow, reverseFlow, and input flow.
 * Returns +1, -1, or 0 if not applicable.
 */
export function getFlowMultiplier(goalFlow, inputFlow, reverseFlow = false) {
  // console.log("====getFlowMultiplier====");

  let direction = 0;
  if (goalFlow === "any") {
    direction = inputFlow === "in" ? 1 : -1;
  } else if (goalFlow === inputFlow) {
    direction = 1;
  }
  // console.log("flowObject: ", {
  //   goalFlow,
  //   inputFlow,
  //   reverseFlow,
  //   direction
  // });

  return reverseFlow ? -direction : direction;
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
