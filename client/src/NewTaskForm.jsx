// NewTaskForm.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import EmojiIconPicker from "./components/EmojiIconPicker";

import { DragDropContext, Droppable } from "react-beautiful-dnd";
import { v4 as uuidv4 } from "uuid";
import {
  getSelectedLeaves,
  getTaskKey,
  getTaskAncestryByIdDeep,
  updateTaskByIdDeep,
  getAllGroupEnabledIds,
  findTaskByIdDeep,
  getTaskAncestryIdsByIdDeep,
  formatValueWithAffixes
} from "./helpers/taskUtils";
import "./NewTaskForm.css";

import { useDispatch } from "react-redux";
import {
  deleteTask,
  deleteTaskOptimistic,
  addTaskOptimistic,
  updateTaskOptimistic,
  createTask,
  updateTask,
} from "./store/tasksSlice";
import { diffTaskChildren } from "./helpers/taskUtils";
import TaskIcon from "./components/TaskIcon";

function reassignOrderToChildren(children) {
  return children.map((child, index) => ({
    ...child,
    properties: {
      ...child.properties,
      order: index,
    },
  }));
}

const ChildEditor = ({ child, updateChild, stagedTask, allGroupIds, removeChild, groupingEnabled, siblingIndex, totalSiblings }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [groupedUnits, setGroupedUnits] = useState([]);

  function getRelevantParentUnitsForChild(stagedTask, childId, allGroupIds) {
    if (!stagedTask || !childId || !Array.isArray(allGroupIds)) return [];

    const ancestryIds = getTaskAncestryIdsByIdDeep([stagedTask], childId);
    if (!Array.isArray(ancestryIds)) return [];

    // Filter for group-enabled ancestors, excluding the child itself
    const matchingAncestorIds = ancestryIds.filter(
      (id) => id !== childId && allGroupIds.includes(id)
    );

    // Collect units from those matching ancestor tasks
    const units = matchingAncestorIds.flatMap((id) => {
      const node = findTaskByIdDeep(id, [stagedTask]);
      return Array.isArray(node?.properties?.grouping?.units)
        ? node.properties.grouping.units
        : [];
    });

    return units;
  }
  useEffect(() => {
    if (!stagedTask && !child && !allGroupIds) return;

    refreshGroupedUnits(stagedTask, child, allGroupIds);
  }, [allGroupIds, child, stagedTask]);

  const moveOrder = (direction) => {
    const currentId = child._id || child.tempId || child.id;
    const siblings = stagedTask?.children || [];
  
    const index = siblings.findIndex((c) => (c._id || c.tempId || c.id) === currentId);
    const newIndex = index + direction;
  
    if (index === -1 || newIndex < 0 || newIndex >= siblings.length) return;
  
    const reordered = [...siblings];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
  
    const updatedSiblings = reassignOrderToChildren(reordered);
  
    // 🔁 Update the whole reordered array
    updateChild(currentId, updatedSiblings);
  };
  const refreshGroupedUnits = (stagedTask, child, allGroupIds) => {
    const groupedUnits = getRelevantParentUnitsForChild(stagedTask, child._id || child.tempId || child.id, allGroupIds);
    setGroupedUnits(groupedUnits);
  }
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
      properties: { checkbox: false, input: false, group: false, preset: false, order: (child.children?.length || 0), },
      values: { checkbox: false, input: {} },
      children: [],
    };
    updateChild(child._id || child.tempId || child.id, {
      ...child,
      children: [...(child.children || []), newChild],
    });

  };

  const addUnit = () => {
    const currentUnits = child.properties.grouping?.units || [];
    const updatedUnits = [
      ...currentUnits,
      {
        name: "", // label
        key: uuidv4(), // uniquely identifies the unit
        prefix: "",
        suffix: "",
        type: "float",
        enabled: true,
        isMulti: false,
        icon: {}
      },
    ];
    updateField("properties", {
      ...child.properties,
      grouping: {
        ...child.properties.grouping,
        units: updatedUnits,
      },
    });
  };

  const updateUnit = (index, field, value) => {
    const updatedUnits = [...(child.properties.grouping?.units || [])];
    updatedUnits[index][field] = value;
    updateField("properties", {
      ...child.properties,
      grouping: {
        ...child.properties.grouping,
        units: updatedUnits,
      },
    });
  };

  const deleteUnit = (index) => {
    const updatedUnits = (child.properties.grouping?.units || []).filter((_, i) => i !== index);
    updateField("properties", {
      ...child.properties,
      grouping: {
        ...child.properties.grouping,
        units: updatedUnits,
      },
    });
  };

  return (
    <div className="child-editor">
      <div className={`category-children-header ${isHovered ? 'hovered-title' : ''}`}>{`${child.name}`}</div>
      <div className={`child-editor-row ${isHovered ? 'hovered' : ''}`}>
        <div className="child-editor-header">
          <div className="child-order-arrows">
            <Button icon="arrow-up" minimal disabled={siblingIndex === 0} onClick={() => moveOrder(-1)} />
            <Button icon="arrow-down" minimal disabled={siblingIndex === totalSiblings - 1} onClick={() => moveOrder(1)} />
          </div>
          <EmojiIconPicker
            value={child?.properties?.icon}
            onChange={(val) =>
              updateField("properties", { ...child.properties, icon: val })
            }
          />
          <div className="child-name-column">
            <Tag minimal>Name</Tag>
            <InputGroup
              value={child.name}
              placeholder="Child name"
              onChange={(e) => updateField("name", e.target.value)}
            />
          </div>
          <div className="child-input-options-container">

            <div className="child-input-options-header">Options</div>
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
                onChange={(e) => {
                  updateField("properties", {
                    ...child.properties,
                    category: e.target.checked,
                  });

                  if (e.target.checked && !child.children) {
                    updateChild(child._id || child.tempId || child.id, {
                      ...child,
                      children: [],
                    });
                  }
                }}
              />
              {child.properties?.category && (
                <Switch
                  large
                  innerLabel="Group"
                  checked={child.properties?.group || false}
                  onChange={(e) =>
                    updateField("properties", {
                      ...child.properties,
                      group: e.target.checked,
                      grouping: {
                        ...(child.properties.grouping || {}),
                        units: child.properties.grouping?.units || [],
                      },
                    })
                  }
                />
              )}
              {(groupedUnits?.length > 0) && (
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
          <Button
            icon="cross"
            minimal
            className="child-remove-button"
            onClick={() => removeChild(child._id || child.tempId || child.id)}
          />
        </div>

        {child.properties?.group && child.properties?.grouping?.units && (
          <div className="category-children-container">
            <div className="category-children-header">{`${child.name} > Grouping Units`}</div>
            <div className="nested-children">
              {(child.properties.grouping?.units || []).map((unit, i) => (
                <div className="grouping-unit-row" key={`${child.name}-${i}`}>
                  <EmojiIconPicker
                    value={unit.icon}
                    onChange={(val) => updateUnit(i, "icon", val)}
                  />
                  <InputGroup placeholder="Label" value={unit.name} onChange={(e) => updateUnit(i, "name", e.target.value)} />
                  <InputGroup placeholder="Prefix" value={unit.prefix} onChange={(e) => updateUnit(i, "prefix", e.target.value)} />
                  <InputGroup placeholder="Suffix" value={unit.suffix} onChange={(e) => updateUnit(i, "suffix", e.target.value)} />
                  <HTMLSelect
                    options={[
                      { label: "Decimal", value: "float" },
                      { label: "Number", value: "integer" },
                      { label: "Text", value: "string" }
                    ]}
                    value={unit.type}
                    onChange={(e) => updateUnit(i, "type", e.target.value)}
                  />
                  <Button icon="cross" minimal onClick={() => deleteUnit(i)} />
                </div>
              ))}
              <Button icon="plus" minimal onClick={addUnit} text={`Add ${child.name} Grouped Unit`} />
            </div>
          </div>
        )}

        {child.properties?.preset && groupedUnits?.length > 0 && (
          <div className="preset-inputs">
            <div className="preset-inputs-header">{`${child.name} > Preset Values`}</div>
            {groupedUnits.map((unit) => {
              const field = child.values?.input?.[unit.key];
              const value = typeof field === "object" ? field.value : field;
              const flow = typeof field === "object" ? field.flow : "in";
              const enabled = typeof field === "object" ? field.enabled !== false : true;

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
                  <TaskIcon icon={unit.icon} />
                  <Tag minimal>{unit.label || unit.key}</Tag>
                  {unit.type === "text" ? (
                    <>
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
                      <HTMLSelect
                        value={flow || "in"}
                        onChange={(e) =>
                          updateField("values", {
                            ...child.values,
                            input: {
                              ...child.values?.input,
                              [unit.key]: { value, flow: e.target.value },
                            },
                          })
                        }
                        options={[
                          { label: "Append", value: "in" },
                          { label: "Retract", value: "out" },
                          { label: "Replace", value: "replace" }
                        ]}
                      />
                    </>
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
                      <HTMLSelect
                        value={flow || "in"}
                        onChange={(e) =>
                          updateField("values", {
                            ...child.values,
                            input: {
                              ...child.values?.input,
                              [unit.key]: { value, flow: e.target.value },
                            },
                          })
                        }
                        options={[
                          { label: "In", value: "in" },
                          { label: "Out", value: "out" },
                          { label: "Replace", value: "replace" }
                        ]}
                      />

                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {child.properties?.category && (
          <div className="category-children-container">
            <div className="category-children-header">{`${child.name} > Children`}</div>
            <div className="nested-children">
              {(child.children || [])
                .sort((a, b) => (a.properties?.order ?? 0) - (b.properties?.order ?? 0))
                .map((nested, index, array) => (
                  <ChildEditor
                    key={getTaskKey(nested)}
                    child={{ ...nested }}
                    updateChild={updateNestedChild}
                    allGroupIds={allGroupIds}
                    stagedTask={stagedTask}
                    siblingIndex={index}
                    totalSiblings={array.length}
                    removeChild={(id) => {
                      const updated = child.children.filter((c) => getTaskKey(c) !== id);
                      updateChild(child._id || child.tempId || child.id, { ...child, children: updated });
                    }}
                  />
                ))}

              <div className="nested-button"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <Button icon="plus" minimal onClick={addNestedChild} text={`Add ${child.name} Child`} />
              </div>
            </div>
          </div>
        )}
      </div>
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
  console.log(previewTask);
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

const NewTaskForm = ({ task, onSave, onDelete, taskListLength = 0 }) => {
  const [stagedTask, setStagedTask] = useState(null);
  const stagedTaskRef = useRef(null);
  const [previewTask, setPreviewTask] = useState(null);
  const [previewAssignments, setPreviewAssignments] = useState({ "7:30 AM": [] });

  const dispatch = useDispatch();
  const [ancestorGroupingIds, setAncestorGroupingIds] = useState([]);
  useEffect(() => {
    if (task) {
      const clone = structuredClone(task);
      // Ensure ID fields persist
      clone._id = task._id;
      clone.tempId = task.tempId || task._id;
      setStagedTask(clone);
      stagedTaskRef.current = clone;
    } else {
      const temp = {
        id: uuidv4(),
        tempId: uuidv4(),
        name: "",
        properties: { card: true, category: true, order: taskListLength },
        children: [],
      };
      setStagedTask(temp);
      stagedTaskRef.current = temp;
    }
  }, [task]);

  useEffect(() => {
    if (!stagedTask) return;

    const allGroupIds = getAllGroupEnabledIds(stagedTask);

    setAncestorGroupingIds(allGroupIds);
  }, [stagedTask]);

  const addChild = () => {
    const newChild = {
      id: uuidv4(),
      name: "",
      properties: { checkbox: false, input: false, category: false, order: (stagedTask?.children?.length || 0) },
      values: { checkbox: false, input: "" },
      children: [],
    };
    setStagedTask((prev) => ({ ...prev, children: [...(prev.children || []), newChild] }));
  };

  const updateChild = useCallback((id, updatedChildOrArray) => {
    setStagedTask((prev) => {
      let children;
  
      if (Array.isArray(updatedChildOrArray)) {
        children = updatedChildOrArray;
      } else {
        children = [...(prev.children || [])].map((child) =>
          (child._id || child.tempId || child.id) === id ? updatedChildOrArray : child
        );
      }
  
      const updatedTask = { ...prev, children };
  
      // ✅ Ensure both staged and preview task reflect the new structure
      setPreviewTask(updatedTask);
      return updatedTask;
    });
  }, []);
  const removeChild = (id) => {
    const filteredChildren = stagedTask.children.filter(
      (c) => (c._id || c.tempId || c.id) !== id
    );
    setStagedTask({ ...stagedTask, children: filteredChildren });
  };

  const handleSave = () => {
    if (!stagedTask) return;
    if (stagedTask._id) {
      dispatch(updateTaskOptimistic({ id: stagedTask._id, updates: stagedTask }));
      dispatch(updateTask({ id: stagedTask._id, updates: stagedTask }));
    } else {
      dispatch(addTaskOptimistic(stagedTask));
      dispatch(createTask(stagedTask));
    }

    onSave?.(stagedTask);
  };
  // const handleSave = () => {
  //   if (!stagedTaskRef.current || !stagedTask) return;

  //   const {additions, updates, deletions} = diffTaskChildren(stagedTaskRef.current.children, stagedTask.children);

  //   additions.forEach((task) => dispatch(createTask(task)));
  //   updates.forEach(({id, updates}) => dispatch(updateTask({id, updates})));
  //   deletions.forEach((id) => {
  //     dispatch(deleteTaskOptimistic(id));
  //     dispatch(deleteTask(id));
  //   });

  //   const topLevelTask = {
  //     ...(stagedTask._id ? {_id: stagedTask._id } : { }),
  //     name: stagedTask.name,
  //     tempId: stagedTask.tempId,
  //     properties: stagedTask.properties || {card: true, category: true },
  //     children: stagedTask.children,
  //   };

  //   if (topLevelTask._id) {
  //     dispatch(updateTask({id: topLevelTask._id, updates: topLevelTask }));
  //   } else {
  //     dispatch(createTask(topLevelTask));
  //   }
  //   onSave(topLevelTask); 
  // };

  const handlePreviewTaskUpdate = (updatedTask) => {
    setPreviewTask(updatedTask);
  };
  return (
    <div className="task-form">
      <div className="task-form-edit-panel task-form-panel">
        <div className="edit-panel-header">{task ? "Edit Task" : "Create New Task"}</div>
        <div className="task-card-name">
          {/* <InputGroup
            placeholder="icon"
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
          /> */}
          <EmojiIconPicker
            value={stagedTask?.properties?.icon}
            onChange={(val) =>
              setStagedTask({
                ...stagedTask,
                properties: {
                  ...stagedTask.properties,
                  icon: val,
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
            <div className="children-header">{`${stagedTask?.name} > Children`}</div>
            <Button intent="primary" icon="plus" text="Add Subtask" onClick={addChild} />
          </div>
          <div className="task-form-children-list">
            {(stagedTask?.children || [])
              .filter(child => !child.properties?.adhoc)
              .sort((a, b) => (a.properties?.order ?? 0) - (b.properties?.order ?? 0))
              .map((child, index, array) => {
                const id = child._id || child.tempId || child.id;
                const liveChild = stagedTask.children.find(
                  (c) => (c._id || c.tempId || c.id) === id
                );

                return (
                  <ChildEditor
                    key={getTaskKey(child)}
                    child={{
                      ...liveChild
                    }}
                    allGroupIds={ancestorGroupingIds}
                    updateChild={updateChild}
                    removeChild={removeChild}
                    stagedTask={{ ...stagedTask }}
                    siblingIndex={index}
                    totalSiblings={array.length}
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
