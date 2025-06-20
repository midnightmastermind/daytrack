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
import DatePickerPopover from "./components/DatePickerPopover";
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
        <Tag intent="primary" style={{marginTop: "10px"}}>{unit.name}</Tag>
        {/* <div className="label-container">
          <InputGroup
            value={unitState.label || ""}
            onChange={(e) => updateUnitSettings(unitKey, "label", e.target.value)}
            placeholder="label"
          />
        </div> */}
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
  countdowns,
  setCountdowns
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
      order: selectedTasks.length,
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
        <Button icon="time" intent="primary" text="Add Countdown" onClick={() =>
          setCountdowns((prev) => [...prev, { name: "", date: new Date() }])
        } />
      </div>

      {(countdowns.length > 0) &&
        <div className="goal-countdowns-actual-container">
          <div className="goal-countdowns-actual-header">Countdowns</div>
          <div className="goal-countdowns-actual">
            {(countdowns).map((c, i) => (
              <CountdownRow
                key={`countdown-${i}`}
                index={i}
                countdown={c}
                updateCountdown={(index, key, value) =>
                  setCountdowns((prev) =>
                    prev.map((item, idx) =>
                      idx === index ? { ...item, [key]: value } : item
                    )
                  )
                }
                removeCountdown={(index) =>
                  setCountdowns((prev) => prev.filter((_, idx) => idx !== index))
                }
              />
            ))}
          </div>
        </div>
      }

      <div className="goal-tasks-actual-container">
        <div className="goal-tasks-actual-header">Tasks</div>
        <div className="goal-tasks-actual">
          {(selectedTasks || []).map((t, idx) => {
            const moveTask = (dir) => {
              const newIndex = idx + dir;
              if (newIndex < 0 || newIndex >= selectedTasks.length) return;

              const reordered = [...selectedTasks];
              const [moved] = reordered.splice(idx, 1);
              reordered.splice(newIndex, 0, moved);
              
              // Reassign order for all tasks after reorder
              const updatedWithOrder = reordered.map((item, i) => ({
                ...item,
                order: i,
              }));
              
              setSelectedTasks(updatedWithOrder);
            };

            return (
              <div key={`${t.task_id}-${idx}`} className="goal-task-wrapper">
                <div className="goal-task-reorder-buttons">
                  <Button icon="arrow-up" minimal onClick={() => moveTask(-1)} disabled={idx === 0} />
                  <Button icon="arrow-down" minimal onClick={() => moveTask(1)} disabled={idx === selectedTasks.length - 1} />
                </div>
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
                      {t.units.map((unit, unitIndex) => {
                        const unitKey = unit.key;
                        const unitState = t.unitSettings?.[unitKey] || {};

                        const moveUnit = (dir) => {
                          const newIndex = unitIndex + dir;
                          if (newIndex < 0 || newIndex >= t.units.length) return;
                        
                          const reorderedUnits = [...t.units];
                          const [movedUnit] = reorderedUnits.splice(unitIndex, 1);
                          reorderedUnits.splice(newIndex, 0, movedUnit);
                        
                          // Reorder unitSettings AND assign new .order
                          const newUnitSettings = {};
                          for (let i = 0; i < reorderedUnits.length; i++) {
                            const key = reorderedUnits[i].key;
                            newUnitSettings[key] = {
                              ...(t.unitSettings?.[key] || {}),
                              order: i, // ✅ assign updated order
                            };
                          }
                        
                          setSelectedTasks((prev) =>
                            prev.map((item) =>
                              item.task_id === t.task_id
                                ? {
                                    ...item,
                                    units: reorderedUnits,
                                    unitSettings: newUnitSettings,
                                  }
                                : item
                            )
                          );
                        };
                        
                        return (
                          <div key={unitKey} className="grouped-unit-wrapper">
                            <div className="grouped-unit-reorder-buttons">
                              <Button icon="arrow-up" minimal disabled={unitIndex === 0} onClick={() => moveUnit(-1)} />
                              <Button icon="arrow-down" minimal disabled={unitIndex === t.units.length - 1} onClick={() => moveUnit(1)} />
                            </div>
                            <GroupedUnitRow
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
                                    const updatedChildren = (item.units || []).map((unit) => {
                                      const key = unit.key;
                                      const settings = key === unitKey ? updatedUnit : item.unitSettings?.[key] || {};
                                      return {
                                        unitKey: key,
                                        unitLabel: unit.label,
                                        ...settings,
                                        value: 0,
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
                          </div>
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
      </div>
    </Card>
  );
};
const CountdownRow = ({ countdown, index, updateCountdown, removeCountdown }) => {
  return (
    <div className="countdown-row">
      <div className="countdown-row-content">
        <InputGroup
          placeholder="Countdown Name"
          value={countdown.name}
          onChange={(e) => updateCountdown(index, "name", e.target.value)}
        />
        <DatePickerPopover
          selectedDate={new Date(countdown.date)}
          setSelectedDate={(date) => updateCountdown(index, "date", date)}
        />
      </div>
      <div className="countdown-delete">
        <Button className="countdown-delete" icon="cross" minimal onClick={() => removeCountdown(index)} />
      </div>
    </div>
  );
};
const PreviewPanel = ({ headerName, countdowns, selectedTasks, headerEnabled }) => (
  <div className="goal-preview">
    <div className="goal-preview-header">Preview</div>
    <GoalItem
      goal={{
        header: headerEnabled ? headerName : "",
        tasks: selectedTasks,
        countdowns
      }}
      showEditButton={false}
      preview={true}
    />
  </div>
);

const GoalForm = ({ goal, tasks, onSave, onClose }) => {
  const dispatch = useDispatch();
  const [headerName, setHeaderName] = useState("");
  const [headerEnabled, setHeaderEnabled] = useState(false);
  const [goalFlowDir, setGoalFlowDir] = useState("any");
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [countdowns, setCountdowns] = useState([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");
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
    setCountdowns((goal?.countdowns || []).map((cd) => ({
      ...cd,
      date: new Date(cd.date),
    }))
  );

    const rehydrated = rehydrate_goal_tasks(goal, tasks);
    setSelectedTasks(rehydrated);
  }, [goal, tasks]);

  const handleSaveGoal = () => {
    const enrichedTasks = selectedTasks.map((task, index) => {
      const baseTask = {
        ...task,
        order: index, // ✅ Save this task’s order in the list
      };

      if (task.grouping && Array.isArray(task.units)) {
        const unitSettings = {};

        for (const [unitIndex, unit] of task.units.entries()) {
          const key = unit.key;
          const settings = task.unitSettings?.[key] || {};

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
            order: unitIndex, // ✅ Save order of each grouped unit
          };
        }

        const children = task.units.map((unit, i) => ({
          unitKey: unit.key,
          unitLabel: unit.label,
          value: 0,
          order: i,
          ...unitSettings[unit.key],
        }));

        return {
          ...baseTask,
          unitSettings,
          children,
        };
      }

      return baseTask;
    });


    const newGoal = {
      header: headerEnabled ? headerName : "",
      tasks: enrichedTasks,
      countdowns: countdowns.map((cd) => ({
        ...cd,
        date: cd.date instanceof Date ? cd.date.toISOString() : cd.date,
      })),
    };

    const tempId = goal?.tempId || `temp_${uuidv4()}`;
    const fullGoal = { ...newGoal, tempId };

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
          countdowns={countdowns}
          setCountdowns={setCountdowns}
        />
        <PreviewPanel
          headerEnabled={headerEnabled}
          headerName={headerName}
          selectedTasks={selectedTasks}
          countdowns={countdowns}
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
