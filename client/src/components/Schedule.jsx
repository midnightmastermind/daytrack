import React from "react";
import { Card, CardList, Elevation, Button } from "@blueprintjs/core";
import { Droppable, Draggable } from "react-beautiful-dnd";

const ScheduleCard = ({ timeSlot, assignments, setAssignments, onAssignmentsChange }) => {
  const tasksForSlot = assignments[timeSlot] || [];

  const removeTask = (index) => {
    const updated = { ...assignments };
    const list = [...(updated[timeSlot] || [])];
    list.splice(index, 1);
    updated[timeSlot] = list;
    setAssignments(updated);
    onAssignmentsChange(updated); // ✅ Trigger goal progress + DB save
  };

  return (
    <Droppable droppableId={timeSlot}>
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
          <div>{timeSlot}</div>
          {tasksForSlot.map((task, index) => (
            <Draggable
              key={task.assignmentId}
              draggableId={task.assignmentId}
              index={index}
            >
              {(provided, snapshot) => (
                <div
                  className="assigned-task"
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    ...provided.draggableProps.style,
                  }}
                >
                  <div>{task.name}</div>
                  <Button
                    icon="cross"
                    minimal
                    onClick={() => removeTask(index)}
                  />
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </Card>
      )}
    </Droppable>
  );
};

const Schedule = ({ timeSlots, assignments, setAssignments, onAssignmentsChange }) => {
  return (
    <CardList className="schedule">
      {timeSlots.map((slot) => (
        <ScheduleCard
          key={slot}
          timeSlot={slot}
          assignments={assignments}
          setAssignments={setAssignments}
          onAssignmentsChange={onAssignmentsChange} // ✅ forward prop
        />
      ))}
    </CardList>
  );
};

export default Schedule;
