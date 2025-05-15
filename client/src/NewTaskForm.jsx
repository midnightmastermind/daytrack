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
import { getSelectedLeaves, getTaskKey, getTaskAncestryByIdDeep, updateTaskByIdDeep } from "./helpers/taskUtils";
import "./NewTaskForm.css";

import { useDispatch } from "react-redux";
import { deleteTask, deleteTaskOptimistic, updateTask, createTask } from "./store/tasksSlice";
import { diffTaskChildren } from "./helpers/taskUtils"; // or wherever you placed it

const ChildEditor = ({ child, updateChild, removeChild, setStaged }) => {

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
      properties: { checkbox: false, input: false, category: false },
      values: { checkbox: false, input: {} },
      children: [],
    };
    updateChild(child._id || child.tempId || child.id, {
      ...child,
      children: [...(child.children || []), newChild],
    });
  };

  const addUnit = () => {
    const updatedUnits = [...(child.properties.grouping?.units || []), { key: "", label: "", type: "text" }];
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
              value={child.name} // ✅
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
        </div>
      </div>

      {/* Grouping UI */}
      {child.properties?.category && child.properties?.grouping?.enabled && (
        <div className="grouping-container">
          <div className="grouping-unit-header">Grouping Units</div>
          <div className="grouping-units-list">
            {(child.properties.grouping?.units || []).map((unit, i) => (
              <div className="grouping-unit-row" key={`${child.name}-${i}`}>
                <div>
                  <Tag minimal>Name</Tag>
                  <InputGroup
                    placeholder="Key"
                    value={unit.key}
                    onChange={(e) => updateUnit(i, "key", e.target.value)}
                  />
                </div>
                <div>
                  <Tag minimal>Label</Tag>
                  <InputGroup
                    placeholder="Label"
                    value={unit.label}
                    onChange={(e) => updateUnit(i, "label", e.target.value)}
                  />
                </div>
                <div>
                  <Tag minimal>Type</Tag>
                  <HTMLSelect
                    options={[
                      { label: "Text", value: "text" },
                      { label: "Number", value: "number" },
                    ]}
                    value={unit.type}
                    onChange={(e) => updateUnit(i, "type", e.target.value)}
                  />
                </div>
                <Button icon="cross" minimal onClick={() => deleteUnit(i)} />
              </div>
            ))}
            <Button icon="plus" minimal onClick={addUnit} />
          </div>

          <div className="preset-inputs-header">Presets</div>
          <div className="presets-container">
            <div className="nested-children">
              {(child.children || []).map((nested) => (
                <div key={nested.id} className="preset-child-editor">
                  <div className="child-editor-row">
                    <InputGroup
                      value={nested.name}
                      placeholder="Preset name"
                      onChange={(e) =>
                        updateNestedChild(nested.id, { ...nested, name: e.target.value })
                      }
                    />
                    <div className="child-editor-switches">
                      <Switch
                        large
                        innerLabel="Checkbox"
                        checked={nested.properties?.checkbox || false}
                        onChange={(e) =>
                          updateNestedChild(nested.id, {
                            ...nested,
                            properties: {
                              ...nested.properties,
                              checkbox: e.target.checked,
                            },
                          })
                        }
                      />
                      <Switch
                        large
                        innerLabel="Input"
                        checked={nested.properties?.input || false}
                        onChange={(e) =>
                          updateNestedChild(nested.id, {
                            ...nested,
                            properties: {
                              ...nested.properties,
                              input: e.target.checked,
                            },
                          })
                        }
                      />
                    </div>
                    <Button icon="cross" minimal onClick={() =>
                      updateChild(child._id || child.tempId || child.id, {
                        ...child,
                        children: child.children.filter(
                          (c) => (c._id || c.tempId || c.id) !== (nested._id || nested.tempId || nested.id)
                        ),
                      })
                    }
                    />
                  </div>
                  <div className="preset-inputs">
                    {(child.properties.grouping?.units || []).map((unit) => {
                      if (unit.key === "name") return null;
                      const field = nested.values?.input?.[unit.key];
                      const value = typeof field === "object" ? field.value : field;
                      const flow = typeof field === "object" ? field.flow : "in";
                      return (
                        <div key={unit.key} className="preset-input-row">
                          <Tag minimal>{unit.label}</Tag>
                          {unit.type === "text" ? (
                            <InputGroup
                              value={value || ""}
                              onChange={(e) =>
                                updateNestedChild(nested.id, {
                                  ...nested,
                                  values: {
                                    ...nested.values,
                                    input: {
                                      ...nested.values?.input,
                                      [unit.key]: e.target.value,
                                    },
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
                                  updateNestedChild(nested.id, {
                                    ...nested,
                                    values: {
                                      ...nested.values,
                                      input: {
                                        ...nested.values?.input,
                                        [unit.key]: {
                                          value: num,
                                          flow,
                                        },
                                      },
                                    },
                                  })
                                }
                                buttonPosition="none"
                              />
                              <div className="flow-switch">
                                <Switch
                                  innerLabel="In"
                                  innerLabelChecked="Out"
                                  checked={flow === "out"}
                                  onChange={(e) =>
                                    updateNestedChild(nested.id, {
                                      ...nested,
                                      values: {
                                        ...nested.values,
                                        input: {
                                          ...nested.values?.input,
                                          [unit.key]: {
                                            value,
                                            flow: e.target.checked ? "out" : "in",
                                          },
                                        },
                                      },
                                    })
                                  }
                                />
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="nested-button">
              <Button icon="plus" minimal onClick={addNestedChild} />
            </div>
          </div>
        </div>
      )}

      {child.properties?.category && !child.properties?.grouping?.enabled && (
        <div className="category-children-container">
          <div className="category-children-header">Children</div>
          <div className="nested-children">
            {(child.children || []).map((nested) => (
              <ChildEditor
                key={getTaskKey(nested)}
                child={nested}
                updateChild={updateNestedChild}
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
    const taskId = before.draggableId;
    setDraggedTaskId(taskId); // set it early
  };

  const handlePreviewDrop = (result) => {
    if (!result.destination || !result.source) return;
    const { destination, draggableId } = result;
    setDraggedTaskId(null); // set it early

    if (destination.droppableId !== "preview_7:30 AM") return;

    const parentId = (previewTask._id || previewTask.tempId || previewTask.id || "").toString();

    if (draggableId === parentId) {
      if (selectedLeaves.length > 0) {
        // ✅ Some children checked — insert them
        const assignmentLeaves = selectedLeaves.map((leaf) => ({
          ...leaf,
          id: leaf.id || leaf._id || leaf.tempId,
          assignmentId: `${leaf.id || leaf.tempId}-${Date.now()}-${Math.random()}`,
          assignmentAncestry: getTaskAncestryByIdDeep(previewTask?.children || [], leaf._id || leaf.tempId || leaf.id),
        }));

        console.log(assignmentLeaves);
        setPreviewAssignments((prev) => ({
          ...prev,
          "7:30 AM": [...(prev["7:30 AM"] || []), ...assignmentLeaves],
        }));
      } else {
        // 🧠 No children selected — fallback to inserting the parent itself
        const assignmentReadyLeaf = {
          ...previewTask,
          id: previewTask.id || previewTask._id || previewTask.tempId,
          assignmentId: `${previewTask.id || previewTask.tempId}-${Date.now()}-${Math.random()}`,
          assignmentAncestry: [],
        };

        setPreviewAssignments((prev) => ({
          ...prev,
          "7:30 AM": [...(prev["7:30 AM"] || []), assignmentReadyLeaf],
        }));
      }
    }
  };


  const handleTaskUpdate = (updatedTask) => {
    // 🔥 Every time you check a box or input something, refresh the selectedLeaves
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
                  {/* Always render the full parent task for editing */}
                  {previewTask && (
                    <TaskCard
                      draggedTaskId={draggedTaskId}
                      key={previewTask._id || previewTask.tempId || previewTask.id}
                      task={previewTask}
                      index={0}
                      preview
                      onEditTask={() => { }}
                      onOpenDrawer={() => { }}
                      onTaskUpdate={handleTaskUpdate} // 🔥 use the new live handler
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
    setStagedTask(prev => ({ ...prev, children: [...(prev.children || []), newChild] }));
  };

  const updateChild = useCallback((id, updatedChild) => {
    setStagedTask(prev => ({
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
          <Tag intent="primary">
            Task Name
          </Tag>
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
                  child={liveChild}
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
