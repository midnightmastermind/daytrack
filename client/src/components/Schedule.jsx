// Schedule.jsx
import React, { useMemo } from "react";
import { CardList } from "@blueprintjs/core";
import ScheduleCard from "./ScheduleCard";
import CurrentTimeIndicator from "./CurrentTimeIndicator";

const Schedule = ({
  label,
  timeSlots,
  assignments,
  setAssignments,
  onAssignmentsChange,
  onCopyToAgenda = null, 
  disableDrop
}) => {
  const memoizedCards = useMemo(() => (
    timeSlots.map((slot) => (
      <ScheduleCard
        disableDrop={disableDrop}
        key={slot}
        label={label === "Plan" ? "preview" : "actual"}
        timeSlot={slot}
        assignments={assignments}
        setAssignments={setAssignments}
        onAssignmentsChange={onAssignmentsChange}
        onCopyToAgenda={onCopyToAgenda}
      />
    ))
  ), [timeSlots, assignments, setAssignments, onAssignmentsChange]);
  
  return (
    <CardList className={`schedule ${label}-schedule-container`}>
      <CurrentTimeIndicator />
      {memoizedCards}
    </CardList>
  );
};

export default Schedule;
