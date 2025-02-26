import React from "react";
import { Card, CardList, Elevation } from "@blueprintjs/core";
import { useDrop } from "react-dnd";

const ItemTypes = { TASK: "task" };

const ScheduleCard = ({ timeSlot, assignments, setAssignments, setPlanDirty }) => {
  const tasksForSlot = assignments[timeSlot] || [];
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.TASK,
    drop: (item) => {
      console.log(`Dropped task "${item.task}" into timeslot "${timeSlot}"`);
      const newTask = { task: item.task, id: item.id, properties: item.properties, parent_id: null };
      setAssignments((prev) => {
        const currentTasks = prev[timeSlot] ? [...prev[timeSlot]] : [];
        console.log("Current tasks for timeslot before drop:", currentTasks);
        const updated = { ...prev, [timeSlot]: [...currentTasks, newTask] };
        console.log("Updated assignments after drop:", updated);
        return updated;
      });
      setPlanDirty(true);
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }));

  return (
    <Card ref={drop} elevation={Elevation.FOUR} interactive className="timeslot" style={{
      border: isOver ? "2px dashed #4caf50" : "2px solid #ccc",
      backgroundColor: isOver ? "#e0f7e0" : undefined,
    }}>
      <div>{timeSlot}</div>
      {tasksForSlot.map((assignedTask, idx) => (
        <div key={idx} className="assigned-task">
          <div>{assignedTask.task}</div>
        </div>
      ))}
    </Card>
  );
};

const Schedule = ({ timeSlots, assignments, setAssignments, setPlanDirty }) => {
  return (
    <CardList className="card-column schedule">
      <div className={"boundary-card"}>Wake Up</div>
      {timeSlots.map((slot, index) => (
        <ScheduleCard
          key={index}
          timeSlot={slot}
          assignments={assignments}
          setAssignments={setAssignments}
          setPlanDirty={setPlanDirty}
        />
      ))}
      <div className={"boundary-card"}>Sleep</div>
    </CardList>
  );
};

export default Schedule;
