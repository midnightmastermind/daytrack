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
export const updateTaskByIdImmutable = (tasks, targetId, updateFn) => {
  return tasks.map((task) => {
    const id = task.task_id || task._id || task.tempId || task.id;
    if (id === targetId) {
      return updateFn(task); // updateFn must return a new object
    }
    return task;
  });
};
export function updateTaskByIdDeep(tasks, targetId, updates) {
  return tasks.map((task) => {
    const id = task._id || task.tempId || task.id;
    if (id === targetId) {
      return { ...task, ...updates };
    }
    if (task.children) {
      const updatedChildren = updateTaskByIdDeep(task.children, targetId, updates);
      if (updatedChildren !== task.children) {
        return { ...task, children: updatedChildren };
      }
    }
    return task;
  });
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

  // 🛠️ FIX: If nothing selected, but the top-level task is a card, return it
  if (!selected.length && task.properties?.card) {
    selected.push({
      ...task,
      id: task._id?.toString(),
      originalId: task._id?.toString(),
      assignmentId: `${task._id}-${Date.now()}-${Math.random()}`,
      assignmentAncestry: [task],
    });
  }

  return selected;
}

export function insertTaskById(tasks, parentId, taskToInsert) {
  return tasks.map((task) => {
    const id = task._id || task.tempId || task.id;

    if (id === parentId) {
      return {
        ...task,
        children: [...(task.children || []), taskToInsert],
      };
    }

    if (Array.isArray(task.children)) {
      const updatedChildren = insertTaskById(task.children, parentId, taskToInsert);
      if (updatedChildren !== task.children) {
        return {
          ...task,
          children: updatedChildren,
        };
      }
    }

    return task;
  });
}

export function diffTaskChildren(original = [], current = []) {
  const added = [];
  const updated = [];
  const deleted = [];

  const originalMap = new Map();
  original.forEach((child) => {
    const key = child._id || child.tempId || child.id;
    if (key) originalMap.set(key, child);
  });

  const currentMap = new Map();
  current.forEach((child) => {
    const key = child._id || child.tempId || child.id;
    currentMap.set(key, child);
    if (!originalMap.has(key)) {
      added.push(child);
    } else {
      const originalChild = originalMap.get(key);
      if (JSON.stringify(originalChild) !== JSON.stringify(child)) {
        updated.push({ id: key, updates: child });
      }
    }
  });

  originalMap.forEach((child, key) => {
    if (!currentMap.has(key)) {
      deleted.push(child);
    }
  });

  return { added, updated, deleted };
}

export function replaceTaskByTempId(tasks, tempId, newTask) {
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const taskTemp = task.tempId || task.id;

    if (taskTemp === tempId) {
      tasks[i] = newTask;
      return true;
    }

    if (Array.isArray(task.children)) {
      const replaced = replaceTaskByTempId(task.children, tempId, newTask);
      if (replaced) return true;
    }
  }
  return false;
}
export function buildScheduleAssignmentsFromTask(task) {
  const selected = getSelectedLeaves(task);

  // if (!selected.length) {
  //   console.warn("[buildScheduleAssignmentsFromTask] ❌ No valid leaf tasks found");
  // } else {
  //   console.log("[buildScheduleAssignmentsFromTask] ✅ selected:", selected.map(x => x.name));
  // }

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


export function updateTaskById(tasks, targetId, updates) {
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const id = task._id || task.tempId || task.id;
    if (id === targetId) {
      tasks[i] = { ...task, ...updates };
      return true;
    }
    if (task.children && updateTaskById(task.children, targetId, updates)) {
      return true;
    }
  }
  return false;
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

export const countValues = (assignments) => {
  const groupedValues = {};

  for (const slotTasks of Object.values(assignments)) {
    for (const task of slotTasks) {
      const ancestry = task.assignmentAncestry || [];
      const parentGrouping = ancestry.find(a => a.properties?.grouping?.enabled);

      if (parentGrouping) {
        const groupId = parentGrouping?._id?.toString() || task.originalId;

        if (!groupId) continue;
  
        if (!groupedValues[groupId]) {
          groupedValues[groupId] = {};
        }
  
        const input = task.values?.input;
        const childId = task.id;
  
        for (const [key, val] of Object.entries(input || {})) {
          if (typeof val === "object" && typeof val.value === "number") {
            if (!groupedValues[groupId][childId]) {
              groupedValues[groupId][childId] = {};
            }
  
            // Store full object with value and flow
            groupedValues[groupId][childId][key] = {
              value: (groupedValues[groupId][childId][key]?.value || 0) + val.value,
              flow: val.flow || "in" // fallback to "in" if missing
            };
  
            // // Optional total per unit (just sum)
            // if (!groupedValues[groupId]._total) {
            //   groupedValues[groupId]._total = {};
            // }
  
            // groupedValues[groupId]._total[key] = (groupedValues[groupId]._total[key] || 0) + val.value;
          }
        }
      } else {
        const value = task.values?.input;
        if (typeof value === "number") {

          groupedValues[task._id] = (groupedValues[task._id] || 0) + value;

          // // Optional total per unit (just sum)
          // if (!groupedValues[groupId]._total) {
          //   groupedValues[groupId]._total = {};
          // }

          // groupedValues[groupId]._total[key] = (groupedValues[groupId]._total[key] || 0) + val.value;
        }

      }
    }
  }

  return groupedValues;
};

export const countTasks = (assignments) => {
  const groupedCounts = {};

  for (const slotTasks of Object.values(assignments)) {
    for (const task of slotTasks) {
      const ancestry = task.assignmentAncestry || [];
      const parentGrouping = ancestry.find(a => a.properties?.grouping?.enabled);

      if (parentGrouping) {
        const groupId = parentGrouping?._id?.toString() || task.originalId;

        if (!groupId) continue;
  
        if (!groupedCounts[groupId]) {
          groupedCounts[groupId] = {};
        }
  
        const childId = task.id;
        const input = task.values?.input;
  
        for (const [key, val] of Object.entries(input || {})) {
          if (typeof val === "object" && typeof val.value === "number") {
            if (!groupedCounts[groupId][childId]) {
              groupedCounts[groupId][childId] = {};
            }
  
            groupedCounts[groupId][childId][key] = (groupedCounts[groupId][childId][key] || 0) + 1;
  
            if (!groupedCounts[groupId]._total) {
              groupedCounts[groupId]._total = {};
            }
  
            groupedCounts[groupId]._total[key] = (groupedCounts[groupId]._total[key] || 0) + 1;
          }
        }
      } else {
        groupedCounts[task._id] = (groupedCounts[task._id] || 0) + 1;
      }
    }
  }

  // console.log("✅ Nested countTasks:", groupedCounts);
  return groupedCounts;
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

export const getCompoundUnitKey = (task, child) => {
  if (!task.grouping || !task.unit) return null;
  const base = task.task_id?.toString?.() || task._id?.toString?.();
  return `${base}_${child}_${task.unit}`;
};