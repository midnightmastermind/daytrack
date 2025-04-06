
import React from "react";
import { Card, CardList, Elevation, Button, Tag } from "@blueprintjs/core";
import { Droppable, Draggable } from "react-beautiful-dnd";

const ScheduleCard = ({ label, timeSlot, assignments, setAssignments, onAssignmentsChange }) => {
  const tasksForSlot = assignments[timeSlot] || [];

  const removeTask = (index) => {
    const updated = { ...assignments };
    const list = [...(updated[timeSlot] || [])];
    list.splice(index, 1);
    updated[timeSlot] = list;
    setAssignments(updated);
    onAssignmentsChange(updated);
  };

  const getSelectedLeaf = (task) => {
    if (
      (!task.children || task.children.length === 0) &&
      ((task.properties?.checkbox && task.values?.checkbox) ||
        (task.properties?.input && task.values?.input?.trim() !== ""))
    ) {
      return task;
    }

    for (let i = 0; i < (task.children || []).length; i++) {
      const result = getSelectedLeaf(task.children[i]);
      if (result) return result;
    }

    return null;
  };
  return (
    <Droppable droppableId={`${label.toLowerCase()}_${timeSlot}`}>
      {(provided, snapshot) => (
        <Card
          className="timeslot"
          elevation={Elevation.FOUR}
          interactive
          ref={provided.innerRef}
          {...provided.droppableProps}
          style={{
            border: snapshot.isDraggingOver
              ? "2px dashed #4caf50"
              : "1px solid #30363D",
            backgroundColor: snapshot.isDraggingOver ? "#0E1115" : undefined,
          }}
        >
          <div className="timeslot-title-container"><div className="timeslot-title">{timeSlot}</div></div>
          <div className="tag-container">
            {tasksForSlot.map((task, index) => {
              const leaf = getSelectedLeaf(task);
              return (
                <Draggable
                  key={task.assignmentId}
                  draggableId={task.assignmentId}
                  index={index}
                >
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
                        {task.properties?.input
                          ? `${task.name}: ${task.values?.input}`
                          : task.name}
                      </Tag>

                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        </Card>
      )}
    </Droppable>
  );
};

const Schedule = ({ label, timeSlots, assignments, setAssignments, onAssignmentsChange }) => {
  return (
    <CardList className={`schedule ${label}-schedule-container`}>
      {timeSlots.map((slot) => (
        <ScheduleCard
          label={`${label === 'Plan' ? 'preview' : 'actual'}`}
          key={slot}
          timeSlot={slot}
          assignments={assignments}
          setAssignments={setAssignments}
          onAssignmentsChange={onAssignmentsChange}
        />
      ))}
    </CardList>
  );
};

export default Schedule;
