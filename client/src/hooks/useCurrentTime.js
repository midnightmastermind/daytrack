// hooks/useCurrentTime.js
import { useState, useEffect } from "react";
import { DateTime } from "luxon";

const useCurrentTime = () => {
  const [time, setTime] = useState(DateTime.local());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(DateTime.local());
    }, 1000); // update every second

    return () => clearInterval(interval);
  }, []);

  return time;
};

export default useCurrentTime;