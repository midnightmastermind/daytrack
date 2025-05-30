import React from "react";
import { Card, CardList, Elevation } from "@blueprintjs/core";
import TaskTag from "./TaskTag";

const TaskDisplay = ({ timeSlots = [], assignments = {} }) => {
  return (
    <div className="display-container">
      <div className="display-header">Completed Tasks</div>
      <CardList className="display">
        {(timeSlots && timeSlots.length > 0) ? (
          timeSlots.map((timeSlot) => {
            const tasksForSlot = assignments[timeSlot] || [];
            if (tasksForSlot.length === 0) return null;

            return (
              <Card key={timeSlot} elevation={Elevation.FOUR} className="display-card">
                <div className="timeslot">
                  <strong>{timeSlot}</strong>
                </div>
                <div className="task-tags-completed">
                  {tasksForSlot.map((task, index) => (
                    <TaskTag
                      key={task.assignmentId || `${task.id}-${timeSlot}-${index}`}
                      task={task}
                      showAncestry
                      minimalValues={true}
                      className="task-tag-completed"
                    />
                  ))}
                </div>
              </Card>
            );
          })
        ) : (
          <div className="empty-container">No tasks completed</div>
        )}
      </CardList>
    </div>
  );
};

export default TaskDisplay;
