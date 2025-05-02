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
  console.log("====getFlowMultiplier====");

  let direction = 0;
  if (goalFlow === "any") {
    direction = inputFlow === "in" ? 1 : -1;
  } else if (goalFlow === inputFlow) {
    direction = 1;
  }
  console.log("flowObject: ", {
    goalFlow,
    inputFlow,
    reverseFlow,
    direction
  });

  return reverseFlow ? -direction : direction;
}

/**
 * Calculates progress for a single unit task (grouped or not).
 */
export function calculateUnitProgress({
  count = 0,
  value = 0,
  useInput = true,
  inputFlow = "in",
  goalFlow = "any",
  reverseFlow = false,
  hasTarget = true,
  starting = 0,
}) {
  const direction = getFlowMultiplier(goalFlow, inputFlow, reverseFlow);
  const delta = useInput ? value : count;
  const netChange = delta * direction;

  console.log("[📊 UnitCalc]", {
    count,
    value,
    useInput,
    inputFlow,
    goalFlow,
    reverseFlow,
    hasTarget,
    starting,
    direction,
    delta,
    netChange,
    result: hasTarget ? netChange : starting + netChange
  });

  return hasTarget ? netChange : starting + netChange;
}
/**
 * Applies calculation across a full goal and its tasks
 */
// export function calculateGoalProgress(goal) {
//   const {
//     hasTarget = true,
//     starting = 0,
//     tasks = [],
//     flow: goalFlow,
//     reverseFlow = false,
//   } = goal;

//   let total = 0;
//   console.log("calculateGoalProgress: ", {
//     hasTarget,
//     starting,
//     tasks,
//     goal,
//     reverseFlow
//   });
//   for (const task of tasks) {
//     if (task.grouping && Array.isArray(task.units)) {
//       console.log("GROUPED TASK: ", task);
//       for (const unit of task.units) {
//         const inputFlow = unit.flow || "in";
//         const value = unit.progress || 0;
//         const count = unit.count || 0;
//         const useInput = unit.useInput ?? true;

//         const progress = calculateUnitProgress({
//           count,
//           value,
//           inputFlow,
//           goalFlow: task.flow || "any",
//           reverseFlow,
//           hasTarget,
//           starting: unit.starting || 0,
//           useInput,
//         });

//         total += hasTarget ? progress : progress - (unit.starting || 0);
//       }
//     } else {
//       console.log("Regular TASK: ", task);
//       const inputFlow = task.flow || "in";
//       const value = task.progress || 0;
//       const count = task.count || 0;
//       const useInput = task.useInput ?? true;

//       const progress = calculateUnitProgress({
//         count,
//         value,
//         inputFlow,
//         goalFlow: task.flow || "any",
//         reverseFlow,
//         hasTarget,
//         starting: task.starting || 0,
//         useInput,
//       });

//       total += hasTarget ? progress : progress - (task.starting || 0);
//     }
//   }

//   return hasTarget ? total : starting + total;
// }

export function calculateGoalProgress(goalProgressParams) {
  console.log(goalProgressParams);

  const {
    goal,
    countArray,
    valueArray,
    realTask,
    progress
  } = goalProgressParams;
    for (const goalTask of goal.tasks) {
      const taskId = goalTask.task_id;
      if (goalTask.task_id in countArray) {
        const taskCountObject = countArray[taskId];
        const taskValueObject = valueArray[taskId]
        if (goalTask.grouping) {
          const newProgress = {};
          
          for (unit in goalTask.units) {
            const unitSettings = goalTask.unitSettings[unit.key];
            newProgress[unit.key] = 0;
            if (unitSettings.useInput) {
              for (const [childKey, childObject] of Object.entries(valueArray || {})) {
                console.log(childObject);
              }
            }
          }    
          //     for (const [unitKey, unitObject] of Object.entries(valueArray || {})) {
          //     if (unitObject[goalTask.unit]) {
          //       const valueObject = val[goalTask.unit];
          //       const calculationParams = {
          //         taskFlow: valueObject.flow,
          //         value: valueObject.value
          //       }
  
          //     }
                
          //     }
          //   }
  
          //     {
          //       count = 0,
          //       value = 0,
          //       useInput = true,
          //       inputFlow = "in",
          //       goalFlow = "any",
          //       reverseFlow = false,
          //       hasTarget = true,
          //       starting = 0,
          //     }
          //     const unitCalculation = calculateUnitProgress()
          //   }
        }
      }
    }
}
  //     // const childTask = findTaskByIdDeep(childId, tasks);


  //     // //grouping stuff
  //     // if (task.grouping) {

  //     // }
  //   }
  // }
  // const {
  //   hasTarget = true,
  //   starting = 0,
  //   tasks = [],
  //   flow: goalFlow,
  //   reverseFlow = false,
  // } = goal;

  // let total = 0;
  // console.log("calculateGoalProgress: ", {
  //   hasTarget,
  //   starting,
  //   tasks,
  //   goal,
  //   reverseFlow
  // });

  // for (const task of goal.tasks) {

  //   if (task.grouping && Array.isArray(task.units)) {
  //     console.log("GROUPED TASK: ", task);
  //     for (const unit of task.units) {
  //       const inputFlow = unit.flow || "in";
  //       const value = unit.progress || 0;
  //       const count = unit.count || 0;
  //       const useInput = unit.useInput ?? true;

  //       const progress = calculateUnitProgress({
  //         count,
  //         value,
  //         inputFlow,
  //         goalFlow: task.flow || "any",
  //         reverseFlow,
  //         hasTarget,
  //         starting: unit.starting || 0,
  //         useInput,
  //       });

  //       total += hasTarget ? progress : progress - (unit.starting || 0);
  //     }
  //   } else {
  //     console.log("Regular TASK: ", task);
  //     const inputFlow = task.flow || "in";
  //     const value = task.progress || 0;
  //     const count = task.count || 0;
  //     const useInput = task.useInput ?? true;

  //     const progress = calculateUnitProgress({
  //       count,
  //       value,
  //       inputFlow,
  //       goalFlow: task.flow || "any",
  //       reverseFlow,
  //       hasTarget,
  //       starting: task.starting || 0,
  //       useInput,
  //     });

  //     total += hasTarget ? progress : progress - (task.starting || 0);
  //   }
  // }

  // return hasTarget ? total : starting + total;