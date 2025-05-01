import { v4 as uuidv4 } from "uuid";
import { buildCompoundKey, buildCompoundChildKey } from "./goalUtils";

export function findTaskByIdDeep(id, tasks) {
  if (!id || !Array.isArray(tasks)) return null;

  const stack = [...tasks];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    if (current._id?.toString() === id || current.tempId === id || current.id?.toString() === id) {
      return current;
    }

    if (Array.isArray(current.children)) {
      stack.push(...current.children);
    }
    if (Array.isArray(current.categories)) {
      stack.push(...current.categories);
    }
  }

  return null;
}

export function getSelectedLeaf(task) {
  let selected = null;
  let fallback = null;

  function walk(node, ancestry = []) {
    const current = {
      _id: node._id,
      name: node.name,
      properties: node.properties || {},
      values: node.values || {},
    };

    const nextAncestry = [...ancestry, current];

    const hasValidInput =
      node.properties?.input &&
      ((typeof node.values?.input === "string" && node.values.input.trim().length > 0) ||
       (typeof node.values?.input === "object" && Object.keys(node.values.input).length > 0));

    const isValid =
      (node.properties?.checkbox && node.values?.checkbox === true) || hasValidInput;

    const isLeaf = !node.children || node.children.length === 0;

    if (isLeaf && !fallback) {
      fallback = {
        ...node,
        assignmentAncestry: nextAncestry,
      };
    }

    if (isLeaf && isValid && !selected) {
      selected = {
        ...node,
        assignmentAncestry: nextAncestry,
      };
    }

    if (node.children) {
      node.children.forEach((child) => walk(child, nextAncestry));
    }
  }

  walk(task);
  return selected || fallback || task;
}

export function getSelectedLeaves(task) {
  const selected = [];

  function walk(node, ancestry = []) {
    const current = {
      _id: node._id,
      name: node.name,
      properties: node.properties || {},
      values: node.values || {},
    };

    const nextAncestry = [...ancestry, current];
    const isLeaf = !node.children || node.children.length === 0;

    // === FIXED LOGIC: Grouped inputs MUST be checked to count
    const isGrouped = node.properties?.group === true && node.properties?.input === true;
    const isChecked = node.values?.checkbox === true;

    const hasValidInput =
      typeof node.values?.input === "string"
        ? node.values.input.trim() !== ""
        : typeof node.values?.input === "object" &&
          Object.values(node.values.input).some((val) =>
            typeof val === "object" ? typeof val.value === "number" && val.value !== 0 : !!val
          );

    const isValid =
      (isGrouped ? isChecked && hasValidInput : isChecked || hasValidInput);

    if (isLeaf && isValid) {
      selected.push({
        ...node,
        assignmentAncestry: nextAncestry,
        assignmentId: `${node._id || node.tempId || node.id || uuidv4()}-${Date.now()}-${Math.random()}`,
      });
    }

    if (node.children) {
      node.children.forEach((child) => walk(child, nextAncestry));
    }
  }

  walk(task);
  return selected;
}


export function buildScheduleAssignmentsFromTask(task) {
  const selected = getSelectedLeaves(task);

  if (!selected.length) {
    console.warn("[buildScheduleAssignmentsFromTask] ❌ No valid leaf tasks found");
  } else {
    console.log("[buildScheduleAssignmentsFromTask] ✅ selected:", selected.map(x => x.name));
  }

  return selected.map(leaf => {
    const ancestry = leaf.assignmentAncestry || [];
    const parentGrouping = ancestry.find(a => a.properties?.grouping?.enabled);
    const groupId = parentGrouping?._id?.toString() || leaf._id?.toString();

    return {
      ...leaf,
      id: leaf._id?.toString() || leaf.tempId || leaf.id,
      originalId: groupId, // override originalId to grouping parent
      assignmentId: leaf.assignmentId,
      assignmentAncestry: ancestry,
    };
  });
}



export const getTaskAncestryByIdDeep = (taskTree = [], taskId, ancestry = []) => {
  for (const task of taskTree) {
    const id = task._id?.toString?.() || task.tempId || task.id;
    const path = [...ancestry, task];
    if (id === taskId) return path;

    const foundInChildren = getTaskAncestryByIdDeep(task.children || [], taskId, path);
    if (foundInChildren) return foundInChildren;

    const foundInCategories = getTaskAncestryByIdDeep(task.categories || [], taskId, path);
    if (foundInCategories) return foundInCategories;
  }
  return null;
};

export function mergeCheckboxSelections(task, selections) {
  const newTask = { ...task };

  if (selections.hasOwnProperty(newTask._id)) {
    newTask.values = {
      ...newTask.values,
      checkbox: selections[newTask._id],
    };
  }

  if (newTask.children?.length) {
    newTask.children = newTask.children.map(child =>
      mergeCheckboxSelections(child, selections)
    );
  }
}

export const getTaskKey = (task) => {
  return (task?.id || task?._id || uuidv4()).toString();
};

export const countTasks = (assignments) => {
  const countMap = {};

  for (const slotTasks of Object.values(assignments)) {
    for (const task of slotTasks) {
      const ancestry = task.assignmentAncestry || [];
      const parentGrouping = ancestry.find(a => a.properties?.grouping?.enabled);
      const groupId = parentGrouping?._id?.toString() || task.originalId;

      // Regular task count (non-input)
      countMap[groupId] = (countMap[groupId] || 0) + 1;

      // Grouped input counts
      if (task.properties?.group && task.values?.input) {
        const inputValues = task.values.input;

        for (const [key, val] of Object.entries(inputValues)) {
          if (typeof val === "object" && typeof val.value === "number") {
            const child_id = task._d === groupId ? null : task.id;
            const compoundKey = buildCompoundChildKey(groupId, child_id, key);
            countMap[compoundKey] = (countMap[compoundKey] || 0) + val.value;
            // console.log(`📐 countTasks: ${compoundKey} += ${val.value}`);
          }
        }
      }
    }
  }

  console.log("✅ Final countMap:", countMap);
  return countMap;
};

export const filterByTaskAndUnit = (countMap, taskId, unit) => {
  const result = {};
  const prefix = `${taskId}__`;
  const suffix = `__${unit}`;

  for (const [key, value] of Object.entries(countMap)) {
    if (key.startsWith(prefix) && key.endsWith(suffix)) {
      // Remove the taskId and the following double underscore from the key
      const newKey = key.slice(prefix.length);
      result[newKey] = value;
    }
  }

  return result;
}

// export const countTasks = (assignments) => {
//   const countMap = {};
//   for (const slotTasks of Object.values(assignments)) {
//     for (const task of slotTasks) {
//       const id = task.originalId;
//       if (id) countMap[id] = (countMap[id] || 0) + 1;
//     }
//   }
//   return countMap;
// };

export const getCompoundUnitKey = (task, child) => {
  if (!task.grouping || !task.unit) return null;
  const base = task.task_id?.toString?.() || task._id?.toString?.();
  return `${base}_${child}_${task.unit}`;
};