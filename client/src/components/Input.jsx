import React from "react";
import {
  InputGroup,
  Switch,
  HTMLSelect,
  NumericInput,
  TextArea,
} from "@blueprintjs/core";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const Input = ({
  type = "text",
  label,
  value,
  onChange,
  options = [],
  placeholder = "",
  innerLabel = "",
  innerLabelChecked = "",
  className = "",
  disabled = false
}) => {
  const handleChange = (e) => {
    if (type === "switch") {
      onChange?.(e.target.checked);
    } else {
      onChange?.(e.target.value);
    }
  };

  return (
    <div className={`form-field ${className}`}>
      {label && type !== "switch" && <label>{label}</label>}

      {type === "text" && (
        <InputGroup
          disabled={disabled}
          value={value || ""}
          onChange={handleChange}
          placeholder={placeholder}
        />
      )}

      {type === "textarea" && (
        <TextArea
          disabled={disabled}
          value={value || ""}
          onChange={handleChange}
          placeholder={placeholder}
          fill
          growVertically
        />
      )}

      {type === "number" && (
        <NumericInput
          disabled={disabled}
          value={value || 0}
          onValueChange={(val) => onChange?.(val)}
          placeholder={placeholder}
          fill
        />
      )}

      {type === "select" && (
        <HTMLSelect
          disabled={disabled}
          value={value}
          onChange={handleChange}
          options={options}
        />
      )}

      {type === "switch" && (
        <Switch
          disabled={disabled}
          checked={!!value}
          onChange={handleChange}
          label={label}
          innerLabel={innerLabel}
          innerLabelChecked={innerLabelChecked}
        />
      )}

      {type === "date" && (
        <DatePicker
          disabled={disabled}
          selected={value ? new Date(value) : null}
          onChange={(date) => onChange?.(date)}
        />
      )}
    </div>
  );
};

export default Input;
