// TaskCard.jsx
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
} from "@blueprintjs/core";
import { Draggable } from "react-beautiful-dnd";

const TaskCard = ({
  task,
  index,
  onEditTask,
  onOpenDrawer,
  onTaskUpdate,
  preview = false,
}) => {
  if (!task) return null;

  const taskStateRef = useRef(task);
  const [isOpen, setIsOpen] = useState(false);

  const toggleCollapse = () => setIsOpen(!isOpen);

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

  const renderChildren = (childrenArray) =>
    childrenArray.map((child) => {
      const childKey = child._id || child.tempId || child.id;

      if (child.properties?.category) {
        return (
          <div key={childKey} className="category-container">
            <div className="category-name">
              <Tag minimal>{child.name}</Tag>
            </div>
            {child.children?.length > 0 && (
              <Collapse isOpen keepChildrenMounted>
                <div className="category-collapse">
                  {renderChildren(child.children)}
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
          {child.properties?.input && (
            <InputGroup
              placeholder={`Enter ${child.name}`}
              value={child.values?.input ?? ""}
              onChange={(e) =>
                handleChildChange(childKey, "input", e.target.value)
              }
            />
          )}
        </Tag>
      );
    });

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
            {renderChildren(taskStateRef.current.children || [])}
          </div>
        </Collapse>
      )}
    </Card>
  );

  return preview ? (
    cardContent
  ) : (
    <Draggable draggableId={taskId} index={index}>
      {(provided, snapshot) =>
        React.cloneElement(cardContent, {
          ref: provided.innerRef,
          ...provided.draggableProps,
          ...provided.dragHandleProps,
          className: `task-card${preview ? " preview" : ""}${
            snapshot.isDragging ? " dragging" : ""
          }`,
          style: {
            ...provided.draggableProps.style,
            cursor: snapshot.isDragging ? "grabbing" : "grab",
            opacity: snapshot.isDragging ? 0.5 : 1,
          },
        })
      }
    </Draggable>
  );
};

export default TaskCard;
