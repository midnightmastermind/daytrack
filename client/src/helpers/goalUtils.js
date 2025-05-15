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
