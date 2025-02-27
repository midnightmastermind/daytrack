import React, { useState, useRef, useEffect } from "react";
import { Card, Button, Collapse, Icon, Checkbox, InputGroup, Tag } from "@blueprintjs/core";
import { useDrag } from "react-dnd";

const ItemTypes = { TASK: "task" };

const updateChildValue = (childrenArray, childId, key, newValue) => {
  return childrenArray.map(child => {
    if (child._id.toString() === childId.toString()) {
      return { ...child, values: { ...child.values, [key]: newValue } };
    } else if (child.children && child.children.length > 0) {
      return { ...child, children: updateChildValue(child.children, childId, key, newValue) };
    }
    return child;
  });
};

const TaskCard = ({ task, onEditTask, onOpenDrawer }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [taskState, setTaskState] = useState(task);
  const taskStateRef = useRef(taskState);

  // Always keep the ref in sync with state.
  useEffect(() => {
    taskStateRef.current = taskState;
  }, [taskState]);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.TASK,
    item: () => {
      console.log("Dragging task with current state:", taskStateRef.current);
      return { ...taskStateRef.current, id: taskStateRef.current._id, parent_id: null };
    },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  const handleCaretClick = () => {
    console.log("Toggling collapse for task:", taskState.name);
    setIsOpen(!isOpen);
  };

  // Recursive function to render nested children.
  const renderChildren = (childrenArray) => {
    return childrenArray.map((child) => {
      if (child.properties && child.properties.category) {
        return (
          <Tag className="category-container" key={child._id}>
            <div className="category-name">{child.name}</div>
            {child.children && child.children.length > 0 && (
              <Collapse isOpen={true} keepChildrenMounted>
                <div className="collapse">
                  {renderChildren(child.children)}
                </div>
              </Collapse>
            )}
          </Tag>
        );
      } else {
        
        return (
          <Tag className="child-task" key={child._id} minimal>
            {child.properties && child.properties.checkbox && (
            <div className="checkbox-container">
              <Checkbox
                checked={child.values?.checkbox ?? false}
                onChange={(e) =>
                  handleChildChange(child._id, "checkbox", e.target.checked)
                }
              />
              </div>
            )}
            <div className="child-task-name">{child.name}</div>
            {child.properties && child.properties.input && (
             <div className="input-container">
              <InputGroup
                placeholder={``}
                className="child-task-input"
                value={child.values?.input ?? ""}
                onChange={(e) =>
                  handleChildChange(child._id, "input", e.target.value)
                }
              />
              </div>
            )}
          </Tag>
        );
      }
    });
  };

  const handleChildChange = (childId, key, newValue) => {
    console.log(`Updating child with id ${childId} key ${key} to:`, newValue);
    setTaskState((prev) => {
      const updatedChildren = updateChildValue(prev.children, childId, key, newValue);
      const updatedTask = { ...prev, children: updatedChildren };
      console.log("Updated task state:", updatedTask);
      return updatedTask;
    });
  };

  return (
    <Card
      className="task-card"
      ref={drag}
      elevation={2}
      style={{
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div className="task-header" style={{ display: "flex", alignItems: "center" }}>
        {taskState.children && taskState.children.length > 0 ? (
          <Button icon={isOpen ? "caret-down" : "caret-right"} onClick={handleCaretClick} />
        ) : (
          <Icon icon="dot" />
        )}
        <div className="task-name" style={{ flex: 1 }}>{taskState.name}</div>
        <Button
          icon="cog"
          minimal
          onClick={() => {
            console.log("Editing task:", taskState.name);
            onEditTask(taskState);
            onOpenDrawer();
          }}
        />
        <Icon icon="horizontal-inbetween" />
      </div>
      {taskState.children && taskState.children.length > 0 && (
        <Collapse isOpen={isOpen} keepChildrenMounted className="task-options">
          <div className="task-children">{renderChildren(taskState.children)}</div>
        </Collapse>
      )}
    </Card>
  );
};

export default TaskCard;