import React, { useState, useEffect } from "react";
import { Button, FormGroup, InputGroup, Switch, Popover, HTMLSelect, Card } from "@blueprintjs/core";
import "./GoalForm.css";

// Helper function to generate a flat list of tasks with their full paths
// Assume tasks is an array of task objects, where nested tasks are in children.
// This helper recursively builds the path string.
const getTaskPaths = (tasks, prefix = "") => {
  let result = [];
  tasks.forEach((task) => {
    const currentPath = prefix ? `${prefix} → ${task.name}` : task.name;
    result.push({ id: task._id || task.id, path: currentPath });
    if (task.children && task.children.length > 0) {
      result = result.concat(getTaskPaths(task.children, currentPath));
    }
    if (task.categories && task.categories.length > 0) {
      result = result.concat(getTaskPaths(task.categories, currentPath));
    }
  });
  return result;
};

const GoalForm = ({ goal, tasks, onSave, onClose }) => {
  // goal: if editing, pre-populated goal object; otherwise, null for new
  const [headerEnabled, setHeaderEnabled] = useState(false);
  const [header, setHeader] = useState("");
  const [selectedTasks, setSelectedTasks] = useState([]); // tasks added to the goal (array of { id, path })
  
  // For the dropdown popover that adds tasks
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");

  // Build a flat list of tasks with full paths
  const taskOptions = getTaskPaths(tasks || []);

  // When editing an existing goal, initialize form state
  useEffect(() => {
    if (goal) {
      setHeader(goal.header || "");
      setHeaderEnabled(!!goal.header);
      setSelectedTasks(goal.tasks || []);
    } else {
      setHeader("");
      setHeaderEnabled(false);
      setSelectedTasks([]);
    }
  }, [goal]);

  // Handler for adding a task from the dropdown to the actual display
  const addTaskToGoal = () => {
    const selected = taskOptions.find((t) => t.id === selectedTaskId);
    if (selected) {
      // Check if already added; if so, ignore (or replace if needed)
      if (!selectedTasks.find((t) => t.id === selected.id)) {
        setSelectedTasks((prev) => [...prev, selected]);
      }
    }
    setSelectedTaskId("");
    setIsPopoverOpen(false);
  };

  // The preview is simply the header and list of tasks added
  const PreviewPanel = () => (
    <Card className="goal-preview" elevation={2} style={{ margin: "10px", padding: "10px", width: "100%" }}>
      <h4>Preview</h4>
      {headerEnabled && header && <div className="goal-header-preview">{header}</div>}
      <div className="goal-tasks-preview">
        {selectedTasks.map((t, idx) => (
          <div key={idx}>{t.path}</div>
        ))}
      </div>
    </Card>
  );

  // The actual panel allows you to add tasks, with a switch for header and input if enabled
  const ActualPanel = () => (
    <Card className="goal-actual" elevation={2} style={{ margin: "10px", padding: "10px", width: "100%" }}>
      <h4>Actual</h4>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Switch
          label="Header"
          checked={headerEnabled}
          onChange={(e) => setHeaderEnabled(e.target.checked)}
        />
        {headerEnabled && (
          <InputGroup
            placeholder="Enter header text"
            value={header}
            onChange={(e) => setHeader(e.target.value)}
          />
        )}
      </div>
      <div style={{ marginTop: "10px" }}>
        <Popover
          content={
            <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <HTMLSelect
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
              >
                <option value="">Select a task</option>
                {taskOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.path}
                  </option>
                ))}
              </HTMLSelect>
              <Button text="Add Task" onClick={addTaskToGoal} intent="primary" />
            </div>
          }
          interactionKind="click"
          isOpen={isPopoverOpen}
          onClose={() => setIsPopoverOpen(false)}
        >
          <Button icon="plus" text="Add Task" onClick={() => setIsPopoverOpen(true)} />
        </Popover>
      </div>
      <div className="goal-tasks-actual" style={{ marginTop: "10px" }}>
        {selectedTasks.map((t, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span>{t.path}</span>
            {/* Optionally, add an "X" button to remove a task from the goal */}
            <Button icon="cross" minimal onClick={() => {
              setSelectedTasks(prev => prev.filter((item) => item.id !== t.id));
            }} />
          </div>
        ))}
      </div>
    </Card>
  );

  const handleSaveGoal = () => {
    // Assemble the goal object with header and tasks array
    const newGoal = {
      header: headerEnabled ? header : "",
      tasks: selectedTasks,
      // You might add more properties later (e.g., goal targets, operators, etc.)
    };
    onSave(newGoal);
  };

  return (
    <div className="goal-form" style={{ padding: "20px" }}>
      <h3>Create/Edit Goal</h3>
      <div style={{ display: "flex", gap: "20px" }}>
        <ActualPanel />
        <PreviewPanel />
      </div>
      <div style={{ marginTop: "20px" }}>
        <Button onClick={handleSaveGoal} text="Save Goal" intent="primary" />
      </div>
    </div>
  );
};

export default GoalForm;
