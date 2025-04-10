import React from "react";
import { CardList, Button } from "@blueprintjs/core";
import { Droppable } from "react-beautiful-dnd";
import TaskCard from "./TaskCard";

const TaskBank = ({ tasks, onTaskUpdate, onEditTask, onOpenDrawer }) => {
  const topLevelTasks = tasks.filter((task) => task.properties?.card);

  return (
    <div className="task-bank-container">
      <div className="task-bank-header-container">
        <div className="task-bank-header">Task Bank</div>
        <Button icon="plus" text="New Task" minimal onClick={onOpenDrawer} />
      </div>
      <Droppable droppableId="taskBank" isDropDisabled>
        {(provided) => (
          <CardList
            className="task-bank"
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {topLevelTasks.map((task, index) => (
              <TaskCard
                key={task._id || task.tempId}
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
