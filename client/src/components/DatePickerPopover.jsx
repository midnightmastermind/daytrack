// components/DatePickerPopover.jsx
import React from "react";
import { Popover, Button } from "@blueprintjs/core";
import { DatePicker3 } from "@blueprintjs/datetime2";
import { DateTime } from "luxon";
import { enUS } from "date-fns/locale";

const DatePickerPopover = ({ selectedDate, setSelectedDate }) => {
  const formattedDate = DateTime.fromJSDate(selectedDate).toFormat("EEEE, LLLL d, yyyy");

  return (
    <div className="tool-bar-datepicker">
      <Popover
        content={
          <DatePicker3
            locale={enUS}
            value={selectedDate}
            onChange={(newDate) => {
              console.log("DatePicker changed date to:", newDate);
              setSelectedDate(newDate);
            }}
          />
        }
        interactionKind="click"
      >
        <Button icon="calendar" minimal text={formattedDate} />
      </Popover>
    </div>
  );
};

export default DatePickerPopover;
