import React from "react";
import { CardList } from "@blueprintjs/core";
import { Droppable } from "react-beautiful-dnd";
import TaskCard from "./TaskCard";

const TaskBank = ({ tasks, onEditTask, onOpenDrawer }) => {
  // Only display top-level tasks (properties.card true)
  const topLevelTasks = tasks.filter(
    (task) => task.properties && task.properties.card
  );
  
  return (
    <Droppable droppableId="taskBank" isDropDisabled={true}>
      {(provided) => (
        <CardList
          className="task-bank"
          ref={provided.innerRef}
          {...provided.droppableProps}
        >
          {topLevelTasks.map((task, index) => (
            <TaskCard
              key={task._id}
              task={task}
              index={index}
              onEditTask={onEditTask}
              onOpenDrawer={onOpenDrawer}
            />
          ))}
          {provided.placeholder}
        </CardList>
      )}
    </Droppable>
  );
};

export default TaskBank;
