import React from "react";
import { Button } from "@blueprintjs/core";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SortableTaskCard from "./SortableTaskCard";

const TaskBank = ({
  tasks,
  onTaskUpdate,
  onEditTask,
  onNewTask,
  onInsertAdhoc,
  draggedTaskId,
}) => {

  const topLevelTasks = tasks
    .filter((task) => task.properties?.card)
    .sort((a, b) => Number(a.properties?.order ?? 0) - Number(b.properties?.order ?? 0));

  const ids = topLevelTasks.map(t => t._id || t.tempId);

  const { setNodeRef } = useDroppable({ id: "taskBank" });

  return (
    <div className="task-bank-container">
      <div className="task-bank-header-container">
        <div className="task-bank-header">Task Bank</div>
        <Button icon="plus" text="New Task" minimal onClick={onNewTask} />
      </div>

      <div className="task-bank-scroll-wrapper">
        <div className="task-bank" ref={setNodeRef}>

          {/* 🔥 THIS FIXES THE JUMPING */}
          <SortableContext
            items={ids}
            strategy={verticalListSortingStrategy}
          >
            {topLevelTasks.map((task, index) => (
              <SortableTaskCard
                key={task._id || task.tempId}
                id={task._id || task.tempId}
                task={task}
                index={index}
                draggedTaskId={draggedTaskId}
                onInsertAdhoc={onInsertAdhoc}
                onEditTask={onEditTask}
                onNewTask={onNewTask}
                onTaskUpdate={onTaskUpdate}
              />
            ))}
          </SortableContext>

        </div>
      </div>
    </div>
  );
};

export default TaskBank;
