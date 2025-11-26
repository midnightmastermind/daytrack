import React from "react";
import { Button } from "@blueprintjs/core";
import Section from "../../components/Section";
import Input from "../../components/Input";

const CountdownEditor = ({ countdown, index, updateCountdown, removeCountdown }) => {
  if (!countdown) return null;

  return (
    <Section label={`Countdown #${index + 1}`}>
      <Input
        type="text"
        label="Countdown Name"
        value={countdown.name}
        onChange={(val) => updateCountdown(index, "name", val)}
      />

      <Input
        type="date"
        label="Target Date"
        value={countdown.date}
        onChange={(val) => updateCountdown(index, "date", val)}
      />

      <Button
        className="countdown-delete"
        icon="cross"
        minimal
        onClick={() => removeCountdown(index)}
      />
    </Section>
  );
};

export default CountdownEditor;
