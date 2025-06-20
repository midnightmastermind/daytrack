// components/PomodoroTimer.jsx
import React from "react";
import { Button } from "@blueprintjs/core";
import { usePomodoro } from "../helpers/usePomodoro"; // Adjust path if needed

const PomodoroTimer = () => {
  const {
    mode,
    secondsLeft,
    startFocus,
    reset,
    isRunning,
    soundEnabled,
    setSoundEnabled,
  } = usePomodoro();

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="pomodoro-widget">
      <span role="img" aria-label="tomato">🍅</span>

      {!isRunning ? (
        <Button icon="play" minimal onClick={startFocus} />
      ) : (
        <Button icon="reset" minimal onClick={reset} />
      )}

      <div className="pomodoro-time">
        {minutes}:{seconds}
      </div>

      <Button
        icon={soundEnabled ? "volume-up" : "volume-off"}
        minimal
        onClick={() => setSoundEnabled((prev) => !prev)}
        title={soundEnabled ? "Mute Pomodoro Sounds" : "Enable Pomodoro Sounds"}
      />
    </div>
  );
};

export default PomodoroTimer;
