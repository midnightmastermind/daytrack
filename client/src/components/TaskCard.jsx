import React, { useState } from "react";
import { Card, Button, Collapse, Icon, Checkbox, InputGroup } from "@blueprintjs/core";
import { useDrag } from "react-dnd";

const ItemTypes = { TASK: "task" };

const TaskCard = ({ task, onEditTask, onOpenDrawer }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [taskState, setTaskState] = useState(task);

    const [{ isDragging }, drag] = useDrag(() => {
        console.log("Setting up drag for task:", taskState.name);
        return {
            type: ItemTypes.TASK,
            item: { task: taskState.name, id: taskState._id, properties: taskState.properties },
            collect: (monitor) => ({ isDragging: monitor.isDragging() }),
        };
    });

    const handleCaretClick = () => {
        console.log("Toggling collapse for task:", taskState.name);
        setIsOpen(!isOpen);
    };

    // Recursive function to render nested children
    const renderChildren = (childrenArray) => {
        return childrenArray.map((child, index) => {
            // If the child is a container (category true), display its name and render its children recursively
            if (child.properties && child.properties.category) {
                return (
                    <div className="category-container" key={index}>
                        <div className="category-name">{child.name}</div>
                        {child.children && child.children.length > 0 && (
                            <Collapse isOpen={true} keepChildrenMounted>
                                <div className="collapse">
                                    {renderChildren(child.children)}
                                </div>
                            </Collapse>
                        )}
                    </div>
                );
            } else {
                // Otherwise, render an editable field based on its properties
                return (
                    <div key={index} className="child-task">
                        {child.properties && child.properties.checkbox && (
                            <Checkbox
                                checked={child.values?.checkbox || false}
                                onChange={(e) => handleChildChange(index, "checkbox", e.target.checked)}
                            />
                        )}
                        <span style={{ marginRight: "5px" }}>{child.name}</span>
                        {child.properties && child.properties.input && (
                            <InputGroup
                                placeholder={`Enter ${child.name}`}
                                value={child.values?.input || ""}
                                onChange={(e) => handleChildChange(index, "input", e.target.value)}
                            />
                        )}
                    </div>
                );
            }
        });
    };

    const handleChildChange = (childIndex, key, newValue) => {
        console.log(`Updating child at index ${childIndex} for key ${key} to:`, newValue);
        setTaskState((prev) => {
            const updatedTask = { ...prev };
            if (!updatedTask.children || !Array.isArray(updatedTask.children)) {
                console.log("No children array found.");
                return updatedTask;
            }
            updatedTask.children = updatedTask.children.map((child, index) =>
                index === childIndex ? { ...child, values: { ...child.values, [key]: newValue } } : child
            );
            console.log("Updated task state:", updatedTask);
            return updatedTask;
        });
    };

    return (
        <Card
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
                <Collapse isOpen={isOpen} keepChildrenMounted>
                    <div className="task-children">{renderChildren(taskState.children)}</div>
                </Collapse>
            )}
        </Card>
    );
};

export default TaskCard;
