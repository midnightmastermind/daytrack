// TimeProvider.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { DateTime } from "luxon";

// Helper: round to nearest cutoff
const getCurrentCutoff = () => {
  const now = DateTime.local();
  const minutes = now.minute < 30 ? 0 : 30;
  return now.set({ minute: minutes, second: 0, millisecond: 0 });
};

// CONTEXTS
const TimeContext = createContext(DateTime.local());
const CutoffContext = createContext(getCurrentCutoff());

// PROVIDER
export const TimeProvider = ({ children }) => {
  const [now, setNow] = useState(DateTime.local());
  const [cutoff, setCutoff] = useState(getCurrentCutoff());

  useEffect(() => {
    const interval = setInterval(() => {
      const newNow = DateTime.local();
      setNow(newNow);

      const newCutoff = getCurrentCutoff();
      setCutoff((prev) =>
        newCutoff.toISO() !== prev.toISO() ? newCutoff : prev
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <TimeContext.Provider value={now}>
      <CutoffContext.Provider value={cutoff}>
        {children}
      </CutoffContext.Provider>
    </TimeContext.Provider>
  );
};

// HOOKS
export const useCurrentTime = () => useContext(TimeContext);
export const useCurrentCutoff = () => useContext(CutoffContext);
