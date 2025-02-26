import React from "react";
import { CardList } from "@blueprintjs/core";
import TaskCard from "./TaskCard";

const TaskBank = ({ tasks, onEditTask, onOpenDrawer }) => {
    console.log(tasks);
  // Only display tasks where properties.card is true (top-level tasks)
  const topLevelTasks = tasks.filter(
    (task) => task.properties && task.properties.card
  );

  console.log(topLevelTasks);
  return (
    <CardList className="card-column task-bank">
      {topLevelTasks.map((taskItem) => (
        <TaskCard 
          key={taskItem._id} 
          task={taskItem} 
          onEditTask={onEditTask} 
          onOpenDrawer={onOpenDrawer} 
        />
      ))}
    </CardList>
  );
};

export default TaskBank;