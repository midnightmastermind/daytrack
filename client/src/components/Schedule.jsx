// Schedule.jsx
import React from "react";
import { CardList } from "@blueprintjs/core";
import ScheduleCard from "./ScheduleCard";

const Schedule = ({
  label,
  timeSlots,
  assignments,
  setAssignments,
  onAssignmentsChange,
}) => {
  return (
    <CardList className={`schedule ${label}-schedule-container`}>
      {timeSlots.map((slot) => (
        <ScheduleCard
          key={slot}
          label={label === "Plan" ? "preview" : "actual"}
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
