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
      <div className="tool-bar-datepicker">
        {/* Date Picker Popover */}
        <Popover
          content={
            <DatePicker3
              value={selectedDate}
              onChange={(newDate) => {
                console.log("DatePicker changed date to:", newDate);
                setSelectedDate(newDate);
              }}
            />
          }
          interactionKind="click"
        >
          <Button icon="calendar" minimal />
        </Popover>

        {/* Formatted Date */}
        <div style={{ fontSize: "12px", fontWeight: "bold" }}>
          {DateTime.fromJSDate(selectedDate).toFormat("M/d/yyyy")}
        </div>
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