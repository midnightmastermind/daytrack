import React, { useMemo } from "react";
import { Card, Elevation, Tag, Button } from "@blueprintjs/core";
import { Droppable, Draggable } from "react-beautiful-dnd";
import { DateTime } from "luxon";
import { useCurrentCutoff } from "../context/TimeProvider"; // 👈 NOT useCurrentTime
import TaskTag from "./TaskTag";
const ScheduleCard = ({ tasks, label, timeSlot, onCopyToAgenda = null, assignments = {}, setAssignments, onAssignmentsChange, taskPreview = false, disableDrop }) => {
  const tasksForSlot = assignments[timeSlot] || [];
  const cutoff = useCurrentCutoff();

  const isPast = useMemo(() => {
    const slotStart = DateTime.fromFormat(timeSlot, "h:mm a");
    const slotEnd = slotStart.plus({ minutes: 30 });
    return slotEnd <= cutoff;
  }, [cutoff, timeSlot]);

  const removeTask = (index) => {
    const updated = { ...assignments };
    const updatedTasks = [...(updated[timeSlot] || [])];
    updatedTasks.splice(index, 1);
    updated[timeSlot] = updatedTasks;
    setAssignments(updated);
    onAssignmentsChange(updated);
  };
  return (
    <Droppable className={'droppable-container'} droppableId={`${label}_${timeSlot}`} ignoreContainerClipping={true} isDropDisabled={disableDrop}>
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
          <div className={`timeslot-title timeslot-title-${label}`}>
            <div>
              {timeSlot}
            </div>
            {typeof onCopyToAgenda === "function" && (
              <Button
                icon="arrow-right"
                minimal
                small
                title="Copy to Agenda"
                className="timeslot-button"
                onClick={() => onCopyToAgenda(timeSlot)}
              />
            )}
          </div>
          <div className="tag-container">
            {tasksForSlot.map((task, index) => (
              <Draggable
                key={`${taskPreview ? "preview-" : ""}${task.assignmentId}`}
                draggableId={`${taskPreview ? "preview-" : ""}${task.assignmentId}`}
                index={index}
              >
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className="tag-wrapper"
                  >
                    <TaskTag tasks={tasks} task={task} minimalValues={true} onRemove={() => removeTask(index)} />
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

export default React.memo(ScheduleCard);
