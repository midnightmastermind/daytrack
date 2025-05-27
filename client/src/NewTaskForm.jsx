// NewTaskForm.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Button,
  InputGroup,
  Switch,
  NumericInput,
  Tag,
  HTMLSelect
} from "@blueprintjs/core";
import TaskCard from "./components/TaskCard";
import ScheduleCard from "./components/ScheduleCard";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import { v4 as uuidv4 } from "uuid";
import {
  getSelectedLeaves,
  getTaskKey,
  getTaskAncestryByIdDeep,
  updateTaskByIdDeep
} from "./helpers/taskUtils";
import "./NewTaskForm.css";

import { useDispatch } from "react-redux";
import {
  deleteTask,
  deleteTaskOptimistic,
  updateTask,
  createTask
} from "./store/tasksSlice";
import { diffTaskChildren } from "./helpers/taskUtils";

const ChildEditor = ({ child, updateChild, removeChild, groupingEnabled }) => {
  const updateField = (field, value) => {
    updateChild(child._id || child.tempId || child.id, {
      ...child,
      [field]: value,
    });
  };

  const updateNestedChild = (nestedId, updatedNestedChild) => {
    const parentId = child._id || child.tempId || child.id;
    const updatedParent = {
      ...child,
      children: updateTaskByIdDeep(child.children || [], nestedId, updatedNestedChild),
    };
    updateChild(parentId, updatedParent);
  };

  const addNestedChild = () => {
    const newChild = {
      id: uuidv4(),
      name: "",
      properties: { checkbox: false, input: true, preset: true },
      values: { checkbox: false, input: {} },
      children: [],
    };
    updateChild(child._id || child.tempId || child.id, {
      ...child,
      children: [...(child.children || []), newChild],
    });
  };

  const addUnit = () => {
    const updatedUnits = [
      ...(child.properties.grouping?.units || []),
      {
        name: "",
        key: "",
        prefix: "",
        suffix: "",
        type: "float",
        enabled: true,
        isMulti: false
      }
    ];
    updateField("properties", {
      ...child.properties,
      grouping: { ...child.properties.grouping, units: updatedUnits },
    });
  };

  const updateUnit = (index, field, value) => {
    const updatedUnits = [...(child.properties.grouping?.units || [])];
    updatedUnits[index][field] = value;
    updateField("properties", {
      ...child.properties,
      grouping: { ...child.properties.grouping, units: updatedUnits },
    });
  };

  const deleteUnit = (index) => {
    const updatedUnits = child.properties.grouping.units.filter((_, i) => i !== index);
    updateField("properties", {
      ...child.properties,
      grouping: { ...child.properties.grouping, units: updatedUnits },
    });
  };

  return (
    <div className="child-editor">
      <div className="child-editor-row">
        <div className="child-editor-header">
          <div className="child-name-row">
            <Tag minimal>Name</Tag>
            <InputGroup
              value={child.name}
              placeholder="Child name"
              onChange={(e) => updateField("name", e.target.value)}
            />
          </div>
          <Button
            icon="cross"
            minimal
            onClick={() => removeChild(child._id || child.tempId || child.id)}
          />
        </div>
        <div className="child-input-options">
          <Switch
            large
            innerLabel="Checkbox"
            checked={child.properties?.checkbox || false}
            onChange={(e) => updateField("properties", { ...child.properties, checkbox: e.target.checked })}
          />
          <Switch
            large
            innerLabel="Input"
            checked={child.properties?.input || false}
            onChange={(e) => updateField("properties", { ...child.properties, input: e.target.checked })}
          />
          <Switch
            large
            innerLabel="Category"
            checked={child.properties?.category || false}
            onChange={(e) => updateField("properties", { ...child.properties, category: e.target.checked })}
          />
          {child.properties?.category && (
            <Switch
              large
              innerLabel="Group"
              checked={child.properties?.grouping?.enabled || false}
              onChange={(e) =>
                updateField("properties", {
                  ...child.properties,
                  grouping: {
                    ...(child.properties.grouping || {}),
                    enabled: e.target.checked,
                    units: child.properties.grouping?.units || [],
                  },
                })
              }
            />
          )}
          {groupingEnabled && (
            <Switch
              large
              innerLabel="Preset"
              checked={child.properties?.preset || false}
              onChange={(e) =>
                updateField("properties", {
                  ...child.properties,
                  preset: e.target.checked,
                })
              }
            />
          )}
        </div>
      </div>

      {child.properties?.grouping?.units && (
        <div className="grouping-container">
          <div className="grouping-unit-header">Grouping Units</div>
          <div className="grouping-units-list">
            {(child.properties.grouping?.units || []).map((unit, i) => (
              <div className="grouping-unit-row" key={`${child.name}-${i}`}>
                <InputGroup placeholder="Name" value={unit.key} onChange={(e) => updateUnit(i, "key", e.target.value)} />
                <InputGroup placeholder="Label" value={unit.label} onChange={(e) => updateUnit(i, "label", e.target.value)} />
                <InputGroup placeholder="Prefix" value={unit.prefix} onChange={(e) => updateUnit(i, "prefix", e.target.value)} />
                <InputGroup placeholder="Suffix" value={unit.suffix} onChange={(e) => updateUnit(i, "suffix", e.target.value)} />
                <HTMLSelect
                  options={[
                    { label: "Decimal", value: "decimal" },
                    { label: "Number", value: "number" },
                    { label: "Text", value: "text" }
                  ]}
                  value={unit.type}
                  onChange={(e) => updateUnit(i, "type", e.target.value)}
                />
                <Button icon="cross" minimal onClick={() => deleteUnit(i)} />
              </div>
            ))}
            <Button icon="plus" minimal onClick={addUnit} />
          </div>
        </div>
      )}

      {child.children?.length > 0 && (
        <div className="category-children-container">
          <div className="category-children-header">Children</div>
          <div className="nested-children">
            {(child.children || []).map((nested) => (
              <ChildEditor
                key={getTaskKey(nested)}
                child={{
                  ...nested,
                  parentGroupingUnits: child.properties?.grouping?.units || []
                }}
                updateChild={updateNestedChild}
                groupingEnabled={child.properties?.grouping?.enabled || false}
                removeChild={(id) => {
                  const updated = child.children.filter((c) => getTaskKey(c) !== id);
                  updateChild(child._id || child.tempId || child.id, { ...child, children: updated });
                }}
              />
            ))}
            <div className="nested-button">
              <Button icon="plus" minimal onClick={addNestedChild} />
            </div>
          </div>
        </div>
      )}
      {child.properties?.preset && child.parentGroupingUnits?.length > 0 && (
        <div className="preset-inputs">
          <div className="preset-inputs-header">Preset Values</div>
          {child.parentGroupingUnits.map((unit) => {
            const field = child.values?.input?.[unit.key];
            const value = typeof field === "object" ? field.value : field;
            const flow = typeof field === "object" ? field.flow : "in";
            const enabled = typeof field === "object" ? field.enabled !== false : true;

            console.log(unit);

            if (unit.key === "name") return;

            return (
              <div key={unit.key} className="preset-input-row">
                <Switch
                  checked={enabled}
                  onChange={(e) =>
                    updateField("values", {
                      ...child.values,
                      input: {
                        ...child.values?.input,
                        [unit.key]: {
                          ...(typeof field === "object" ? field : { value }),
                          enabled: e.target.checked,
                          flow,
                        },
                      },
                    })
                  }
                />
                <Tag minimal>{unit.label || unit.key}</Tag>
                {unit.type === "text" ? (
                  <InputGroup
                    value={value || ""}
                    onChange={(e) =>
                      updateField("values", {
                        ...child.values,
                        input: {
                          ...child.values?.input,
                          [unit.key]: e.target.value,
                        },
                      })
                    }
                  />
                ) : (
                  <>
                    <NumericInput
                      fill
                      value={value || 0}
                      onValueChange={(num) =>
                        updateField("values", {
                          ...child.values,
                          input: {
                            ...child.values?.input,
                            [unit.key]: { value: num, flow },
                          },
                        })
                      }
                      buttonPosition="none"
                    />
                    <Switch
                      innerLabel="In"
                      innerLabelChecked="Out"
                      checked={flow === "out"}
                      onChange={(e) =>
                        updateField("values", {
                          ...child.values,
                          input: {
                            ...child.values?.input,
                            [unit.key]: { value, flow: e.target.checked ? "out" : "in" },
                          },
                        })
                      }
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

const PreviewPanel = ({ previewTask, previewAssignments, setPreviewAssignments, onTaskUpdate }) => {
  const [selectedLeaves, setSelectedLeaves] = useState([]);
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  useEffect(() => {
    if (previewTask) {
      setSelectedLeaves(getSelectedLeaves(previewTask) || []);
    }
  }, [previewTask]);

  const onBeforeCapture = (before) => {
    setDraggedTaskId(before.draggableId);
  };

  const handlePreviewDrop = (result) => {
    if (!result.destination || !result.source) return;
    const { destination, draggableId } = result;
    setDraggedTaskId(null);

    if (destination.droppableId !== "preview_7:30 AM") return;

    const parentId = (previewTask._id || previewTask.tempId || previewTask.id || "").toString();

    if (draggableId === parentId) {
      const leaves = selectedLeaves.length > 0 ? selectedLeaves : [previewTask];
      const assignments = leaves.map((leaf) => ({
        ...leaf,
        id: leaf.id || leaf._id || leaf.tempId,
        assignmentId: `${leaf.id || leaf.tempId}-${Date.now()}-${Math.random()}`,
        assignmentAncestry: getTaskAncestryByIdDeep(previewTask?.children || [], leaf._id || leaf.tempId || leaf.id),
      }));
      setPreviewAssignments((prev) => ({
        ...prev,
        "7:30 AM": [...(prev["7:30 AM"] || []), ...assignments],
      }));
    }
  };

  const handleTaskUpdate = (updatedTask) => {
    setSelectedLeaves(getSelectedLeaves(updatedTask) || []);
    onTaskUpdate(updatedTask);
  };

  const previewTaskId = previewTask ? (previewTask._id || previewTask.tempId || previewTask.id || "").toString() : null;

  return (
    <div className="task-form-preview-panel">
      <h4>Preview</h4>
      <DragDropContext onBeforeCapture={onBeforeCapture} onDragEnd={handlePreviewDrop}>
        <div className="preview-bank-schedule">
          <div className="preview-taskbank">
            <Droppable droppableId="preview-bank">
              {(provided) => (
                <div className={(draggedTaskId == previewTaskId) ? "dragging" : ""} ref={provided.innerRef} {...provided.droppableProps}>
                  {previewTask && (
                    <TaskCard
                      draggedTaskId={draggedTaskId}
                      key={previewTask._id || previewTask.tempId || previewTask.id}
                      task={previewTask}
                      index={0}
                      preview
                      onEditTask={() => { }}
                      onOpenDrawer={() => { }}
                      onTaskUpdate={handleTaskUpdate}
                    />
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          <div className="preview-schedule">
            <ScheduleCard
              label="preview"
              timeSlot="7:30 AM"
              assignments={previewAssignments}
              setAssignments={setPreviewAssignments}
              onAssignmentsChange={() => { }}
            />
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};

const NewTaskForm = ({ task, onSave, onDelete }) => {
  const [stagedTask, setStagedTask] = useState(null);
  const stagedTaskRef = useRef(null);
  const [previewTask, setPreviewTask] = useState(null);
  const [previewAssignments, setPreviewAssignments] = useState({ "7:30 AM": [] });

  const dispatch = useDispatch();

  useEffect(() => {
    if (task) {
      const clone = structuredClone(task);
      setStagedTask(clone);
      stagedTaskRef.current = clone;
    } else {
      const temp = {
        id: uuidv4(),
        tempId: uuidv4(),
        name: "",
        properties: { card: true, category: true },
        children: [],
      };
      setStagedTask(temp);
      stagedTaskRef.current = temp;
    }
  }, [task]);

  const addChild = () => {
    const newChild = {
      id: uuidv4(),
      name: "",
      properties: { checkbox: false, input: false, category: false },
      values: { checkbox: false, input: "" },
      children: [],
    };
    setStagedTask((prev) => ({ ...prev, children: [...(prev.children || []), newChild] }));
  };

  const updateChild = useCallback((id, updatedChild) => {
    setStagedTask((prev) => ({
      ...prev,
      children: updateTaskByIdDeep(prev.children || [], id, updatedChild),
    }));
  }, []);

  const removeChild = (id) => {
    const filteredChildren = stagedTask.children.filter(
      (c) => (c._id || c.tempId || c.id) !== id
    );
    setStagedTask({ ...stagedTask, children: filteredChildren });
  };

  const handleSave = () => {
    if (!stagedTaskRef.current || !stagedTask) return;

    const { additions, updates, deletions } = diffTaskChildren(stagedTaskRef.current.children, stagedTask.children);

    additions.forEach((task) => dispatch(createTask(task)));
    updates.forEach(({ id, updates }) => dispatch(updateTask({ id, updates })));
    deletions.forEach((id) => {
      dispatch(deleteTaskOptimistic(id));
      dispatch(deleteTask(id));
    });

    const topLevelTask = {
      ...(stagedTask._id ? { _id: stagedTask._id } : {}),
      name: stagedTask.name,
      tempId: stagedTask.tempId,
      properties: stagedTask.properties || { card: true, category: true },
      children: stagedTask.children,
    };

    dispatch(updateTask({ id: topLevelTask._id || topLevelTask.tempId, updates: topLevelTask }));
    onSave(topLevelTask);
  };

  const handlePreviewTaskUpdate = (updatedTask) => {
    setPreviewTask(updatedTask);
  };

  return (
    <div className="task-form">
      <div className="task-form-edit-panel task-form-panel">
        <div className="edit-panel-header">{task ? "Edit Task" : "Create New Task"}</div>
        <div className="task-card-name">
          <Tag>Icon (emoji or BlueprintJS name)</Tag>
          <InputGroup
            placeholder="e.g. 🍽️ or symbol-circle"
            value={stagedTask?.properties?.icon || ""}
            onChange={(e) =>
              setStagedTask({
                ...stagedTask,
                properties: {
                  ...stagedTask.properties,
                  icon: e.target.value,
                },
              })
            }
          />
          <Tag intent="primary">Task Name</Tag>
          <InputGroup
            placeholder="Enter task name"
            value={stagedTask?.name || ""}
            onChange={(e) => setStagedTask({ ...stagedTask, name: e.target.value })}
          />
        </div>
        <div className="task-form-children-section">
          <div className="form-section-header">
            <div className="children-header">Children</div>
            <Button intent="primary" icon="plus" text="Add Subtask" onClick={addChild} />
          </div>
          <div className="task-form-children-list">
            {(stagedTask?.children || []).map((child) => {
              const id = child._id || child.tempId || child.id;
              const liveChild = stagedTask.children.find(
                (c) => (c._id || c.tempId || c.id) === id
              );

              return (
                <ChildEditor
                  key={getTaskKey(child)}
                  child={{
                    ...liveChild,
                    parentGroupingUnits: stagedTask.properties?.grouping?.units || []
                  }}
                  groupingEnabled={stagedTask.properties?.grouping?.enabled || false}
                  updateChild={updateChild}
                  removeChild={removeChild}
                />
              );
            })}
          </div>
        </div>

        <div className="task-form-actions">
          <Button intent="primary" onClick={handleSave} text={task ? "Update Task" : "Save Task"} />
          {task && (
            <Button
              intent="danger"
              onClick={() => onDelete(task)}
              text="Delete"
              style={{ marginLeft: "10px" }}
            />
          )}
        </div>
      </div>

      <PreviewPanel
        previewTask={stagedTask}
        previewAssignments={previewAssignments}
        setPreviewAssignments={setPreviewAssignments}
        onTaskUpdate={handlePreviewTaskUpdate}
      />
    </div>
  );
};

export default NewTaskForm;
