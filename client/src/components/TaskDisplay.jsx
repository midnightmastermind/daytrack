import React from "react";
import { Card, CardList, Elevation } from "@blueprintjs/core";

const TaskDisplay = ({ timeSlots, assignments }) => {
  return (
    <CardList className="display">
      {timeSlots.map((timeSlot) => {
        const tasksForSlot = assignments[timeSlot] || [];
        if (tasksForSlot.length === 0) return null;
        return (
          <Card key={timeSlot} elevation={Elevation.FOUR} className="display-card">
            <div className="timeslot">
              <strong>{timeSlot}</strong>
            </div>
            {tasksForSlot.map((assignedTask, j) => (
              <div key={j} className="task-option">
                • {assignedTask.task}
              </div>
            ))}
          </Card>
        );
      })}
    </CardList>
  );
};

export default TaskDisplay;
