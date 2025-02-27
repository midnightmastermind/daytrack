import React from "react";
import { CardList } from "@blueprintjs/core";
import TaskCard from "./TaskCard";

const TaskBank = ({ tasks, onEditTask, onOpenDrawer }) => {
  // Only display top-level tasks (properties.card true)
  const topLevelTasks = tasks.filter(task => task.properties && task.properties.card);
  return (
    <CardList className="task-bank">
      {topLevelTasks.map((task, index) => (
        <TaskCard 
          key={task._id}
          task={task}
          index={index}
          onEditTask={onEditTask}
          onOpenDrawer={onOpenDrawer}
        />
      ))}
    </CardList>
  );
};

export default TaskBank;
