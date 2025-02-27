import React from "react";
import { Card, CardList, Elevation, Icon } from "@blueprintjs/core";

// Recursive function to render a task tree, filtering out children that have no selection.
const renderTaskTree = (task) => {
  // Determine if this is a leaf node that has a meaningful value.
  const isSelected =
    (task.properties?.checkbox && task.values?.checkbox) ||
    (task.properties?.input && task.values?.input.trim() !== "");

  // If this node is a container, recursively filter its children.
  let filteredChildren = [];
  if (task.children && task.children.length > 0) {
    filteredChildren = task.children
      .map(child => renderTaskTree(child))
      .filter(childJSX => childJSX !== null);
  }
  
  // If this task is a container, render it only if it has any selected children.
  if (task.properties?.category) {
    if (filteredChildren.length === 0) {
      return null;
    }
    return (
      <div className="display-task" key={task._id || task.id} style={{ marginLeft: "10px" }}>
        <div className="display-task-name" style={{ fontWeight: "bold" }}>
          {task.name}
        </div>
        <div className="display-task-children">
          {filteredChildren}
        </div>
      </div>
    );
  } else {
    // For leaf nodes, render only if selected.
    if (!isSelected) return null;
    return (
      <div className="display-task" key={task._id || task.id} style={{ marginLeft: "10px", fontSize: "12px" }}>
        <span className="display-task-name">{task.name}</span>
        {task.properties?.checkbox && (
          <Icon icon={task.values?.checkbox ? "tick" : "cross"} style={{ marginLeft: "5px" }} />
        )}
        {task.properties?.input && (
          <span className="display-task-input" style={{ marginLeft: "5px" }}>
            {task.values?.input}
          </span>
        )}
      </div>
    );
  }
};

const TaskDisplay = ({ timeSlots, assignments }) => {
  return (
    <CardList className="display">
      {timeSlots.map((timeSlot) => {
        const tasksForSlot = assignments[timeSlot] || [];
        // For each timeslot, filter tasks that have any selected values
        const filteredTasks = tasksForSlot.map((task) => renderTaskTree(task)).filter(task => task !== null);
        if (filteredTasks.length === 0) return null;
        return (
          <Card key={timeSlot} elevation={Elevation.FOUR} className="display-card">
            <div className="timeslot">
              <strong>{timeSlot}</strong>
            </div>
            {filteredTasks.map((taskJSX, j) => (
              <div key={j} className="task-option">
                {taskJSX}
              </div>
            ))}
          </Card>
        );
      })}
    </CardList>
  );
};

export default TaskDisplay;