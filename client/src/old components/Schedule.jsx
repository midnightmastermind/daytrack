import React from "react";
import { Card, CardList, Elevation, Button } from "@blueprintjs/core";
import { useDrop } from "react-dnd";

const ItemTypes = { TASK: "task" };

const ScheduleCard = ({ timeSlot, assignments, setAssignments, setPlanDirty }) => {
  const tasksForSlot = assignments[timeSlot] || [];
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.TASK,
    drop: (item) => {
      console.log(`Dropped task "${item.name}" into timeslot "${timeSlot}"`);
      const newTask = { ...item, parent_id: null };
      setAssignments((prev) => {
        const currentTasks = prev[timeSlot] ? [...prev[timeSlot]] : [];
        // If a task with the same id already exists, replace it; otherwise, add it.
        const filteredTasks = currentTasks.filter((t) => t.id.toString() !== newTask.id.toString());
        const updated = { ...prev, [timeSlot]: [...filteredTasks, newTask] };
        console.log("Updated assignments after drop:", updated);
        return updated;
      });
      setPlanDirty(true);
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }));

  // Remove a task from the timeslot by index.
  const removeTask = (index) => {
    setAssignments((prev) => {
      const currentTasks = prev[timeSlot] ? [...prev[timeSlot]] : [];
      const updatedTasks = currentTasks.filter((_, i) => i !== index);
      const updated = { ...prev, [timeSlot]: updatedTasks };
      console.log("Updated assignments after removal:", updated);
      return updated;
    });
    setPlanDirty(true);
  };

  return (
    <Card
      ref={drop}
      elevation={Elevation.FOUR}
      interactive
      className="timeslot"
      style={{
        border: isOver ? "2px dashed #4caf50" : "2px solid #ccc",
        backgroundColor: isOver ? "#e0f7e0" : undefined,
      }}
    >
      <div>{timeSlot}</div>
      {tasksForSlot.map((assignedTask, idx) => (
        <div key={idx} className="assigned-task" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>{assignedTask.name}</div>
          <Button icon="cross" minimal onClick={() => removeTask(idx)} />
        </div>
      ))}
    </Card>
  );
};

const Schedule = ({ timeSlots, assignments, setAssignments, setPlanDirty }) => {
  return (
    <CardList className="schedule card-column">
      <div className="boundary-card">Wake Up</div>
      <div className="timeslot-container">
      {timeSlots.map((slot, index) => (
        <ScheduleCard 
          key={index}
          timeSlot={slot}
          assignments={assignments}
          setAssignments={setAssignments}
          setPlanDirty={setPlanDirty}
        />
      ))}
      </div>
      <div className="boundary-card">Sleep</div>
    </CardList>
  );
};

export default Schedule;