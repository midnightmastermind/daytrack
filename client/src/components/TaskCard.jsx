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
import { createTask, addTaskOptimistic, updateTaskOptimistic } from "../store/tasksSlice";
import { getSelectedLeaves } from "../helpers/taskUtils";

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
  const [localTask, setLocalTask] = useState(task);
  const toggleCollapse = () => setIsOpen(!isOpen);

  useEffect(() => {
    if (!onInsertAdhoc) return;
  
    const tempId = newPresetDraft.tempId || `adhoc_${task._id}_${newPresetDraft.parentId}_${Date.now()}`;
    const updatedDraft = { ...newPresetDraft, tempId };
    onInsertAdhoc(tempId, updatedDraft); // ✅ always send draft changes
    setNewPresetDraft((prev) => ({ ...prev, tempId }));
  }, [
    newPresetDraft.name,
    newPresetDraft.checkbox,
    ...Object.keys(newPresetDraft)
      .filter(k => !['name', 'checkbox', 'parentId', 'tempId', 'inserted'].includes(k))
      .map(k => typeof newPresetDraft[k] === 'object' ? JSON.stringify(newPresetDraft[k]) : newPresetDraft[k])
  ]);
  
  useEffect(() => {
    const myId = (task._id || task.tempId || task.id || "").toString();
    if (draggedTaskId === myId) {
      setIsOpen(false);
    }
  }, [draggedTaskId]);

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
    setLocalTask({ ...taskStateRef.current });
  };

  const handleNewPresetChange = (key, value, parentId) => {
    const tempId = newPresetDraft.tempId || `adhoc_${task._id}_${parentId}_${Date.now()}`;
  
    // Update draft (for local input box rendering)
    setNewPresetDraft((prev) => ({
      ...prev,
      [key]: value,
      parentId,
      tempId,
      inserted: prev.inserted,
    }));
  
    // Update live taskStateRef so that inputs are in sync with the actual task
    const children = taskStateRef.current.children || [];
    const targetIndex = children.findIndex(c => c.tempId === tempId);
    if (targetIndex !== -1) {
      const target = { ...children[targetIndex] };
      target.values = {
        ...target.values,
        input: {
          ...(target.values.input || {}),
          [key]: value
        }
      };
      const updatedChildren = [...children];
      updatedChildren[targetIndex] = target;
  
      taskStateRef.current = {
        ...taskStateRef.current,
        children: updatedChildren,
      };
      setLocalTask({ ...taskStateRef.current }); // trigger re-render
    }
  };
  
  const buildAdhocChildFromDraft = (draft, groupingUnits = []) => {
    if (!draft.name?.trim()) return null;
  
    const input = {};

    groupingUnits.forEach(unit => {
      input[unit.key] = draft[unit.key] ?? (
        unit.type === "text" ? "" : { value: 0, flow: "in" }
      );
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

  const renderChildren = (childrenArray, parentGroupingUnits = [], parentId = null) => {
    let rendered = childrenArray
      .filter((child) => {
        const id = child._id || child.tempId || child.id;
        return !id?.toString().startsWith("adhoc_") || !!child._id;
      })
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
                {child.properties.icon?.type === "emoji" ? <div className="task-icon">{child.properties.icon?.value}</div> : <Icon icon={child.properties.icon?.value} />}
                <Tag minimal>{child.name}</Tag>
              </div>
              {(child.children?.length > 0 || groupingUnits) && (
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
            {child.properties.icon?.type === "emoji" ? <div className="task-icon">{child.properties.icon?.value}</div> : <Icon icon={child.properties.icon?.value} />}
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
                  console.log(field);
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
                          {unit.prefix && <Tag minimal className="unit-prefix">{unit.prefix}</Tag>}
                          <NumericInput
                            fill
                            value={value || 0}
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
                          {unit.suffix && <Tag minimal className="unit-suffix">{unit.suffix}</Tag>}
                          <Switch
                            className={`flow-switch-${flow}`}
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
                  <Tag minimal intent="primary">{unit.key}</Tag>
                  {unit.type === "text" ? (
                    <InputGroup
                      value={newPresetDraft[unit.key] || ""}
                      onChange={(e) =>
                        handleNewPresetChange(unit.key, e.target.value, parentId)
                      }
                    />
                  ) : (
                    <>
                      {unit.prefix && <Tag minimal className="unit-prefix">{unit.prefix}</Tag>}

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
                      {unit.suffix && <Tag minimal className="unit-suffix">{unit.suffix}</Tag>}

                      <Switch
                        className={`flow-switch-${newPresetDraft[unit.key]?.flow || "in"}`}
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
                {task.properties.icon?.type === "emoji" ? <div className="task-icon">{task.properties.icon?.value}</div> : <Icon icon={task.properties.icon?.value} />}
                {task.name}</div>
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
                  task.properties?.grouping?.units,
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
