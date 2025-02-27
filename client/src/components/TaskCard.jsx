import React, { useState, useEffect, useRef } from "react";
import { Card, Button, Collapse, Icon, Checkbox, InputGroup, Tag } from "@blueprintjs/core";
import { Draggable } from "react-beautiful-dnd";

const TaskCard = ({ task, index, onEditTask, onOpenDrawer }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [taskState, setTaskState] = useState(task);
    const taskStateRef = useRef(taskState);

    useEffect(() => {
        taskStateRef.current = taskState;
    }, [taskState]);

    const toggleCollapse = () => {
        setIsOpen(!isOpen);
    };

    // Recursive function to render nested children
    const renderChildren = (childrenArray) => {
        return childrenArray.map((child) => {
            if (child.properties && child.properties.category) {
                return (
                    <div key={child._id} className="category-container">
                        <div className="category-name">
                            <Tag minimal>{child.name}</Tag>
                        </div>
                        {child.children && child.children.length > 0 && (
                            <Collapse isOpen={true} keepChildrenMounted>
                                <div className="category-collapse">
                                    {renderChildren(child.children)}
                                </div>
                            </Collapse>
                        )}
                    </div>
                );
            } else {
                return (
                    <Tag key={child._id} className="child-task" minimal>
                        {child.properties && child.properties.checkbox && (
                            <Checkbox
                                checked={child.values?.checkbox ?? false}
                                onChange={(e) => handleChildChange(child._id, "checkbox", e.target.checked)}
                            />
                        )}
                        <div className="child-task-name">{child.name}</div>
                        {child.properties && child.properties.input && (
                            <InputGroup
                                placeholder={`Enter ${child.name}`}
                                value={child.values?.input ?? ""}
                                onChange={(e) => handleChildChange(child._id, "input", e.target.value)}
                            />
                        )}
                    </Tag>
                );
            }
        });
    };

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

    const handleChildChange = (childId, key, newValue) => {
        setTaskState(prev => {
            const updatedChildren = updateChildValue(prev.children, childId, key, newValue);
            return { ...prev, children: updatedChildren };
        });
    };

    return (
        <Draggable draggableId={task._id.toString()} index={index}>
            {(provided, snapshot) => (
                <Card
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    elevation={2}
                    style={{
                        cursor: snapshot.isDragging ? "grabbing" : "grab",
                        opacity: snapshot.isDragging ? 0.5 : 1,
                        ...provided.draggableProps.style
                    }}
                    className="task-card"
                >
                    <div className="task-header">
                        <div className="task-header-left">
                            {taskState.children && taskState.children.length > 0 ? (
                                <Button icon={isOpen ? "caret-down" : "caret-right"} onClick={toggleCollapse} />
                            ) : (
                                <Icon icon="dot" />
                            )}
                            <div className="task-name">{taskState.name}</div>
                        </div>
                        <div className="task-header-right">
                            <Button
                                icon="cog"
                                className="edit-task-button"
                                minimal
                                onClick={() => {
                                    onEditTask(taskState);
                                    onOpenDrawer();
                                }}
                            />
                            <Icon className="drag-icon" icon="horizontal-inbetween" />
                        </div>
                    </div>
                    {taskState.children && taskState.children.length > 0 && (
                        <Collapse className="task-children-collapse" isOpen={isOpen} keepChildrenMounted>
                            <div className="task-children">{renderChildren(taskState.children)}</div>
                        </Collapse>
                    )}
                </Card>
            )}
        </Draggable>
    );
};

export default TaskCard;
