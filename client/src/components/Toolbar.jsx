import React from "react";
import { Navbar } from "@blueprintjs/core";
import appLogoPng from "../assets/app-logo-yinyang.png";
import PomodoroTimer from "./PomodoroTimer"; // adjust path if needed

const Toolbar = ({ selectedDate, setSelectedDate, planDirty, onSaveDayPlan }) => {
  return (
    <Navbar className="tool-bar">
      <div className="toolbar-left">
      {/* Left: Logo + Name */}
        <div className="app-logo-container">
          <img src={appLogoPng} alt="App Logo" className="app-logo" />
        </div>
        <div className="app-name">daytrack</div>
      </div>
      {/* Right: Pomodoro Timer */}
      <div className="toolbar-right">
        <PomodoroTimer />
        {/* Optional Save Button */}
        {/* <Button
          icon="floppy-disk"
          minimal
          disabled={!planDirty}
          onClick={onSaveDayPlan}
        /> */}
      </div>
    </Navbar>
  );
};

export default Toolbar;
