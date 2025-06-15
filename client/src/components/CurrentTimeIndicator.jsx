import React from "react";
import { useCurrentTime } from "../context/TimeProvider";

const SLOT_HEIGHT = 100; // px per 30min block
const START_HOUR = 0;   // Schedule starts at 7:00 AM

const CurrentTimeIndicator = () => {
  const now = useCurrentTime(); // 👈 using your custom hook
  const hours = now.hour;
  const minutes = now.minute;
  const totalMinutes = (hours * 60 + minutes) - (START_HOUR * 60);

  if (totalMinutes < 0 || totalMinutes > ((24 - START_HOUR) * 60)) {
    return null; // Outside the range
  }

  const offset = ((totalMinutes / 30) * SLOT_HEIGHT) + 88;

  return (
    <div
      className="current-time-indicator"
      style={{
        height: `${offset}px`,
      }}
    >
       <div className={"current-time-block"}>{now.toFormat("hh:mm:ss a")}</div>
    </div>
  );
};

export default React.memo(CurrentTimeIndicator);
