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
  NumericInput,
  HTMLSelect
} from "@blueprintjs/core";
import { Draggable } from "react-beautiful-dnd";
import { useDispatch } from "react-redux";
import { createTask, addTaskOptimistic, updateTaskOptimistic } from "../store/tasksSlice";
import { getSelectedLeaves, sanitizeInputValues, formatValueWithAffixes, getAncestorGroupingUnits, findTaskByIdDeep } from "../helpers/taskUtils";
import TaskIcon from "./TaskIcon";
import EmojiIconPicker from "./EmojiIconPicker";

const TaskCard = ({
  task,
  index,
  onEditTask,
  onTaskUpdate,
  onInsertAdhoc,
  draggedTaskId,
  preview = false,
}) => {
  if (!task) return null;
  const dispatch = useDispatch();

  const taskStateRef = useRef(task);
  const [isOpen, setIsOpen] = useState(false);
  const [newPresetDraft, setNewPresetDraft] = useState({});
  const [draftSessionId, setDraftSessionId] = useState(null); // new

  const [localTask, setLocalTask] = useState(task);
  const toggleCollapse = () => setIsOpen(!isOpen);

  useEffect(() => {
    if (!onInsertAdhoc) return;
    if (isDraftEmpty(newPresetDraft)) return;
    onInsertAdhoc(newPresetDraft.tempId, newPresetDraft);
  }, [newPresetDraft]);

  useEffect(() => {
    const myId = (task._id || task.tempId || task.id || "").toString();
    if (draggedTaskId === myId) {
      setIsOpen(false);
      setNewPresetDraft({});
      setDraftSessionId(null); // 🧹 reset the session ID
    }
  }, [draggedTaskId]);
  function isDraftEmpty(draft) {
    return !draft.name?.trim() &&
      !draft.checkbox &&
      !Object.entries(draft).some(([key, val]) => {
        if (["name", "checkbox", "tempId", "parentId", "inserted"].includes(key)) return false;
        if (typeof val === "object") return val?.value || val?.flow;
        return !!val;
      });
  }
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
    console.log(newValue);
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
    setLocalTask({ ...taskStateRef.current });
  };

  const handleNewPresetChange = (key, value, parentId) => {
    // 🆕 If no draft ID yet, create a new session ID
    const tempId = draftSessionId || `adhoc_${task._id}_${parentId}_${Date.now()}`;

    // Set session ID only once per draft session
    if (!draftSessionId) setDraftSessionId(tempId);


    // Update the draft
    setNewPresetDraft((prev) => ({
      ...prev,
      [key]: value,
      parentId,
      tempId,
    }));

    // Update taskStateRef to reflect input live
    const children = taskStateRef.current.children || [];
    const targetIndex = children.findIndex(c => c.tempId === tempId);
    if (targetIndex !== -1) {
      const target = { ...children[targetIndex] };
      target.values = {
        ...target.values,
        input: {
          ...(target.values.input || {}),
          [key]: value,
        },
      };

      const updatedChildren = [...children];
      updatedChildren[targetIndex] = target;

      taskStateRef.current = {
        ...taskStateRef.current,
        children: updatedChildren,
      };
      setLocalTask({ ...taskStateRef.current });
    }
  };

  const buildAdhocChildFromDraft = (draft, groupingUnits = []) => {
    if (!draft.name?.trim()) return null;

    const input = {};

    groupingUnits.forEach(unit => {
      input[unit.key] = draft[unit.key] ?? (
        unit.type === "text" ? "" : { value: 0, flow: "in" }
      );
      if (typeof draft[unit.key] === "object") {
        input[unit.key] = {
          ...input[unit.key],
          flow: draft[unit.key].flow || "in",
        };
      }
    });


    return {
      id: draft.tempId,
      tempId: draft.tempId,
      name: draft.name.trim(),
      parentId: draft.parentId,
      properties: {
        preset: true,
        group: false,
        checkbox: true,
        input: true,
        card: false,
        category: false,
      },
      values: {
        checkbox: draft.checkbox || false,
        input // ✅ Only includes unit keys now
      },
      children: [],
      goals: [],
      counters: [],
    };
  };


  const saveNewPreset = () => {
    if (!newPresetDraft.name?.trim()) return;
    const tempId = newPresetDraft.tempId || `preset_${task._id}_${newPresetDraft.parentId}_${Date.now()}`;

    const presetTask = buildAdhocChildFromDraft({ ...newPresetDraft, checkbox: false, tempId });
    if (!presetTask) return;
    dispatch(addTaskOptimistic(presetTask));
    dispatch(createTask(presetTask));

    setNewPresetDraft({});
  };

  const renderChildren = (childrenArray, parentId = null) => {
    let rendered = childrenArray
      .filter((child) => {
        const id = child._id || child.tempId || child.id;
        return !id?.toString().startsWith("adhoc_") || !!child._id;
      })
      .map((child) => {
        const childKey = child._id || child.tempId || child.id;

        const groupingUnits = getAncestorGroupingUnits([taskStateRef.current], childKey); // ← No need to pass down

        if (child.properties?.category) {
          return (
            <div key={childKey} className="category-container">
              <div className="category-name">
                <TaskIcon icon={child.properties?.icon} />
                <Tag minimal>{child.name}</Tag>
              </div>
              {(child.children?.length > 0) && (
                <Collapse isOpen keepChildrenMounted>
                  <div className={`category-collapse ${groupingUnits.length > 0 ? "grouped-category" : ""}`}>
                    {renderChildren(child.children, child._id)}
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
            <div className="child-header">
              {child.properties?.checkbox === true && (
                <Checkbox
                  checked={child.values?.checkbox ?? false}
                  onChange={(e) =>
                    handleChildChange(childKey, "checkbox", e.target.checked)
                  }
                />
              )}
              <div className="child-task-name">
                <TaskIcon icon={child.properties?.icon} />
                {child.name}
              </div>
            </div>
            {/* 👇 Fallback for simple input tasks (not grouped or category) */}
            {child.properties?.input &&
              !child.properties?.group &&
              !child.properties?.category && (
                <>
                  <InputGroup
                    placeholder="Enter value..."
                    value={child.values?.input || ""}
                    onChange={(e) =>
                      handleChildChange(childKey, "input", e.target.value)
                    }
                    className="simple-input"
                  />
                  <HTMLSelect
                    className="flow-select"
                    value={child.values?.flow || "in"}
                    onChange={(e) =>
                      handleChildChange(childKey, "flow", e.target.value)
                    }
                    options={[
                      { label: "➕ Append", value: "in" },
                      { label: "➖ Retract", value: "out" },
                      { label: "🔁 Replace", value: "replace" },
                    ]}
                  />
                </>
              )}
            {groupingUnits.length > 0 &&
              <div className="preset-inputs">
                {groupingUnits.map((unit) => {
                  if (unit.key === "name") return null;

                  const field = child.values?.input?.[unit.key];
                  const value = typeof field === "object" ? (field.value ?? "") : field;
                  const flow = typeof field === "object" ? field.flow : "in";
                  const isDynamic = typeof field === "object" && field.dynamic === true;

                  return (

                    <div
                      key={`${childKey}-${unit.key}`}
                      className="preset-input"
                    >
                      {/* Always show icon + label */}
                      <Tag minimal className="unit-label-tag">
                        <TaskIcon icon={unit.icon} />
                        {unit.key}:
                      </Tag>

                        {/* Dynamic input mode */}
                        {isDynamic && Boolean(child.name) ? (
                          unit.type === "text" ? (
                            <>
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
                              <HTMLSelect
                                className="flow-select"
                                value={flow || "in"}
                                onChange={(e) =>
                                  handleChildChange(childKey, "input", {
                                    ...child.values?.input,
                                    [unit.key]: e.target.value,
                                  })
                                }
                                options={[
                                  { label: "➕ Append", value: "in" },
                                  { label: "➖ Retract", value: "out" },
                                  { label: "🔁 Replace", value: "replace" },
                                ]}
                              />
                            </>
                          ) : (
                            <>
                              <div className="numeric-input">
                                {unit.prefix && <Tag minimal>{unit.prefix}</Tag>}
                                <NumericInput
                                  fill
                                  value={value || 0}
                                  onValueChange={(num) =>
                                    handleChildChange(childKey, "input", {
                                      ...child.values?.input,
                                      [unit.key]: {
                                        value: num,
                                        flow,
                                        dynamic: true,
                                      },
                                    })
                                  }
                                  buttonPosition="none"
                                />
                                {unit.suffix && <Tag minimal>{unit.suffix}</Tag>}
                              </div>
                              <HTMLSelect
                                className="flow-select"
                                value={flow || "in"}
                                onChange={(e) =>
                                  handleChildChange(childKey, "input", {
                                    ...child.values?.input,
                                    [unit.key]: {
                                      ...child.values?.input?.[unit.key],
                                      flow: e.target.value,
                                    },
                                  })
                                }
                                options={[
                                  { label: "➕ In", value: "in" },
                                  { label: "➖ Out", value: "out" },
                                  { label: "🔁 Replace", value: "replace" },
                                ]}
                              />
                            </>
                          )
                        ) : (
                          // Static tag view
                          <div
                            className={`unit-value ${flow === "in" ? "increased_value" : "decreased_value"
                              }`}
                          >
                            {unit.type === "text" ? value : `${formatValueWithAffixes(unit.prefix, Number(value) || 0, unit.type, unit.suffix)}`}
                          </div>
                        )}
                      </div>
                  );
                })}
              </div>

            }
          </Tag>
        );

      });

    const parent = findTaskByIdDeep(parentId, [taskStateRef.current]);
    const groupingUnits = parent?.properties?.grouping?.units;
    // ← No need to pass down

    if (groupingUnits?.length > 0) {
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
              <EmojiIconPicker
                value={newPresetDraft.icon}
                onChange={(e) =>
                  handleNewPresetChange("icon", e.target.value, parentId)
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
            {groupingUnits.map((unit) => {
              if (unit.key === "name") return null;

              return (
                <div
                  key={`new-${unit.key}`}
                  className="preset-input"
                >
                  <Tag minimal intent="primary">
                    <TaskIcon icon={unit.icon} />
                    {unit.key}
                  </Tag>
                  {unit.type === "text" ? (
                    <>
                      <InputGroup
                        value={newPresetDraft[unit.key] || ""}
                        onChange={(e) =>
                          handleNewPresetChange(unit.key, e.target.value, parentId)
                        }
                      />
                      <HTMLSelect
                        className="flow-select"
                        value={newPresetDraft[unit.key]?.flow || "in"}
                        onChange={(e) =>
                          handleNewPresetChange(
                            unit.key,
                            {
                              value: newPresetDraft[unit.key]?.value || 0,
                              flow: e.target.value,
                            },
                            parentId
                          )
                        }
                        options={[
                          { label: "➕ Append", value: "in" },
                          { label: "➖ Retract", value: "out" },
                          { label: "🔁 Replace", value: "replace" },
                        ]}
                      />
                    </>
                  ) : (
                    <>
                      <div className="numeric-input">
                        {unit.prefix && <Tag minimal>{unit.prefix}</Tag>}
                        <NumericInput
                          fill
                          value={Number(newPresetDraft[unit.key]?.value) || 0}
                          onValueChange={(num) =>
                            handleNewPresetChange(unit.key, {
                              value: num,
                              flow: newPresetDraft[unit.key]?.flow || "in",
                            }, parentId)
                          }
                          buttonPosition="none"
                        />
                        {unit.suffix && <Tag minimal>{unit.suffix}</Tag>}
                      </div>
                      <HTMLSelect
                        className="flow-select"
                        value={newPresetDraft[unit.key]?.flow || "in"}
                        onChange={(e) =>
                          handleNewPresetChange(
                            unit.key,
                            {
                              value: newPresetDraft[unit.key]?.value || 0,
                              flow: e.target.value,
                            },
                            parentId
                          )
                        }
                        options={[
                          { label: "➕ In", value: "in" },
                          { label: "➖ Out", value: "out" },
                          { label: "🔁 Replace", value: "replace" },
                        ]}
                      />

                    </>
                  )}
                </div>
              )
            })}
          </div>
        </Tag>
      );

      rendered = rendered.slice().reverse();
    }

    return rendered;
  };

  const taskId =
    (task._id || task.tempId || task.id || "unknown-task").toString();
  const selectedLeaves = getSelectedLeaves(localTask).filter((leaf) => leaf._id !== localTask._id); // exclude fallback parent;

  // const cardContent = (
  //   <Card
  //     elevation={2}
  //     className={`task-card${preview ? " preview" : ""}${taskId == draggedTaskId ? " dragging" : ""}`}
  //     style={{
  //       cursor: preview ? "default" : "grab",
  //       opacity: preview ? 1 : undefined,
  //     }}
  //   >
  //     <div className="task-header">
  //       <div className="task-header-left">
  //         {task.children?.length > 0 ? (
  //           <Button
  //             icon={isOpen ? "caret-down" : "caret-right"}
  //             onClick={toggleCollapse}
  //             minimal
  //           />
  //         ) : (
  //           <Icon icon="dot" />
  //         )}
  //         <div className="task-name">{task.name}</div>
  //       </div>

  //       {!preview && (
  //         <div className="task-header-right">
  //           <Button
  //             icon="cog"
  //             className="edit-task-button"
  //             minimal
  //             onClick={() => {
  //               onEditTask(task);
  //               onOpenDrawer();
  //             }}
  //           />
  //           <Icon className="drag-icon" icon="horizontal-inbetween" />
  //         </div>
  //       )}
  //     </div>

  //     {task.children?.length > 0 && (
  //       <Collapse
  //         className="task-children-collapse"
  //         isOpen={isOpen}
  //         keepChildrenMounted
  //       >
  //         <div className="task-children">
  //           {renderChildren(
  //             taskStateRef.current.children || [],
  //             task.properties?.grouping?.units,
  //             task._id
  //           )}
  //         </div>
  //       </Collapse>
  //     )}
  //   </Card>
  // );

  return (
    <Draggable draggableId={taskId} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`task-card${preview ? " preview" : ""}${snapshot.isDragging ? " dragging" : ""}`}
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.5 : 1,
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
              <div className="task-name">
                <TaskIcon icon={task.properties.icon} />{task.name}
              </div>
            </div>
            {selectedLeaves.length > 0 && (
              <div className="taskcard-leaf-preview">
                {selectedLeaves.map((leaf) => (
                  <Tag
                    key={leaf._id || leaf.tempId || leaf.id}
                    className="leaf-chip"
                    minimal
                    intent="success"
                    icon="tick"
                  >
                    {leaf.name}
                  </Tag>
                ))}
              </div>
            )}

            <div className="task-header-right">
              {!preview && (
                <Button
                  icon="cog"
                  className="edit-task-button"
                  minimal
                  onClick={() => {
                    onEditTask(task);
                  }}
                />
              )}
              <Icon
                icon="horizontal-inbetween"
                className="drag-icon"
                {...provided.dragHandleProps} // ✅ Apply drag handle only here
              />
            </div>
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
                  task._id)}
              </div>
            </Collapse>
          )}
        </Card>
      )}
    </Draggable>
  );
}
export default TaskCard;
