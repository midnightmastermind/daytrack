import React from "react";
import { CardList } from "@blueprintjs/core";
import TaskCard from "./TaskCard";

// Only display top-level tasks (where properties.card is true)
const TaskBank = ({ tasks, onEditTask, onOpenDrawer }) => {
  const topLevelTasks = tasks.filter(
    (task) => task.properties && task.properties.card
  );
  return (
    <CardList className="task-bank-container">
      <div className="task-bank-header">Task Bank</div>
      <div className="task-bank">
      {topLevelTasks.map((taskItem) => (
        <TaskCard 
          key={taskItem._id} 
          task={taskItem} 
          onEditTask={onEditTask} 
          onOpenDrawer={onOpenDrawer} 
        />
      ))}
      </div>
    </CardList>
  );
};

export default TaskBank;