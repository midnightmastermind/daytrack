import React, { useState } from "react";
import {
  Button,
  InputGroup,
  Switch,
  Popover,
  HTMLSelect,
  Card,
  Alignment,
  Tag
} from "@blueprintjs/core";
import "./GoalForm.css";

// Helper function to generate a flat list of task options with full paths
const getTaskPaths = (tasks, prefix = []) => {
  let result = [];
  tasks.forEach((task) => {
    const currentPath = [...prefix, task.name];
    result.push({
      id: task._id || task.id,
      pathArray: currentPath,
      hasInput: task.properties?.input || false,
    });
    if (task.children?.length > 0) {
      result = result.concat(getTaskPaths(task.children, currentPath));
    }
    if (task.categories?.length > 0) {
      result = result.concat(getTaskPaths(task.categories, currentPath));
    }
  });
  return result;
};


const ActualPanel = ({
  headerName,
  setHeaderName,
  headerEnabled,
  setHeaderEnabled,
  selectedTasks,
  setSelectedTasks,
  taskOptions,
  selectedTaskId,
  setSelectedTaskId,
  isPopoverOpen,
  setIsPopoverOpen,
}) => {
  const addTaskToGoal = () => {
    const selected = taskOptions.find((t) => t.id === selectedTaskId);
    if (selected && !selectedTasks.find((t) => t.id === selected.id)) {
      const goalItem = {
        ...selected,
        target: 0,
        operator: "=",
        valueType: "integer",
        timeScale: "daily",
        progress: 0,
        useInput: false,
        incrementValue: 1,
      };
      setSelectedTasks((prev) => [...prev, goalItem]);
    }
    setSelectedTaskId("");
    setIsPopoverOpen(false);
  };

  const updateGoalItem = (itemId, key, value) => {
    setSelectedTasks((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, [key]: value } : item))
    );
  };

  return (
    <Card className="goal-actual" elevation={2} style={{ padding: 10, width: "100%" }}>
      <h4>Actual</h4>
      <div className="header-section">
        <div className="header-switch">
          <Switch
            innerLabel="Header"
            alignIndicator={Alignment.RIGHT}
            checked={headerEnabled}
            onChange={(e) => setHeaderEnabled(e.target.checked)}
          />
          <InputGroup
            id="header-input"
            placeholder="Enter header text"
            value={headerName}
            onChange={(e) => setHeaderName(e.target.value)}
            disabled={!headerEnabled}
          />
        </div>

        <div className="add-task-button">
          <Popover
            content={
              <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                <HTMLSelect value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)}>
                  <option value="">Select a task</option>
                  {taskOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.pathArray.join(" / ")}
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
            <Button icon="plus" intent="primary" text="Add Task" onClick={() => setIsPopoverOpen(true)} />
          </Popover>
        </div>
      </div>
      <div className="goal-tasks-actual" style={{ marginTop: 10 }}>
        {selectedTasks.map((t) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
            <div className="goal-tags">
            {t.pathArray.map((segment, i) => (
              <Tag key={i}>{segment}</Tag>
            ))}
            </div>
            <div className="condition-container">
            {t.hasInput ? (
              <Switch
                checked={t.useInput}
                onChange={(e) => updateGoalItem(t.id, "useInput", e.target.checked)}
              />
            ) : (
              <div>count</div>
            )}
            {t.useInput && (
              <InputGroup
                placeholder="Increment Value"
                value={t.incrementValue}
                onChange={(e) => updateGoalItem(t.id, "incrementValue", Number(e.target.value))}
                style={{ width: 80 }}
              />
            )}

            <HTMLSelect
              value={t.operator}
              onChange={(e) => updateGoalItem(t.id, "operator", e.target.value)}
              style={{ width: 60 }}
            >
              <option value="=">=</option>
              <option value=">">{'>'}</option>
              <option value="<">{'<'}</option>
            </HTMLSelect>
            <InputGroup
              placeholder="Target"
              value={t.target}
              onChange={(e) => updateGoalItem(t.id, "target", Number(e.target.value))}
              style={{ width: 80 }}
            />
            <HTMLSelect
              value={t.timeScale}
              onChange={(e) => updateGoalItem(t.id, "timeScale", e.target.value)}
              style={{ width: 80 }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="overall">Overall</option>
            </HTMLSelect>
            </div>
            <Button
              icon="cross"
              minimal
              onClick={() => setSelectedTasks((prev) => prev.filter((item) => item.id !== t.id))}
            />
          </div>
        ))}
      </div>
    </Card>
  );
};

const PreviewPanel = ({ headerName, selectedTasks, headerEnabled }) => (
  <Card className="goal-preview" elevation={2} style={{ padding: 10, width: "100%" }}>
    <h4>Preview</h4>
    <div style={{ display: headerEnabled ? "block" : "none" }} className="goal-header-preview">{headerName}</div>
    <div className="goal-tasks-preview">
      {selectedTasks.map((t) => {
        const displayName = t.pathArray[t.pathArray.length - 1];
        return (
          <div key={t.id}>
            {displayName} {t.target ? `(${t.progress || 0}/${t.target})` : ""}
          </div>
        );
      })}
    </div>
  </Card>
);

const GoalForm = ({ tasks, onSave, onClose }) => {
  const [headerName, setHeaderName] = useState("");
  const [headerEnabled, setHeaderEnabled] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");

  const taskOptions = getTaskPaths(tasks || []);

  const handleSaveGoal = () => {
    const newGoal = {
      header: headerEnabled ? headerName : "",
      tasks: selectedTasks,
    };
    onSave(newGoal);
  };

  return (
    <div className="goal-form" style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 5 }}>
        <ActualPanel
          headerName={headerName}
          setHeaderName={setHeaderName}
          headerEnabled={headerEnabled}
          setHeaderEnabled={setHeaderEnabled}
          selectedTasks={selectedTasks}
          setSelectedTasks={setSelectedTasks}
          taskOptions={taskOptions}
          selectedTaskId={selectedTaskId}
          setSelectedTaskId={setSelectedTaskId}
          isPopoverOpen={isPopoverOpen}
          setIsPopoverOpen={setIsPopoverOpen}
        />
        <PreviewPanel headerEnabled={headerEnabled} headerName={headerName} selectedTasks={selectedTasks} />
      </div>
      <div style={{ marginTop: 20 }}>
        <Button onClick={handleSaveGoal} text="Save Goal" intent="primary" />
      </div>
    </div>
  );
};

export default GoalForm;
