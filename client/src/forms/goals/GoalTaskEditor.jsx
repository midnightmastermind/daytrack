import React from "react";
import { Tag, Button } from "@blueprintjs/core";
import GoalUnitEditor from "./GoalUnitEditor";
import Section from "../../components/Section";
import Input from "../../components/Input";

const GoalTaskEditor = ({ onDelete, task, updateTask }) => {
  const isGrouped = task.grouping && Array.isArray(task.units);
  const useGroup = !!task.useGroup || task.useGroup == undefined;
  console.log(useGroup);
  console.log(task);
  console.log(task);
  return (
    <div className="goal-task-editor">
      <div className="goal-task-header">

        <div className="goal-tags">
          {(task.path || []).map((segment, i) => (
            <Tag
              key={`${task.task_id}-seg-${i}`}
              intent={i === task.path.length - 1 ? "primary" : undefined}
            >
              {segment}
            </Tag>
          ))}
        </div>
        {onDelete && (
          <Button
            icon="trash"
            minimal
            intent="danger"
            onClick={onDelete}
            title="Remove Task"
          />
        )}
        </div>
      {isGrouped && (
          <Input
            type="switch"
            value={useGroup}
            onChange={(val) => updateTask("useGroup", val)}
            innerLabel="Use Task"
            innerLabelChecked="Use Group"
            className="group-switch"
          />
      )}

      {!useGroup && (
        <Section label="Task Settings" labelSize="medium" >
          <Input
            type="text"
            label="Label"
            value={task.label}
            onChange={(val) => updateTask("label", val)}
          />

          <Input
            type="select"
            label="Flow"
            value={task.flow}
            onChange={(val) => updateTask("flow", val)}
            options={[
              { label: "Any", value: "any" },
              { label: "In", value: "in" },
              { label: "Out", value: "out" },
            ]}
          />

          <Input
            type="switch"
            innerLabelChecked="Reverse Flow"
            innerLabel="Keep Flow"
            value={task.reverseFlow}
            onChange={(val) => updateTask("reverseFlow", val)}
          />

          <Input
            type="switch"
            innerLabel="Unreplaceable"
            innerLabelChecked="Replaceable"
            value={task.replaceable}
            onChange={(val) => updateTask("replaceable", val)}
          />

          <Input
            type="switch"
            innerLabel="Use Count"
            innerLabelChecked="Use Input"
            value={task.useInput}
            onChange={(val) => updateTask("useInput", val)}
          />

          <Input
            type="number"
            label="Increment Value"
            value={task.incrementValue}
            onChange={(val) => updateTask("incrementValue", val)}
          />
        </Section>
      )}

      {isGrouped && useGroup && (
        <Section label="Unit Settings" labelSize="medium" flexDirection="column">
          {task.units.map((unit, i) => (
            <GoalUnitEditor
              key={unit.key}
              unit={unit}
              unitState={task.unitSettings?.[unit.key] || {}}
              updateUnit={(field, value) => {
                const current = task.unitSettings?.[unit.key] || {};
                updateTask("unitSettings", {
                  ...task.unitSettings,
                  [unit.key]: {
                    ...current,
                    [field]: value,
                  },
                });
              }}
            />
          ))}
        </Section>
      )}
    </div>
  );
};

export default GoalTaskEditor;
