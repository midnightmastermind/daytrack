// === GoalForm.jsx ===
import React, { useState, useEffect } from "react";
import {
  Button,
  InputGroup,
  Switch,
  Popover,
  HTMLSelect,
  Card,
  Tag,
  Tooltip,
} from "@blueprintjs/core";
import "./GoalForm.css";
import { useDispatch } from "react-redux";
import {
  updateGoal,
  updateGoalOptimistic,
  createGoal,
  addGoalOptimistic,
} from "./store/goalSlice";
import { v4 as uuidv4 } from "uuid";
import GoalItem from "./components/GoalItem";

const getTaskPaths = (tasks = [], prefix = []) => {
  let result = [];
  tasks.forEach((task) => {
    const currentPath = [...prefix, task.name];
    result.push({
      id: task._id || task.tempId || task.id,
      pathArray: currentPath,
      hasInput: task.properties?.input || false,
    });
    if (task.children && task.children.length > 0) {
      result = result.concat(getTaskPaths(task.children, currentPath));
    }
    if (task.categories && task.categories.length > 0) {
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
    if (selected && !selectedTasks.find((t) => t.task_id === selected.id)) {
      const goalItem = {
        task_id: selected.id,
        path: selected.pathArray,
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
      prev.map((item) => (item.task_id === itemId ? { ...item, [key]: value } : item))
    );
  };

  return (
    <Card className="goal-actual" elevation={2}>
      <div className="goal-actual-header">Goal Editor</div>

      <div className="header-section">
        <Switch
          innerLabel="Header"
          alignIndicator="right"
          checked={headerEnabled}
          onChange={(e) => setHeaderEnabled(e.target.checked)}
        />
        {headerEnabled && (
          <InputGroup
            placeholder="Enter header text"
            value={headerName}
            onChange={(e) => setHeaderName(e.target.value)}
          />
        )}
      </div>

      <div className="add-task-button">
        <Popover
          content={
            <div className="add-task-popover">
              <HTMLSelect
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
              >
                <option value="">Select a task</option>
                {taskOptions.map((option, idx) => (
                  <option key={`${option.id}-${idx}`} value={option.id}>
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

      <div className="goal-tasks-actual">
        {(selectedTasks || []).map((t, idx) => (
          <div key={`${t.task_id}-${idx}`} className="goal-task-row">
            <div className="goal-tags">
              {t.path?.map((segment, i) => (
                <Tag key={`${t.task_id}-segment-${i}`} intent={i === t.path.length - 1 ? "primary" : undefined}>
                  {segment}
                </Tag>
              ))}
            </div>
            <div className="condition-container">
              <Tooltip content="Toggle between count-based and dynamic (input-based) tracking">
                <Switch
                  checked={t.useInput}
                  onChange={(e) => updateGoalItem(t.task_id, "useInput", e.target.checked)}
                  disabled={!t.hasInput}
                  innerLabelChecked="dynamic"
                  innerLabel="count"
                />
              </Tooltip>
              <HTMLSelect
                value={t.operator}
                onChange={(e) => updateGoalItem(t.task_id, "operator", e.target.value)}
              >
                <option value="=">=</option>
                <option value=">">{">"}</option>
                <option value="<">{"<"}</option>
              </HTMLSelect>
              <InputGroup
                placeholder="Target"
                value={t.target || ""}
                onChange={(e) => updateGoalItem(t.task_id, "target", Number(e.target.value))}
              />
              <HTMLSelect
                value={t.timeScale}
                onChange={(e) => updateGoalItem(t.task_id, "timeScale", e.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="overall">Overall</option>
              </HTMLSelect>
            </div>
            <Button
              icon="cross"
              minimal
              onClick={() =>
                setSelectedTasks((prev) => prev.filter((item) => item.task_id !== t.task_id))
              }
            />
          </div>
        ))}
      </div>
    </Card>
  );
};

const PreviewPanel = ({ headerName, selectedTasks, headerEnabled }) => (
  <div className="goal-preview">
    <div className="goal-preview-header">Preview</div>
    <GoalItem
      goal={{ header: headerEnabled ? headerName : "", tasks: selectedTasks }}
      showEditButton={false}
    />
  </div>
);

const GoalForm = ({ goal, tasks, onSave, onClose }) => {
  const dispatch = useDispatch();
  const [headerName, setHeaderName] = useState("");
  const [headerEnabled, setHeaderEnabled] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");

  const taskOptions = getTaskPaths(tasks || []);

  useEffect(() => {
    if (goal) {
      setHeaderName(goal.header || "");
      setHeaderEnabled(!!goal.header);
      setSelectedTasks(goal.tasks || []);
    } else {
      setHeaderName("");
      setHeaderEnabled(false);
      setSelectedTasks([]);
    }
  }, [goal]);

  const handleSaveGoal = () => {
    const newGoal = {
      header: headerEnabled ? headerName : "",
      tasks: selectedTasks,
    };

    if (goal && goal._id) {
      dispatch(updateGoalOptimistic({ id: goal._id, updates: newGoal }));
      dispatch(updateGoal({ id: goal._id, goalData: newGoal }));
    } else {
      const tempId = `temp_${uuidv4()}`;
      dispatch(addGoalOptimistic({ ...newGoal, tempId }));
      dispatch(createGoal({ ...newGoal, tempId }));
    }

    onSave?.(newGoal);
  };

  return (
    <div className="goal-form">
      <div className="goal-form-section-container">
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
        <PreviewPanel
          headerEnabled={headerEnabled}
          headerName={headerName}
          selectedTasks={selectedTasks}
        />
      </div>
      <div className="goal-form-actions">
        <Button onClick={handleSaveGoal} text="Save Goal" intent="primary" />
        {onClose && <Button onClick={onClose} className="cancel-button" text="Cancel" />}
      </div>
    </div>
  );
};

export default GoalForm;
