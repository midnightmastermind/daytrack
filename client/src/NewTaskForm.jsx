import React, { useState, useEffect } from 'react';
import { Button, FormGroup, InputGroup, Checkbox, Popover, Menu, MenuItem, HTMLSelect } from '@blueprintjs/core';

const NewTaskForm = ({ task, handleSave }) => {
    const [taskName, setTaskName] = useState("");
    const [isImportant, setIsImportant] = useState(false);
    const [columns, setColumns] = useState([{ name: "Actions", fields: [] }]);
    const [popoverContent, setPopoverContent] = useState({
        fieldName: '',
        fieldType: 'input', // Default to "input"
    });

    // If a task is provided, use its values to initialize the form for editing
    useEffect(() => {
        if (task) {
            setTaskName(task.taskName || "");
            setIsImportant(task.isImportant || false);
            setColumns(task.columns || [{ name: "Actions", fields: [] }]);
        }
    }, [task]);

    const addColumn = () => {
        setColumns((prevColumns) => [
            ...prevColumns,
            { name: "New Column", fields: [] }
        ]);
    };

    const addFieldToColumn = (columnIndex) => {
        const { fieldName, fieldType } = popoverContent;
        setColumns((prevColumns) => {
            const updatedColumns = [...prevColumns];
            updatedColumns[columnIndex].fields.push({ name: fieldName, type: fieldType });
            return updatedColumns;
        });
        setPopoverContent({ fieldName: '', fieldType: 'input' }); // Reset the form
    };

    const deleteColumn = (columnIndex) => {
        if (columns.length > 1) {
            setColumns((prevColumns) => prevColumns.filter((_, index) => index !== columnIndex));
        }
    };

    const handleTaskSave = () => {
        const newTask = { taskName, isImportant, columns };
        handleSave(newTask);  // Call the parent handleSave function
    };

    return (
        <div style={{ padding: "20px" }}>
            {/* Task Name */}
            <FormGroup label="Task Name" labelFor="task-name">
                <InputGroup
                    id="task-name"
                    placeholder="Enter task name"
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                />
            </FormGroup>

            {/* Important Checkbox */}
            <FormGroup labelFor="important-checkbox">
                <Checkbox
                    id="important-checkbox"
                    label="Important"
                    checked={isImportant}
                    onChange={() => setIsImportant(!isImportant)}
                />
            </FormGroup>

            {/* Columns */}
            <div>
                <h5>Columns</h5>
                {columns.map((column, index) => (
                    <div key={index} style={{ marginBottom: "20px" }}>
                        {/* Column Name */}
                        <FormGroup label={`Column ${index + 1}`} labelFor={`column-${index}-name`}>
                            <InputGroup
                                id={`column-${index}-name`}
                                value={column.name}
                                onChange={(e) => {
                                    const newColumns = [...columns];
                                    newColumns[index].name = e.target.value;
                                    setColumns(newColumns);
                                }}
                            />
                        </FormGroup>

                        {/* Fields */}
                        {column.fields.length > 0 && (
                            <div>
                                {column.fields.map((field, fieldIndex) => (
                                    <div key={fieldIndex}>
                                        <Popover
                                            content={
                                                <Menu>
                                                    <MenuItem
                                                        text="Edit"
                                                        onClick={() => {
                                                            const newFieldName = prompt("Enter field name:", field.name);
                                                            const newFieldType = prompt("Enter field type (input or checkbox):", field.type);
                                                            if (newFieldName && newFieldType) {
                                                                const updatedColumns = [...columns];
                                                                updatedColumns[index].fields[fieldIndex] = {
                                                                    name: newFieldName,
                                                                    type: newFieldType
                                                                };
                                                                setColumns(updatedColumns);
                                                            }
                                                        }}
                                                    />
                                                </Menu>
                                            }
                                        >
                                            <Button text={field.name} />
                                        </Popover>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add Field Button with Popover */}
                        <Popover
                            content={
                                <div style={{ padding: '10px' }}>
                                    <FormGroup label="Field Name">
                                        <InputGroup
                                            placeholder="Enter field name"
                                            value={popoverContent.fieldName}
                                            onChange={(e) => setPopoverContent({ ...popoverContent, fieldName: e.target.value })}
                                        />
                                    </FormGroup>
                                    <FormGroup label="Field Type">
                                    <HTMLSelect
                                            value={popoverContent.fieldType}
                                            onChange={(e) => setPopoverContent({ ...popoverContent, fieldType: e.target.value })}
                                        >
                                            <option value="input">Input</option>
                                            <option value="checkbox">Checkbox</option>
                                        </HTMLSelect>
                                    </FormGroup>
                                    <Button
                                        icon="plus"
                                        intent="primary"
                                        text="Add Field"
                                        onClick={() => {
                                            if (popoverContent.fieldName && popoverContent.fieldType) {
                                                addFieldToColumn(index);
                                            }
                                        }}
                                    />
                                </div>
                            }
                            position="bottom"
                        >
                            <Button
                                icon="plus"
                                intent="primary"
                                text="Add Field"
                            />
                        </Popover>

                        {/* Delete Column Button */}
                        <Button
                            icon="delete"
                            intent="danger"
                            text="Delete Column"
                            onClick={() => deleteColumn(index)}
                            disabled={columns.length <= 1}
                        />
                    </div>
                ))}

                {/* Add New Column Button */}
                <Button
                    icon="plus"
                    intent="primary"
                    text="Add Column"
                    onClick={addColumn}
                    style={{ marginTop: "20px" }}
                />
            </div>

            {/* Footer with Save Button */}
            <div style={{ padding: "10px" }}>
                <Button onClick={handleTaskSave} text="Save Task" intent="primary" />
            </div>
        </div>
    );
};

export default NewTaskForm;
