import React from "react";
import { Navbar, Button, Popover } from "@blueprintjs/core";
import { DatePicker3 } from "@blueprintjs/datetime2";
import { DateTime } from "luxon";

const Toolbar = ({ selectedDate, setSelectedDate, planDirty, onSaveDayPlan }) => {
  return (
    <Navbar className="tool-bar">
      <Navbar.Group align="left" className="navbar-group">
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
        <div style={{ fontSize: "8px" }}>
          {DateTime.fromJSDate(selectedDate).toFormat("M/d/yyyy")}
        </div>
        <Button icon="floppy-disk" minimal disabled={!planDirty} onClick={onSaveDayPlan} />
      </Navbar.Group>
    </Navbar>
  );
};

export default Toolbar;
