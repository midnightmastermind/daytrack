import React from "react";
import { CardList, Button } from "@blueprintjs/core";
import { Droppable } from "react-beautiful-dnd";
import TaskCard from "./TaskCard";

const TaskBank = ({ tasks, onTaskUpdate, onEditTask, onNewTask, onInsertAdhoc, draggedTaskId }) => {

  const topLevelTasks = tasks
  .filter((task) => task.properties?.card)
  .sort((a, b) => (a.properties?.order ?? 0) - (b.properties?.order ?? 0));
  console.log(topLevelTasks);
  return (
    <div className="task-bank-container">
      <div className="task-bank-header-container">
        <div className="task-bank-header">Task Bank</div>
        <Button icon="plus" text="New Task" minimal onClick={onNewTask} />
      </div>
      <div className={'task-bank-scroll-wrapper'}>
        <Droppable className={'droppable-container'} droppableId="taskBank"  direction="vertical" ignoreContainerClipping={true}>
          {(provided) => (
            <CardList
              className="task-bank"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {(topLevelTasks && topLevelTasks.length > 0) ?
                topLevelTasks.map((task, index) => (
                  <TaskCard
                    key={task._id || task.tempId}
                    draggedTaskId={draggedTaskId}
                    task={task}
                    onInsertAdhoc={onInsertAdhoc}
                    index={index}
                    onEditTask={onEditTask}
                    onNewTask={onNewTask}
                    onTaskUpdate={onTaskUpdate}
                  />
                ))
                : <div className="empty-container">No tasks yet</div>
              }
              {provided.placeholder}
            </CardList>
          )}
        </Droppable>
      </div>
    </div>
  );
};

export default TaskBank;
