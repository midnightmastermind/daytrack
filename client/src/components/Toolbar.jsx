import React from "react";
import { Navbar, Button, Popover } from "@blueprintjs/core";
import { DatePicker3 } from "@blueprintjs/datetime2";
import { DateTime } from "luxon";
import appLogo from "../assets/app-logo.svg?raw";

const Toolbar = ({ selectedDate, setSelectedDate, planDirty, onSaveDayPlan }) => {
  return (
    <Navbar className="tool-bar">
      {/* App Logo SVG */}
      <div className="app-logo-container">
        <div
          className="app-logo"
          dangerouslySetInnerHTML={{ __html: appLogo }}
        />
      </div>

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