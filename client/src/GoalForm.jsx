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
import { findTaskByIdDeep, updateTaskByIdImmutable } from "./helpers/taskUtils";
import { rehydrate_goal_tasks } from "./helpers/goalUtils";

/** Inline Components **/

const GoalTaskRow = ({ task, updateGoalItem }) => {
  return (
    <div className="goal-task-row">
      <div className="goal-header-container">
        <div className="goal-tags">
          {task.path?.map((segment, i) => (
            <Tag key={`${task.task_id}-segment-${i}`} intent={i === task.path.length - 1 ? "primary" : undefined}>
              {segment}
            </Tag>
          ))}
        </div>
        <div className="label-container">
              <InputGroup
                value={task.label || ""}
                onChange={(e) => updateGoalItem(task.task_id, "label", e.target.value)}
                placeholder="Label"
              />
            </div>
      </div>
      <div className="goal-task">
        <div className="goal-task-settings">
          <div className="time-settings">
            <div className="time-settings-header">Time</div>
            <HTMLSelect
              value={task.timeScale}
              onChange={(e) => updateGoalItem(task.task_id, "timeScale", e.target.value)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="overall">Overall</option>
            </HTMLSelect>
            {/* STARTING AMOUNT (ALWAYS SHOWN) */}
            <div className="starting-container">
              <InputGroup
                value={task.starting || ""}
                onChange={(e) => updateGoalItem(task.task_id, "starting", e.target.value)}
                placeholder="Starting"
              />
            </div>
          </div>
          {/* FLOW SETTINGS */}
          <div className="flow-container">
            <div className="flow-header">Flow</div>
            <HTMLSelect
              value={task.flow || "any"}
              onChange={(e) => updateGoalItem(task.task_id, "flow", e.target.value)}
            >
              <option value="any">Any</option>
              <option value="in">In</option>
              <option value="out">Out</option>
            </HTMLSelect>
            <div className="switch-container">
              <Switch
                checked={task.reverseFlow ?? false}
                onChange={(e) => updateGoalItem(task.task_id, "reverseFlow", e.target.checked)}
                innerLabel="Reverse"
              />
              <Switch
                checked={task.replaceable ?? false}
                onChange={(e) => updateGoalItem(task.task_id, "replaceable", e.target.checked)}
                innerLabel="Replaceable"
              />
            </div>
          </div>
          <div className="input-check-container">
            <div className="input-check-header">Increment</div>
            <div className="switch-container input-check">
              <Switch
                checked={task.useInput ?? true}
                onChange={(e) => updateGoalItem(task.task_id, "useInput", e.target.checked)}
                innerLabelChecked="Input"
                innerLabel="Count"
              />
            </div>
          </div>
          {/* TARGET SETTINGS */}
          
          <div className="target-container">
            <div className="target-header">Target</div>
            <div className="target-conditional">
              <div className="switch-container">
                <Switch
                  checked={task.hasTarget ?? true}
                  onChange={(e) => updateGoalItem(task.task_id, "hasTarget", e.target.checked)}
                  innerLabel="Target Goal"
                />
              </div>
              {task.hasTarget ?? true ? (
                <div className="target-settings">
                  <HTMLSelect
                    value={task.operator}
                    onChange={(e) => updateGoalItem(task.task_id, "operator", e.target.value)}
                  >
                    <option value="=">=</option>
                    <option value=">">{" > "}</option>
                    <option value="<">{" < "}</option>
                  </HTMLSelect>
                  <InputGroup
                    value={task.target}
                    onChange={(e) => updateGoalItem(task.task_id, "target", e.target.value)}
                    placeholder="Target"
                  />
                </div>
              ) : null}
            </div>
          </div >
        </div>
      </div>
    </div>
  );
};

const GroupedUnitRow = ({ unit, unitState, unitKey, updateUnitSettings }) => {
  if (!unit) return null;

  return (
    <div className="grouped-unit-row">
      <div className="grouped-unit-control">
        <div className="grouped-unit-header">Unit</div>
        <div className="switch-container">
          <Switch
            checked={unitState.enabled ?? false}
            onChange={(e) => updateUnitSettings(unitKey, "enabled", e.target.checked)}
            innerLabelChecked="Enabled"
            innerLabel="Disabled"
          />
        </div>
        <Tag>{unit.key}</Tag>
        <div className="label-container">
          <InputGroup
            value={unitState.label || ""}
            onChange={(e) => updateUnitSettings(unitKey, "label", e.target.value)}
            placeholder="label"
          />
        </div>
      </div>
      
      <div className="time-settings">
        <div className="time-settings-header">Time</div>
        <HTMLSelect
          value={unitState.timeScale || "daily"}
          onChange={(e) => updateUnitSettings(unitKey, "timeScale", e.target.value)}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="overall">Overall</option>
        </HTMLSelect>
        {/* ALWAYS RENDER STARTING */}
        <div className="starting-container">
          <InputGroup
            value={unitState.starting || ""}
            onChange={(e) => updateUnitSettings(unitKey, "starting", e.target.value)}
            placeholder="Starting"
          />
        </div>
      </div>
      {/* FLOW SETTINGS */}
      <div className="flow-container">
        <div className="flow-header">Flow</div>
        <HTMLSelect
          value={unitState.flow || "any"}
          onChange={(e) => updateUnitSettings(unitKey, "flow", e.target.value)}
        >
          <option value="any">Any</option>
          <option value="in">In</option>
          <option value="out">Out</option>
        </HTMLSelect>
        <div className="switch-container">
          <Switch
            checked={unitState.reverseFlow ?? false}
            onChange={(e) => updateUnitSettings(unitKey, "reverseFlow", e.target.checked)}
            innerLabel="Reverse"
          />
          <Switch
            checked={unitState.replaceable ?? false}
            onChange={(e) => updateUnitSettings(unitKey, "replaceable", e.target.checked)}
            innerLabel="Replaceable"
          />
        </div>
      </div>
      <div className="input-check-container">
        <div className="input-check-header">Increment</div>
        <div className="switch-container input-check">
          <Switch
            checked={unitState.useInput ?? true}
            onChange={(e) => updateUnitSettings(unitKey, "useInput", e.target.checked)}
            innerLabelChecked="Input"
            innerLabel="Count"
          />
        </div>
      </div>
      {/* TARGET SETTINGS */}
      {unit.type !== "text" && (
      <div className="target-container">
        <div className="target-header">Target</div>
        <div className="target-conditional">
          <div className="switch-container">
            <Switch
              checked={unitState.hasTarget ?? true}
              onChange={(e) => updateUnitSettings(unitKey, "hasTarget", e.target.checked)}
              innerLabel="Goal Target"
            />
          </div>
          {unitState.hasTarget ?? true ? (
            <div className="target-settings">
              <HTMLSelect
                value={unitState.operator || "="}
                onChange={(e) => updateUnitSettings(unitKey, "operator", e.target.value)}
              >
                <option value="=">=</option>
                <option value=">">{" > "}</option>
                <option value="<">{" < "}</option>
              </HTMLSelect>
              <InputGroup
                value={unitState.target || ""}
                onChange={(e) => updateUnitSettings(unitKey, "target", e.target.value)}
                placeholder="Target"
              />
            </div>
          ) : null}
        </div>
      </div>
      )}
    </div>
  );
};


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
  goalFlowDir,
  setGoalFlowDir,
  selectedTasks,
  setSelectedTasks,
  taskOptions,
  selectedTaskId,
  setSelectedTaskId,
  isPopoverOpen,
  setIsPopoverOpen,
  tasks,
}) => {
  const addTaskToGoal = () => {
    const selected = taskOptions.find((t) => t.id === selectedTaskId);
    if (!selected || selectedTasks.find((t) => t.task_id === selected.id)) return;

    const originalTask = findTaskByIdDeep(selected.id, tasks);
    const groupingEnabled = originalTask?.properties?.group;
    const units = originalTask?.properties?.grouping?.units || [];

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
      hasTarget: true,
      reverseFlow: false,
      flow: "any",
      ...(groupingEnabled && {
        grouping: true,
        units,
        unitSettings: {},
      }),
    };

    setSelectedTasks((prev) => [...prev, goalItem]);
    setSelectedTaskId("");
    setIsPopoverOpen(false);
  };

  const updateGoalItem = (itemId, key, value) => {
    setSelectedTasks((prev) =>
      prev.map((item) =>
        item.task_id === itemId ? { ...item, [key]: value } : item
      )
    );
  };

  console.log(selectedTasks);
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
        {(selectedTasks || []).map((t, idx) => {
          console.log(t);
          return (
            <div key={`${t.task_id}-${idx}`}>
              {t.grouping && Array.isArray(t.units) ? (
                <div className="goal-task-row">
                  <div className="goal-header-container">
                    <div className="goal-tags">
                      {t.path?.map((segment, i) => (
                        <Tag key={`${t.task_id}-segment-${i}`} intent={i === t.path.length - 1 ? "primary" : undefined}>
                          {segment}
                        </Tag>
                      ))}
                    </div>
                    <div className="label-container">
                      <InputGroup
                        value={t.label || ""}
                        onChange={(e) => updateGoalItem(t.task_id, "label", e.target.value)}
                        placeholder="Label"
                      />
                    </div>
                  </div>
              
                  <div className="grouped-units-container">
                    {t.units.map((unit) => {
                      const unitKey = unit.key;
                      const unitState = t.unitSettings?.[unitKey] || {};
                      return (
                        <GroupedUnitRow
                          key={unitKey}
                          unit={unit}
                          unitKey={unitKey}
                          unitState={unitState}
                          updateUnitSettings={(unitKey, field, value) =>
                            setSelectedTasks((prev) =>
                              prev.map((item) => {
                                if (item.task_id !== t.task_id) return item;

                                const prevUnit = item.unitSettings?.[unitKey] || {};

                                const updatedUnit = {
                                  ...prevUnit,
                                  [field]: value,
                                };

                                // Sync children array with unitSettings
                                const updatedChildren = (item.units || []).map((unit) => {
                                  const key = unit.key;
                                  const settings = key === unitKey ? updatedUnit : item.unitSettings?.[key] || {};

                                  return {
                                    unitKey: key,
                                    unitLabel: unit.label,
                                    ...settings,
                                    value: 0, // optionally default
                                  };
                                });

                                return {
                                  ...item,
                                  unitSettings: {
                                    ...item.unitSettings,
                                    [unitKey]: updatedUnit,
                                  },
                                  children: updatedChildren,
                                };
                              })
                            )
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              ) : (
                <GoalTaskRow task={t} updateGoalItem={updateGoalItem} />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const PreviewPanel = ({ headerName, selectedTasks, headerEnabled }) => (
  <div className="goal-preview">
    <div className="goal-preview-header">Preview</div>
    <GoalItem
      goal={{
        header: headerEnabled ? headerName : "",
        tasks: selectedTasks,
      }}
      showEditButton={false}
    />
  </div>
);

const GoalForm = ({ goal, tasks, onSave, onClose }) => {
  const dispatch = useDispatch();
  const [headerName, setHeaderName] = useState("");
  const [headerEnabled, setHeaderEnabled] = useState(false);
  const [goalFlowDir, setGoalFlowDir] = useState("any");
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");
console.log(goal);
  const taskOptions = getTaskPaths(tasks || []);

  useEffect(() => {
  if (!goal) {
    setHeaderName("");
    setHeaderEnabled(false);
    setGoalFlowDir("any");
    setSelectedTasks([]);
    return;
  }

  setHeaderName(goal.header || "");
  setHeaderEnabled(!!goal.header);
  setGoalFlowDir(goal.goalFlowDir || "any");

  const rehydrated = rehydrate_goal_tasks(goal, tasks);
  setSelectedTasks(rehydrated);
}, [goal, tasks]);

  const handleSaveGoal = () => {
    console.log(selectedTasks);
    const enrichedTasks = selectedTasks.map((task) => {
      if (task.grouping && Array.isArray(task.units)) {
        const unitSettings = {};
    
        for (const unit of task.units) {
          const key = unit.key;
          const settings = task.unitSettings?.[key] || {};
          
          // ✅ Apply default values if missing
          unitSettings[key] = {
            enabled: settings.enabled ?? false,
            flow: settings.flow || "any",
            reverseFlow: settings.reverseFlow ?? false,
            timeScale: settings.timeScale || "daily",
            useInput: settings.useInput ?? true,
            hasTarget: settings.hasTarget ?? true,
            operator: settings.operator || "=",
            target: settings.target ?? 0,
            starting: settings.starting ?? 0,
            replaceable: settings.replaceable ?? false,
          };
        }
    
        const children = task.units.map((unit) => ({
          unitKey: unit.key,
          unitLabel: unit.label,
          value: 0,
          ...unitSettings[unit.key],
        }));
    
        return {
          ...task,
          unitSettings,
          children,
        };
      }
    
      return task;
    });
    
    const newGoal = {
      header: headerEnabled ? headerName : "",
      tasks: enrichedTasks,
    };

    const tempId = goal?.tempId || `temp_${uuidv4()}`;
    const fullGoal = { ...newGoal, tempId };

    console.log(fullGoal);
    if (goal && goal._id) {
      dispatch(updateGoalOptimistic({ id: goal._id, updates: fullGoal }));
      dispatch(updateGoal({ id: goal._id, goalData: fullGoal }));
    } else {
      dispatch(addGoalOptimistic(fullGoal));
      dispatch(createGoal(fullGoal));
    }
    
    onSave?.(fullGoal);
  };

  return (
    <div className="goal-form">
      <div className="goal-form-section-container">
        <ActualPanel
          headerName={headerName}
          setHeaderName={setHeaderName}
          headerEnabled={headerEnabled}
          setHeaderEnabled={setHeaderEnabled}
          goalFlowDir={goalFlowDir}
          setGoalFlowDir={setGoalFlowDir}
          selectedTasks={selectedTasks}
          setSelectedTasks={setSelectedTasks}
          taskOptions={taskOptions}
          selectedTaskId={selectedTaskId}
          setSelectedTaskId={setSelectedTaskId}
          isPopoverOpen={isPopoverOpen}
          setIsPopoverOpen={setIsPopoverOpen}
          tasks={tasks}
        />
        <PreviewPanel
          headerEnabled={headerEnabled}
          headerName={headerName}
          selectedTasks={selectedTasks}
        />
      </div>
      <div className="goal-form-actions">
        <Button onClick={handleSaveGoal} text="Save Goal" intent="primary" />
        {onClose && (
          <Button onClick={onClose} className="cancel-button" text="Cancel" />
        )}
      </div>
    </div>
  );
};

export default GoalForm;
