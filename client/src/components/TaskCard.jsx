// TaskCard.jsx (Finalized: grouped inputs as form for new, tags for presets)
import React, { useEffect, useRef, useState } from "react";
import {
  Card,
  Button,
  Collapse,
  Icon,
  InputGroup,
  Tag,
  Elevation,
  Checkbox,
  Switch,
  NumericInput
} from "@blueprintjs/core";
import { Draggable } from "react-beautiful-dnd";
import { useDispatch } from "react-redux";
import { createTask, addTaskOptimistic, updateTaskOptimistic} from "../store/tasksSlice";

const TaskCard = ({
  task,
  index,
  onEditTask,
  onOpenDrawer,
  onTaskUpdate,
  onInsertAdhoc,
  preview = false,
}) => {
  if (!task) return null;
  const dispatch = useDispatch();

  const taskStateRef = useRef(task);
  const [isOpen, setIsOpen] = useState(false);
  const [newPresetDraft, setNewPresetDraft] = useState({});
  const toggleCollapse = () => setIsOpen(!isOpen);
  const [adhocTempId, setAdhocTempId] = useState(null);

  console.log(taskStateRef);
  useEffect(() => {
  const name = newPresetDraft?.name?.trim();
  if (!newPresetDraft.checkbox || !name) return;

  if (adhocTempId) return;

  const tempId = `adhoc_${Date.now()}`;
  const adhoc = buildAdhocChildFromDraft({ ...newPresetDraft, checkbox: false }, tempId);
  if (!adhoc) return;

  console.log("adhoc", adhoc);
  onInsertAdhoc?.(adhoc); // <<< only line you change
  setAdhocTempId(tempId);
}, [newPresetDraft]);

  useEffect(() => {
    if (!adhocTempId) return;
  
    const updated = buildAdhocChildFromDraft({ ...newPresetDraft, checkbox: false }, adhocTempId);
    dispatch(updateTaskOptimistic({ id: adhocTempId, updates: updated }));
  }, [newPresetDraft, adhocTempId]);

  console.log(taskStateRef.current);
  const updateChildValue = (childrenArray, childId, key, newValue) => {
    return childrenArray.map((child) => {
      const childKey = child._id || child.tempId || child.id;
      if (childKey?.toString() === childId?.toString()) {
        const updatedValues = { ...(child.values || {}), [key]: newValue };
        return { ...child, values: updatedValues };
      } else if (child.children && child.children.length > 0) {
        return {
          ...child,
          children: updateChildValue(child.children, childId, key, newValue),
        };
      }
      return child;
    });
  };

  const handleChildChange = (childId, key, newValue) => {
    const updatedChildren = updateChildValue(
      taskStateRef.current.children || [],
      childId,
      key,
      newValue
    );
    taskStateRef.current = {
      ...taskStateRef.current,
      children: updatedChildren,
    };
    if (onTaskUpdate) onTaskUpdate(taskStateRef.current);
  };

  const handleNewPresetChange = (key, value, parentId) => {
    setNewPresetDraft((prev) => {
      const tempId = prev.tempId || `adhoc_${Date.now()}`;
      return {
        ...prev,
        [key]: value,
        parentId,
        tempId,
      };
    });
  };

  const buildAdhocChildFromDraft = (draft) => {
    if (!draft.name?.trim()) return null;
  
    return {
      id: draft.tempId,
      tempId: draft.tempId,
      name: draft.name.trim(),
      properties: { group: true, checkbox: true, input: true, card: false, category: false },
      values: {
        checkbox: draft.checkbox || false,
        input: { ...draft },
      },
      children: [],
      goals: [],
      counters: [],
      parentId: draft.parentId,
    };
  };

  const injectAdhocIntoCategory = (node, parentId, adhocChild) => {
    const currentId = node._id || node.tempId || node.id || parentId;
    console.log(adhocChild);
    if (!currentId) return node;
  
    if (currentId.toString() === parentId.toString()) {
      const filtered = (node.children || []).filter((c) => !c.id?.startsWith("adhoc_"));
      return {
        ...node,
        children: [...filtered, adhocChild],
      };
    }
  
    if (Array.isArray(node.children) && node.children.length > 0) {
      return {
        ...node,
        children: node.children.map((child) =>
          injectAdhocIntoCategory(child, parentId, adhocChild)
        ),
      };
    }
  
    return node;
  };
  
const saveNewPreset = () => {
  if (!newPresetDraft.name?.trim()) return;

  const presetTask = buildAdhocChildFromDraft({ ...newPresetDraft, checkbox: false }, adhocTempId || `preset_${Date.now()}`);
  if (!presetTask) return;

  dispatch(updateTaskOptimistic({ id: presetTask.id, updates: presetTask }));
  dispatch(createTask(presetTask));

  setAdhocTempId(null);
  setNewPresetDraft({});
};

  const renderChildren = (childrenArray, parentGroupingUnits = [], parentId = null) => {
  const rendered = childrenArray
    .filter((child) => !child.id?.toString().startsWith("adhoc_"))
    .map((child) => {
      const childKey = child._id || child.tempId || child.id;
      const isGroupedInput =
        child.properties?.group &&
        child.properties?.input &&
        Array.isArray(parentGroupingUnits) &&
        parentGroupingUnits.length > 0;

      if (child.properties?.category) {
        const groupingUnits = child.properties?.grouping?.units || [];
        return (
          <div key={childKey} className="category-container">
            <div className="category-name">
              <Tag minimal>{child.name}</Tag>
            </div>
            {child.children?.length > 0 && (
              <Collapse isOpen keepChildrenMounted>
                <div className={`category-collapse ${groupingUnits.length > 0 ? "grouped-category" : ""}`}>
                  {renderChildren(child.children, groupingUnits, child._id)}
                </div>
              </Collapse>
            )}
          </div>
        );
      }

      return (
        <Tag
          key={childKey}
          className="child-task"
          intent="primary"
          elevation={Elevation.FOUR}
          minimal={!child.values?.checkbox}
        >
          {child.properties?.checkbox && (
            <Checkbox
              checked={child.values?.checkbox ?? false}
              onChange={(e) =>
                handleChildChange(childKey, "checkbox", e.target.checked)
              }
            />
          )}
          <div className="child-task-name">{child.name}</div>
          {/* 👇 Fallback for simple input tasks (not grouped or category) */}
          {child.properties?.input &&
            !child.properties?.group &&
            !child.properties?.category && (
              <InputGroup
                placeholder="Enter value..."
                value={child.values?.input || ""}
                onChange={(e) =>
                  handleChildChange(childKey, "input", e.target.value)
                }
                className="simple-input"
              />
            )}

          {isGroupedInput &&
            parentGroupingUnits.length > 0 &&
            (Boolean(child.name) ? (
              <div
                className="preset-values"
              >
                {parentGroupingUnits.map((unit) => {
                  if (unit.key === "name") return null;
                  const field = child.values?.input?.[unit.key];
                  const value =
                    typeof field === "object" ? field.value : field;
                  const flow =
                    typeof field === "object" ? field.flow : "in";

                  return (
                    <Tag key={`${childKey}-${unit.key}`} className="preset-unit" minimal>
                      <div className="unit-label">
                        {`${unit.label}:`}
                      </div>
                      <div className={`unit-value ${flow === 'in' ? 'increased_value' : 'decreased_value'}`}>
                        {unit.type === "text"
                          ? value
                          : `${value}`}
                      </div>
                    </Tag>
                  );
                })}
              </div>
            ) : (
              parentGroupingUnits.map((unit) => {
                const field = child.values?.input?.[unit.key];
                const value =
                  typeof field === "object" ? field.value : field;
                const flow =
                  typeof field === "object" ? field.flow : "in";

                return (
                  <div
                    key={`${childKey}-${unit.key}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginTop: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    {unit.type === "text" ? (
                      <InputGroup
                        placeholder={unit.label}
                        value={value || ""}
                        onChange={(e) =>
                          handleChildChange(childKey, "input", {
                            ...child.values?.input,
                            [unit.key]: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <>
                        <NumericInput
                          fill
                          value={value || ""}
                          onValueChange={(num) =>
                            handleChildChange(childKey, "input", {
                              ...child.values?.input,
                              [unit.key]: {
                                value: num,
                                flow,
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
                            handleChildChange(childKey, "input", {
                              ...child.values?.input,
                              [unit.key]: {
                                value,
                                flow: e.target.checked ? "out" : "in",
                              },
                            })
                          }
                        />
                      </>
                    )}
                  </div>
                );
              })
            ))}
        </Tag>
      );

    });


    if (parentGroupingUnits?.length > 0) {
      rendered.push(
        <Tag key="virtual-new-entry" className="child-task new-entry" minimal intent="primary">
          <div className="new-entry-controls">
            <div className="control-inputs">
              <Checkbox
                checked={newPresetDraft.checkbox ?? false}
                onChange={(e) =>
                  handleNewPresetChange("checkbox", e.target.checked, parentId)
                }
              />
              <InputGroup
                placeholder="Name"
                value={newPresetDraft.name || ""}
                onChange={(e) => handleNewPresetChange("name", e.target.value, parentId)}
                className="preset-name-input"
              />
            </div>
            <div className="preset-save-container">
              <Button
                icon="floppy-disk"
                intent="primary"
                className="preset-save"
                onClick={saveNewPreset}
                disabled={!newPresetDraft.name}
              />
            </div>
          </div>
          <div className="preset-inputs">
            {parentGroupingUnits.map((unit) => {
              if (unit.key === "name") return null;

              return (
                <div
                  key={`new-${unit.key}`}
                  className="preset-input"
                >
                  <Tag minimal intent="primary">{unit.label}</Tag>
                  {unit.type === "text" ? (
                    <InputGroup
                      value={newPresetDraft[unit.key] || ""}
                      onChange={(e) =>
                        handleNewPresetChange(unit.key, e.target.value, parentId)
                      }
                    />
                  ) : (
                    <>
                      <NumericInput
                        fill
                        value={newPresetDraft[unit.key]?.value || ""}
                        onValueChange={(num) =>
                          handleNewPresetChange(unit.key, {
                            value: num,
                            flow: newPresetDraft[unit.key]?.flow || "in",
                          }, parentId)
                        }
                        buttonPosition="none"
                      />
                      <Switch
                        innerLabel="In"
                        innerLabelChecked="Out"
                        checked={newPresetDraft[unit.key]?.flow === "out"}
                        onChange={(e) =>
                          handleNewPresetChange(unit.key, {
                            value: newPresetDraft[unit.key]?.value || 0,
                            flow: e.target.checked ? "out" : "in",
                          }, parentId)
                        }
                      />
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </Tag>
      );
    }

    return rendered;
  };

  const taskId =
    (task._id || task.tempId || task.id || "unknown-task").toString();

  const cardContent = (
    <Card
      elevation={2}
      className={`task-card${preview ? " preview" : ""}`}
      style={{
        cursor: preview ? "default" : "grab",
        opacity: preview ? 1 : undefined,
      }}
    >
      <div className="task-header">
        <div className="task-header-left">
          {task.children?.length > 0 ? (
            <Button
              icon={isOpen ? "caret-down" : "caret-right"}
              onClick={toggleCollapse}
              minimal
            />
          ) : (
            <Icon icon="dot" />
          )}
          <div className="task-name">{task.name}</div>
        </div>

        {!preview && (
          <div className="task-header-right">
            <Button
              icon="cog"
              className="edit-task-button"
              minimal
              onClick={() => {
                onEditTask(task);
                onOpenDrawer();
              }}
            />
            <Icon className="drag-icon" icon="horizontal-inbetween" />
          </div>
        )}
      </div>

      {task.children?.length > 0 && (
        <Collapse
          className="task-children-collapse"
          isOpen={isOpen}
          keepChildrenMounted
        >
          <div className="task-children">
            {renderChildren(
              taskStateRef.current.children || [],
              task.properties?.grouping?.units,
              task._id
            )}
          </div>
        </Collapse>
      )}
    </Card>
  );

  return (
    <Draggable
      draggableId={taskId}
      index={index}
      isDragDisabled={false}
    >
      {(provided, snapshot) =>
        React.cloneElement(cardContent, {
          ref: provided.innerRef,
          ...provided.draggableProps,
          ...provided.dragHandleProps,
          className: `task-card${preview ? " preview" : ""}${snapshot.isDragging ? " dragging" : ""}`,
          style: {
            ...provided.draggableProps.style,
            cursor: snapshot.isDragging ? "grabbing" : "grab",
            opacity: snapshot.isDragging ? 0.5 : 1,
          },
        })
      }
    </Draggable>
  );
}
export default TaskCard;
