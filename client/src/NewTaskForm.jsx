import React, { useState, useEffect } from 'react';
import { Button, FormGroup, InputGroup, HTMLSelect, Switch } from '@blueprintjs/core';
import "./NewTaskForm.css";

const NewTaskForm = ({ task, handleSave, handleDelete }) => {
  // Top-level task name is stored in "name"
  const [taskName, setTaskName] = useState("");
  // Using columns (instead of categories) for the new structure
  const [hasColumns, setHasColumns] = useState(true);
  // Each column is an object with a name and an array of subtasks
  // Each new column starts with a default subtask field (type "text")
  const [columns, setColumns] = useState([
    { name: "Actions", subtasks: [{ name: "subtask", type: "text", value: "" }] }
  ]);

  // If a task is provided, initialize form values for editing.
  useEffect(() => {
    if (task) {
      setTaskName(task.name || "");
      setColumns(
        task.columns || [
          { name: "Actions", subtasks: [{ name: "subtask", type: "text", value: "" }] }
        ]
      );
    }
  }, [task]);

  // Add a new column with a default subtask
  const addColumn = () => {
    setColumns(prev => [
      ...prev,
      { name: "New Column", subtasks: [{ name: "subtask", type: "text", value: "" }] }
    ]);
  };

  // Add a new subtask (field) to a column
  const addFieldToColumn = (columnIndex) => {
    const defaultField = { name: "subtask", type: "text", value: "" };
    setColumns(prev => {
      const updated = [...prev];
      updated[columnIndex].subtasks.push(defaultField);
      return updated;
    });
  };

  // Delete a column (only if more than one exists)
  const deleteColumn = (columnIndex) => {
    if (columns.length > 1) {
      setColumns(prev => prev.filter((_, i) => i !== columnIndex));
    }
  };

  // Delete a subtask from a column (only if more than one exists)
  const deleteFieldFromColumn = (columnIndex, fieldIndex) => {
    setColumns(prev => {
      const updated = [...prev];
      if (updated[columnIndex].subtasks.length > 1) {
        updated[columnIndex].subtasks = updated[columnIndex].subtasks.filter((_, i) => i !== fieldIndex);
      }
      return updated;
    });
  };

  const updateFieldName = (columnIndex, fieldIndex, newName) => {
    setColumns(prev => {
      const updated = [...prev];
      updated[columnIndex].subtasks[fieldIndex].name = newName;
      return updated;
    });
  };

  const updateFieldType = (columnIndex, fieldIndex, newType) => {
    setColumns(prev => {
      const updated = [...prev];
      updated[columnIndex].subtasks[fieldIndex].type = newType;
      // Update default value based on field type
      updated[columnIndex].subtasks[fieldIndex].value = newType === "bool" ? false : "";
      return updated;
    });
  };

  // When saving/updating, the final task structure is:
  // { name, category (null), columns }
  const handleTaskSave = () => {
    const newTask = { name: taskName, category: null, columns };
    handleSave(newTask);
  };

  // Renders a single column editor
  const renderColumnEditor = (column, index) => (
    <div
      key={index}
      className="column"
      style={{ flex: 1, border: '1px solid #ccc', padding: '10px', borderRadius: '4px' }}
    >
      <div
        className="column-header"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        {hasColumns ? (
          <InputGroup
            value={column.name}
            onChange={(e) => {
              const newColumns = [...columns];
              newColumns[index].name = e.target.value;
              setColumns(newColumns);
            }}
          />
        ) : (
          <InputGroup value="Default" disabled />
        )}
        {hasColumns && (
          <Button
            icon="delete"
            intent="danger"
            onClick={() => deleteColumn(index)}
            disabled={columns.length <= 1}
          />
        )}
      </div>

      {/* Subtasks List */}
      <div className="fields-list">
        {column.subtasks && column.subtasks.map((field, fieldIndex) => (
          <div
            key={fieldIndex}
            className="field-row"
            style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}
          >
            <InputGroup
              value={field.name}
              onChange={(e) => updateFieldName(index, fieldIndex, e.target.value)}
            />
            <HTMLSelect
              value={field.type}
              onChange={(e) => updateFieldType(index, fieldIndex, e.target.value)}
            >
              <option value="text">Text</option>
              <option value="bool">Bool</option>
            </HTMLSelect>
            {column.subtasks.length > 1 && (
              <Button
                icon="delete"
                intent="danger"
                onClick={() => deleteFieldFromColumn(index, fieldIndex)}
              />
            )}
          </div>
        ))}
      </div>
      <Button icon="plus" intent="primary" text="Add Field" onClick={() => addFieldToColumn(index)} />
    </div>
  );

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

      {/* Columns Section */}
      <div style={{ marginTop: "20px" }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h5>Columns</h5>
          <Switch
            checked={hasColumns}
            label="Use Columns"
            onChange={(e) => {
              const checked = e.target.checked;
              setHasColumns(checked);
              if (!checked) {
                // Force a single default column when columns are disabled.
                setColumns(columns.length > 0 
                  ? [{ ...columns[0], name: "Default" }]
                  : [{ name: "Default", subtasks: [{ name: "subtask", type: "text", value: "" }] }]
                );
              }
            }}
          />
        </div>
        {hasColumns ? (
          <div className="column-editor" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', marginTop: "10px" }}>
            {columns.map((column, index) => renderColumnEditor(column, index))}
            <div className="new-column-button">
              <Button icon="plus" intent="primary" onClick={addColumn} />
            </div>
          </div>
        ) : (
          <div className="column-editor" style={{ marginTop: "10px" }}>
            {renderColumnEditor(columns[0] || { name: "Default", subtasks: [{ name: "subtask", type: "text", value: "" }] }, 0)}
          </div>
        )}
      </div>

      {/* Save/Update and Delete Task Buttons */}
      <div style={{ padding: "10px", marginTop: "20px" }}>
        <Button onClick={handleTaskSave} text={task ? "Update Task" : "Save Task"} intent="primary" />
        {task && (
          <Button
            onClick={() => {
              if (window.confirm("Are you sure you want to delete this task?")) {
                handleDelete(task);
              }
            }}
            text="Delete Task"
            intent="danger"
          />
        )}
      </div>
    </div>
  );
};

export default NewTaskForm;
