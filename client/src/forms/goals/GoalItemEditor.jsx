import React, { useState } from "react";
import { Button, Card, Popover } from "@blueprintjs/core";
import GoalTaskEditor from "./GoalTaskEditor";
import { findTaskByIdDeep } from "../../helpers/taskUtils";
import Section from "../../components/Section";
import Input from "../../components/Input";

const GoalItemEditor = ({ goalItem, onUpdate, onDelete, taskOptions, tasks, index }) => {
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const updateField = (key, value) => {
    onUpdate({ ...goalItem, [key]: value });
  };

  const updateSingleTask = (taskId, key, value) => {
    const updatedTasks = goalItem.tasks.map((task) =>
      task.task_id === taskId ? { ...task, [key]: value } : task
    );
    onUpdate({ ...goalItem, tasks: updatedTasks });
  };

  const resolveTaskFromOptions = (task) => {
    const base = taskOptions.find((opt) => opt.id === task.task_id);
    if (!base) return task;

    const original = findTaskByIdDeep(base.id, tasks);
    const groupingEnabled = original?.properties?.group;
    const units = original?.properties?.grouping?.units || [];

    return {
      ...task,
      path: base.pathArray,
      grouping: groupingEnabled,
      units,
    };
  };

  const removeTask = (taskId) => {
    const updated = goalItem.tasks.filter((t) => t.task_id !== taskId);
    onUpdate({ ...goalItem, tasks: updated });
  };

  const addTask = () => {
    const selected = taskOptions.find((t) => t.id === selectedTaskId);
    if (!selected) return;
    const original = findTaskByIdDeep(selected.id, tasks);
    const groupingEnabled = original?.properties?.group;
    const units = original?.properties?.grouping?.units || [];

    const newTask = {
      task_id: selected.id,
      path: selected.pathArray,
      order: goalItem.tasks.length,
      flow: "any",
      useInput: false,
      incrementValue: 1,
      reverseFlow: false,
      replaceable: false,
      ...(groupingEnabled && {
        grouping: true,
        units,
        unitSettings: {},
      }),
    };

    onUpdate({
      ...goalItem,
      tasks: [...goalItem.tasks, newTask],
    });

    setSelectedTaskId("");
    setIsPopoverOpen(false);
  };

  return (
    <Card className="goal-item-editor" elevation={1}>
      <Section label={goalItem.label} labelSize="large">
        <Input
          type="text"
          label="Label"
          value={goalItem.label}
          onChange={(val) => updateField("label", val)}
        />

        <Input
          type="select"
          label="Time Scale"
          value={goalItem.timeScale}
          onChange={(val) => updateField("timeScale", val)}
          options={[
            { label: "Daily", value: "daily" },
            { label: "Weekly", value: "weekly" },
            { label: "Monthly", value: "monthly" },
            { label: "Overall", value: "overall" },
          ]}
        />

        <Input
          type="select"
          label="Value Type"
          value={goalItem.valueType}
          onChange={(val) => updateField("valueType", val)}
          options={[
            { label: "Integer", value: "integer" },
            { label: "Currency", value: "currency" },
            { label: "Percentage", value: "percentage" },
          ]}
        />
        <Section label="Display Format" flexDirection="row">
          <Input
            className="goal-prefix"
            label="Prefix"
            value={goalItem.unitPrefix || ""}
            onChange={(val) => updateField("unitPrefix", val)}
          />
          <Input
            className="goal-suffix"
            label="Suffix"
            value={goalItem.unitSuffix || ""}
            onChange={(val) => updateField("unitSuffix", val)}
          />
        </Section>
        <Input
          type="number"
          label="Starting"
          value={goalItem.starting}
          onChange={(val) => updateField("starting", val)}
        />

        <Section label="Target Condition">
          <Input
            type="switch"
            innerLabel="Untargeted"
            innerLabelChecked="Targeted"
            value={goalItem.hasTarget}
            onChange={(val) => updateField("hasTarget", val)}
          />
          <Input
            type="select"
            disabled={!goalItem.hasTarget}
            label="Operator"
            value={goalItem.operator}
            onChange={(val) => updateField("operator", val)}
            options={[
              { label: "=", value: "=" },
              { label: ">", value: ">" },
              { label: "<", value: "<" },
            ]}
          />
          <Input
            disabled={!goalItem.hasTarget}
            type="number"
            label="Target"
            value={goalItem.target}
            onChange={(val) => updateField("target", val)}
          />
        </Section>
      </Section>

      <Section label="Tasks" labelSize="medium" flexDirection="column">
        <Popover
          content={
            <div className="add-task-popover">
              <Input
                type="select"
                label="Select a task"
                value={selectedTaskId}
                onChange={(val) => setSelectedTaskId(val)}
                options={[
                  { label: "Select a task", value: "" },
                  ...taskOptions.map((opt) => ({
                    label: opt.pathArray.join(" / "),
                    value: opt.id,
                  })),
                ]}
              />
              <Button text="Add Task" onClick={addTask} intent="primary" />
            </div>
          }
          interactionKind="click"
          isOpen={isPopoverOpen}
          onClose={() => setIsPopoverOpen(false)}
        >
          <Button icon="plus" minimal text="Add Task" onClick={() => setIsPopoverOpen(true)} />
        </Popover>

        {goalItem.tasks.map((task, idx) => (
          <GoalTaskEditor
            key={`${task.task_id}-${idx}`}
            task={resolveTaskFromOptions(task)}
            updateTask={(key, value) => updateSingleTask(task.task_id, key, value)}
            taskOptions={taskOptions}
            onDelete={() => removeTask(task.task_id)}
            tasks={tasks}
          />
        ))}
      </Section>

      <Button className="trash-button" icon="trash" minimal intent="danger" onClick={onDelete} />
    </Card>
  );
};

export default GoalItemEditor;
