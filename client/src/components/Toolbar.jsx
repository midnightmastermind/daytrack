import React from "react";
import { Navbar, Button, Popover } from "@blueprintjs/core";
import { DatePicker3 } from "@blueprintjs/datetime2";
import { DateTime } from "luxon";
import appLogoPng from "../assets/app-logo-yinyang.png";

const Toolbar = ({ selectedDate, setSelectedDate, planDirty, onSaveDayPlan }) => {
  return (
    <Navbar className="tool-bar">
      {/* App Logo PNG */}
      <div className="app-logo-container">
        <img src={appLogoPng} alt="App Logo" className="app-logo" />
      </div>
      <div className="app-name">daytrack</div>
      {/* Save Button
        <Button
          icon="floppy-disk"
          minimal
          disabled={!planDirty}
          onClick={onSaveDayPlan}
        /> */}
    </Navbar>
  );
};

export default Toolbar;