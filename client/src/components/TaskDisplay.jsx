import React from "react";
import { Card, CardList, Elevation, Icon } from "@blueprintjs/core";

const renderTaskTree = (task, isTopLevel = false) => {
  // For leaf nodes, "selected" means:
  // - if it's a checkbox, its value is true, or
  // - if it's an input, its value is non-empty.
  const isLeafSelected =
    (task.properties?.checkbox && task.values?.checkbox) ||
    (task.properties?.input && task.values?.input.trim() !== "");

  let renderedChildren = [];
  if (task.children && task.children.length > 0) {
    renderedChildren = task.children
      .map(child => renderTaskTree(child))
      .filter(childJSX => childJSX !== null);
  }

  // If the node is marked as a category and it's not top-level,
  // then only render if it has at least one child.
  if (task.properties?.category && !isTopLevel) {
    if (renderedChildren.length === 0) return null;
    return (
      <div key={task._id || task.id} className="display-task category" style={{ marginLeft: "10px" }}>
        <div className="display-task-name" style={{ fontWeight: "bold" }}>
          {task.name}
        </div>
        <div className="display-task-children">
          {renderedChildren}
        </div>
      </div>
    );
  }

  // For top-level tasks or leaf nodes:
  if (task.properties?.card || task.properties?.category) {
    // Top-level tasks should always be rendered
    return (
      <div key={task._id || task.id} className="display-task" style={{ marginLeft: "10px" }}>
        <div className="display-task-name" style={{ fontWeight: isTopLevel ? "bold" : "normal" }}>
          {task.name}
        </div>
        {renderedChildren.length > 0 && (
          <div className="display-task-children">
            {renderedChildren}
          </div>
        )}
      </div>
    );
  } else {
    // For a leaf node that isn't top-level, only render if selected.
    if (!isLeafSelected) return null;
    return (
      <div key={task._id || task.id} className="display-task leaf" style={{ marginLeft: "10px", fontSize: "12px" }}>
        <span className="display-task-name">{task.name}</span>
        {task.properties?.checkbox && task.values?.checkbox && (
          <Icon icon="tick" style={{ marginLeft: "5px" }} />
        )}
        {task.properties?.input && task.values?.input && (
          <span className="display-task-input" style={{ marginLeft: "5px" }}>
            {task.values.input}
          </span>
        )}
      </div>
    );
  }
};

const TaskDisplay = ({ timeSlots = [], assignments = {} }) => {
  return (
    <div className="display-container">
      <div className="display-header">
        Completed Tasks
      </div>
      <CardList className="display">
        {timeSlots.map((timeSlot) => {
          const tasksForSlot = assignments[timeSlot] || [];
          const renderedTasks = tasksForSlot
            .map(task => renderTaskTree(task, task.properties?.card))
            .filter(taskJSX => taskJSX !== null);
          if (renderedTasks.length === 0) return null;
          return (
            <Card key={timeSlot} elevation={Elevation.FOUR} className="display-card">
              <div className="timeslot">
                <strong>{timeSlot}</strong>
              </div>
              {renderedTasks.map((taskJSX, idx) => (
                <div key={idx} className="task-option">
                  {taskJSX}
                </div>
              ))}
            </Card>
          );
        })}
      </CardList>
    </div>
  );
};

export default TaskDisplay;
