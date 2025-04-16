import React from "react";
import { DateTime } from "luxon";
import { useCurrentTime } from "../context/TimeProvider"

const LiveTime = () => {
  const time = useCurrentTime();

  return (
    <div className="live-time">
      {time.toFormat("hh:mm:ss a")}
    </div>
  );
};

export default React.memo(LiveTime);