export const getTaskDifferences = (oldAssignments, newAssignments) => {
  const added = [];
  const removed = [];

  const extractCheckboxTaskIds = (tasks = []) => {
    const result = [];

    const walk = (task) => {
      if (task.children?.length) {
        task.children.forEach(walk);
      } else if (task.properties?.checkbox && task.values?.checkbox) {
        result.push(task.id || task._id);
      }
    };

    for (const task of tasks) {
      // If no children, check top-level task itself
      if (!task.children?.length && task.properties?.checkbox && task.values?.checkbox) {
        result.push(task.id || task._id);
      }

      // Otherwise walk children
      if (task.children?.length) {
        task.children.forEach(walk);
      }
    }

    return result;
  };

  const flatten = (assignments = {}) =>
    Object.values(assignments)
      .flat()
      .flatMap((t) => extractCheckboxTaskIds([t]));

  const oldFlat = flatten(oldAssignments);
  const newFlat = flatten(newAssignments);

  const oldCount = oldFlat.reduce((acc, id) => {
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});
  const newCount = newFlat.reduce((acc, id) => {
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});

  const allIds = new Set([...Object.keys(oldCount), ...Object.keys(newCount)]);

  for (const id of allIds) {
    const diff = (newCount[id] || 0) - (oldCount[id] || 0);
    if (diff > 0) added.push({ id, count: diff });
    if (diff < 0) removed.push({ id, count: -diff });
  }

  return { added, removed };
};
