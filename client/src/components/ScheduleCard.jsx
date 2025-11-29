import React, { useMemo } from "react";
import { Card, Elevation, Button } from "@blueprintjs/core";
import { DateTime } from "luxon";
import { useCurrentCutoff } from "../context/TimeProvider";
import TaskTag from "./TaskTag";

import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Small sortable wrapper for each chip
function SortableTaskTag({ task, index, tasks, onRemove, disabled }) {
  const id = task.assignmentId.toString();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id,
    disabled
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="tag-wrapper"
    >
      <TaskTag
        tasks={tasks}
        task={task}
        minimalValues={true}
        onRemove={onRemove}
        dragProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

const ScheduleCard = ({
  tasks,
  label,
  timeSlot,
  onCopyToAgenda = null,
  onCopyFromAgenda = null,
  assignments = {},
  setAssignments,
  onAssignmentsChange,
  taskPreview = false,
  disableDrop
}) => {

  const tasksForSlot = assignments[timeSlot] || [];
  const cutoff = useCurrentCutoff();

  const isPast = useMemo(() => {
    const slotStart = DateTime.fromFormat(timeSlot, "h:mm a");
    const slotEnd = slotStart.plus({ minutes: 30 });
    return slotEnd <= cutoff;
  }, [cutoff, timeSlot]);

  const hasTempTasks = useMemo(
    () => tasksForSlot.some((task) => task.properties?.temp),
    [tasksForSlot]
  );

  const removeTask = (index) => {
    const updated = { ...assignments };
    const updatedTasks = [...(updated[timeSlot] || [])];
    updatedTasks.splice(index, 1);
    updated[timeSlot] = updatedTasks;
    setAssignments(updated);
    onAssignmentsChange(updated);
  };

  // --- dnd-kit Droppable ---
  const droppableId = `${label}_${timeSlot}`;
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    disabled: disableDrop
  });

  return (
    <Card
      className={`timeslot${isPast ? " past" : ""}`}
      elevation={Elevation.FOUR}
      interactive
      ref={setNodeRef}
      style={{
        border: isOver ? "2px dashed #4caf50" : "1px solid #30363D",
        backgroundColor: isOver ? "#0E1115" : undefined,
      }}
    >
      <div className={`timeslot-title timeslot-title-${label}`}>
        <div>{timeSlot}</div>
        <div style={{ display: "flex", gap: "4px" }}>
          {typeof onCopyFromAgenda === "function" && (
            <Button
              icon="arrow-left"
              minimal
              small
              title="Copy from Agenda"
              className="timeslot-button"
              onClick={() => onCopyFromAgenda(timeSlot)}
              disabled={hasTempTasks}
            />
          )}

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
      </div>

      <div className="tag-container">
        {tasksForSlot.map((task, index) => (
          <SortableTaskTag
            key={`${taskPreview ? "preview-" : ""}${task.assignmentId}`}
            task={task}
            index={index}
            tasks={tasks}
            onRemove={() => removeTask(index)}
            disabled={task.properties?.temp === true}
          />
        ))}
      </div>
    </Card>
  );
};

export default React.memo(ScheduleCard);
