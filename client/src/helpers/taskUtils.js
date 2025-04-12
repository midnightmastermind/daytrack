import { v4 as uuidv4 } from "uuid";

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
  console.log("[getSelectedLeaf] called with:", task);

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

    const isValid =
      (node.properties?.checkbox && node.values?.checkbox === true) ||
      (node.properties?.input && node.values?.input?.trim?.().length > 0);

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

  if (!selected && fallback) {
    console.warn("[getSelectedLeaf] ⚠️ no valid leaf found, using fallback:", fallback.name);
    return fallback;
  }

  if (!selected) {
    console.warn("[getSelectedLeaf] ❌ no valid leaf OR fallback found");
    return task; // fallback to parent
  }

  console.log("[getSelectedLeaf] ✅ found:", selected.name);
  return selected;
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

    const isValid =
      (node.properties?.checkbox && node.values?.checkbox === true) ||
      (node.properties?.input && node.values?.input?.trim?.().length > 0);

    const isLeaf = !node.children || node.children.length === 0;

    if (isLeaf && isValid) {
      selected.push({
        ...node,
        assignmentAncestry: nextAncestry,
        assignmentId: node._id || node.tempId || node.id || uuidv4(),
      });
    }

    if (node.children) {
      node.children.forEach((child) => walk(child, nextAncestry));
    }
  }

  walk(task);

  if (!selected.length) {
    console.warn("[getSelectedLeaves] ❌ no valid leaves found");
  } else {
    console.log("[getSelectedLeaves] ✅ found:", selected.map(x => x.name));
  }

  return selected;
}


export function buildScheduleAssignmentsFromTask(task) {
  const selected = getSelectedLeaves(task);

  return selected.map((leaf) => ({
    ...leaf,
    id: leaf._id?.toString() || leaf.tempId || leaf.id,
    originalId: leaf._id?.toString() || leaf.tempId || leaf.id,
    assignmentId: `${leaf._id || leaf.tempId || uuidv4()}-${Date.now()}-${Math.random()}`,
    assignmentAncestry: leaf.assignmentAncestry || [],
  }));
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
      const id = task.originalId;
      if (id) countMap[id] = (countMap[id] || 0) + 1;
    }
  }
  return countMap;
};
