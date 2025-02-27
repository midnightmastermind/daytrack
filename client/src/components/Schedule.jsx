import React from "react";
import { Card, CardList, Elevation, Button } from "@blueprintjs/core";
import { Droppable, Draggable } from "react-beautiful-dnd";

const ScheduleCard = ({ timeSlot, assignments, setAssignments, setPlanDirty }) => {
  const tasksForSlot = assignments[timeSlot] || [];
  
  const removeTask = (index) => {
    setAssignments(prev => {
      const currentTasks = prev[timeSlot] ? [...prev[timeSlot]] : [];
      const updatedTasks = currentTasks.filter((_, i) => i !== index);
      return { ...prev, [timeSlot]: updatedTasks };
    });
    setPlanDirty(true);
  };

  return (
    <Droppable droppableId={timeSlot}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.droppableProps}
          elevation={Elevation.FOUR}
          interactive
          className="timeslot"
          style={{
            border: snapshot.isDraggingOver ? "2px dashed #4caf50" : "1px solid #30363D",
            backgroundColor: snapshot.isDraggingOver ? "#0E1115" : undefined
          }}
        >
          <div>{timeSlot}</div>
          {tasksForSlot.map((assignedTask, idx) => (
            <Draggable key={assignedTask.assignmentId} draggableId={assignedTask.assignmentId} index={idx}>
            {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className="assigned-task"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    ...provided.draggableProps.style
                  }}
                >
                  <div>{assignedTask.name}</div>
                  <Button icon="cross" minimal onClick={() => removeTask(idx)} />
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

const Schedule = ({ timeSlots, assignments, setAssignments, setPlanDirty }) => {
  return (
    <CardList className="schedule">
      {timeSlots.map((slot, index) => (
        <ScheduleCard 
          key={slot}
          timeSlot={slot}
          assignments={assignments}
          setAssignments={setAssignments}
          setPlanDirty={setPlanDirty}
        />
      ))}
    </CardList>
  );
};

export default Schedule;