import React from "react";
import { Card, Elevation, Tag, Button } from "@blueprintjs/core";
import { Droppable, Draggable } from "react-beautiful-dnd";
import { DateTime } from "luxon";
import useCurrentTime from "../hooks/useCurrentTime";

const ScheduleCard = ({ label, timeSlot, assignments = {}, setAssignments, onAssignmentsChange, taskPreview = false }) => {
  const tasksForSlot = assignments[timeSlot] || [];

  const removeTask = (index) => {
    const updated = { ...assignments };
    const updatedTasks = [...(updated[timeSlot] || [])];
    updatedTasks.splice(index, 1);
    updated[timeSlot] = updatedTasks;
    setAssignments(updated);
    onAssignmentsChange?.(updated);
  };

  const now = useCurrentTime(); // updates live

  const slotStart = DateTime.fromFormat(timeSlot, "h:mm a");
  const slotEnd = slotStart.plus({ minutes: 30 });
  const isPast = slotEnd <= now;

  return (
    <Droppable className={'droppable-container'} droppableId={`${label}_${timeSlot}`} ignoreContainerClipping={true}>
      {(provided, snapshot) => (
        <Card
          className={`timeslot${isPast ? " past" : ""}`}

          elevation={Elevation.FOUR}
          interactive
          ref={provided.innerRef}
          {...provided.droppableProps}
          style={{
            border: snapshot.isDraggingOver ? "2px dashed #4caf50" : "1px solid #30363D",
            backgroundColor: snapshot.isDraggingOver ? "#0E1115" : undefined,
          }}
        >
          <div className="timeslot-title">{timeSlot}</div>
          <div className="tag-container">
            {tasksForSlot.map((task, index) => (
              <Draggable key={`${(taskPreview ? 'preview-' : '')}${task.assignmentId}`} draggableId={`${(taskPreview ? 'preview-' : '')}${task.assignmentId}`} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className="tag-wrapper"
                  >
                    <Tag
                      minimal={false}
                      intent="primary"
                      className="task-tag"
                      rightIcon={
                        <Button
                          icon="cross"
                          minimal
                          small
                          onClick={() => removeTask(index)}
                        />
                      }
                    >
                      {task.name}
                    </Tag>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        </Card>
      )}
    </Droppable>
  );
};

export default ScheduleCard;
