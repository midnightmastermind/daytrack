import React from "react";
import { CardList, Button } from "@blueprintjs/core";
import { Droppable } from "react-beautiful-dnd";
import TaskCard from "./TaskCard";

const TaskBank = ({ tasks, onTaskUpdate, onEditTask, onOpenDrawer }) => {
  // Only display top-level tasks (properties.card true)
  const topLevelTasks = tasks.filter(
    (task) => task.properties && task.properties.card
  );

  return (
    <div className="task-bank-container">
      <div className="task-bank-header-container">
        <div className="task-bank-header">Task Bank</div>
        <Button icon="plus" text="New Task" minimal onClick={onOpenDrawer} />
      </div>
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
                onTaskUpdate={onTaskUpdate}
              />

            ))}
            {provided.placeholder}
          </CardList>
        )}
      </Droppable>
    </div>

  );
};

export default TaskBank;
