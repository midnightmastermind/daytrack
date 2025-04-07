import React, { useState, useEffect } from "react";
import { DateTime } from "luxon";

const LiveTime = () => {
  const [currentTime, setCurrentTime] = useState(DateTime.local().toFormat("HH:mm:ss"));

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(DateTime.local().toFormat("HH:mm:ss"));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const currentDate = DateTime.local().toFormat("M/d/yyyy");

  return (
    <div className="live-time">
      current time: {currentDate} {currentTime}
    </div>
  );
};

export default React.memo(LiveTime);