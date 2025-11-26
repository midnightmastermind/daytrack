import React from "react";
import { Tag } from "@blueprintjs/core";
import Section from "../../components/Section";
import Input from "../../components/Input";

const GoalUnitEditor = ({ unit, unitState, updateUnit }) => {
  if (!unit) return null;

  return (
    <Section label={``}>
      <div style={{width: "auto", width: "125px", gap: "5px", display: "flex", flexDirection: "column"}}>
        <Tag intent="primary" style={{fontSize: "16px"}}>{unit.name}</Tag>
        <Input
          type="switch"
          innerLabel="Disabled"
          innerLabelChecked="Enabled"
          value={unitState.enabled}
          onChange={(val) => updateUnit("enabled", val)}
        />
      </div>

      <Input
        type="select"
        label="Flow"
        disabled={!unitState.enabled}
        value={unitState.flow}
        onChange={(val) => updateUnit("flow", val)}
        options={[
          { label: "Any", value: "any" },
          { label: "In", value: "in" },
          { label: "Out", value: "out" },
        ]}
      />

      {/* <Input
        type="select"
        label="Time Scale"
        value={unitState.timeScale}
        onChange={(val) => updateUnit("timeScale", val)}
        options={[
          { label: "Daily", value: "daily" },
          { label: "Weekly", value: "weekly" },
          { label: "Monthly", value: "monthly" },
          { label: "Overall", value: "overall" },
        ]}
      />

       <Input
        type="number"
        label="Starting"
        value={unitState.starting}
        onChange={(val) => updateUnit("starting", val)}
      /> */}

      <Input
        type="switch"
        disabled={!unitState.enabled}
        innerLabelChecked="Use Input"
        innerLabel="Use Count"
        value={unitState.useInput}
        onChange={(val) => updateUnit("useInput", val)}
      />

      {/* <Input
        type="switch"
        label="Replaceable"
        value={unitState.replaceable}
        onChange={(val) => updateUnit("replaceable", val)}
      />

      {unit.type !== "text" && (
        <>
          <Input
            type="switch"
            label="Has Target"
            value={unitState.hasTarget}
            onChange={(val) => updateUnit("hasTarget", val)}
          />

          {unitState.hasTarget && (
            <Section label="Target Condition">
              <Input
                type="select"
                label="Operator"
                value={unitState.operator}
                onChange={(val) => updateUnit("operator", val)}
                options={[
                  { label: "=", value: "=" },
                  { label: ">", value: ">" },
                  { label: "<", value: "<" },
                ]}
              />
              <Input
                type="number"
                label="Target"
                value={unitState.target}
                onChange={(val) => updateUnit("target", val)}
              />
            </Section>
          )}
        </> 
      )}*/}
    </Section>
  );
};

export default GoalUnitEditor;
