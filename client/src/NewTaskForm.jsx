import React, { useState, useEffect } from 'react';
import { Button, FormGroup, InputGroup, HTMLSelect, Switch } from '@blueprintjs/core';
import "./NewTaskForm.css";

const NewTaskForm = ({ task, handleSave }) => {
  // Top-level task name is stored in "name"
  const [taskName, setTaskName] = useState("");
  // State to determine if the task uses multiple categories
  const [hasCategories, setHasCategories] = useState(true);
  // Each category is an object with a name and an array of options (fields)
  // Each new category starts with a default subtask field
  const [categories, setCategories] = useState([
    { name: "Actions", options: [{ name: "subtask", type: "input", value: "" }] }
  ]);

  // If a task is provided, initialize form values for editing.
  useEffect(() => {
    if (task) {
      setTaskName(task.name || "");
      setCategories(
        task.options || [
          { name: "Actions", options: [{ name: "subtask", type: "input", value: "" }] }
        ]
      );
    }
  }, [task]);

  // Add a new category with a default subtask
  const addCategory = () => {
    setCategories(prev => [
      ...prev,
      { name: "New Category", options: [{ name: "subtask", type: "input", value: "" }] }
    ]);
  };

  // Add a new field with default name "subtask" to a category
  const addFieldToCategory = (categoryIndex) => {
    const defaultField = { name: "subtask", type: "input", value: "" };
    setCategories(prev => {
      const updated = [...prev];
      updated[categoryIndex].options.push(defaultField);
      return updated;
    });
  };

  // Delete a category (only if more than one exists)
  const deleteCategory = (categoryIndex) => {
    if (categories.length > 1) {
      setCategories(prev => prev.filter((_, i) => i !== categoryIndex));
    }
  };

  // Delete a field from a category (only if more than one exists)
  const deleteFieldFromCategory = (categoryIndex, fieldIndex) => {
    setCategories(prev => {
      const updated = [...prev];
      if (updated[categoryIndex].options.length > 1) {
        updated[categoryIndex].options = updated[categoryIndex].options.filter((_, i) => i !== fieldIndex);
      }
      return updated;
    });
  };

  const updateFieldName = (categoryIndex, fieldIndex, newName) => {
    setCategories(prev => {
      const updated = [...prev];
      updated[categoryIndex].options[fieldIndex].name = newName;
      return updated;
    });
  };

  const updateFieldType = (categoryIndex, fieldIndex, newType) => {
    setCategories(prev => {
      const updated = [...prev];
      updated[categoryIndex].options[fieldIndex].type = newType;
      // Update default value based on field type
      updated[categoryIndex].options[fieldIndex].value = newType === "checkbox" ? false : "";
      return updated;
    });
  };

  const handleTaskSave = () => {
    // Final task structure: { name: <taskName>, options: <categories> }
    const newTask = { name: taskName, options: categories };
    handleSave(newTask);
  };

  // Renders a single category editor
  const renderCategoryEditor = (category, index) => (
    <div
      key={index}
      className="category"
      style={{ flex: 1, border: '1px solid #ccc', padding: '10px', borderRadius: '4px' }}
    >
      <div
        className="category-header"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        {hasCategories ? (
          <InputGroup
            value={category.name}
            onChange={(e) => {
              const newCategories = [...categories];
              newCategories[index].name = e.target.value;
              setCategories(newCategories);
            }}
          />
        ) : (
          <InputGroup value="Default" disabled />
        )}
        {hasCategories && (
          <Button
            icon="delete"
            intent="danger"
            onClick={() => deleteCategory(index)}
            disabled={categories.length <= 1}
          />
        )}
      </div>

      {/* Fields/Options List */}
      <div className="fields-list">
        {category.options && category.options.map((field, fieldIndex) => (
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
              <option value="input">Input</option>
              <option value="checkbox">Checkbox</option>
            </HTMLSelect>
            {category.options.length > 1 && (
              <Button
                icon="delete"
                intent="danger"
                onClick={() => deleteFieldFromCategory(index, fieldIndex)}
              />
            )}
          </div>
        ))}
      </div>
      <Button icon="plus" intent="primary" text="Add Field" onClick={() => addFieldToCategory(index)} />
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

      {/* Categories Section */}
      <div style={{ marginTop: "20px" }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h5>Categories</h5>
          <Switch
            checked={hasCategories}
            label="Use Categories"
            onChange={(e) => {
              const checked = e.target.checked;
              setHasCategories(checked);
              if (!checked) {
                // Force a single default category when categories are disabled.
                setCategories(categories.length > 0 
                  ? [{ ...categories[0], name: "Default" }]
                  : [{ name: "Default", options: [{ name: "subtask", type: "input", value: "" }] }]
                );
              }
            }}
          />
        </div>
        {hasCategories ? (
          <div className="category-editor" style={{ display: 'flex', gap: '20px', marginTop: "10px" }}>
            {categories.map((category, index) => renderCategoryEditor(category, index))}
            <div className="new-category-button">
              <Button icon="plus" intent="primary" onClick={addCategory} />
            </div>
          </div>
        ) : (
          <div className="category-editor" style={{ marginTop: "10px" }}>
            {renderCategoryEditor(categories[0] || { name: "Default", options: [{ name: "subtask", type: "input", value: "" }] }, 0)}
          </div>
        )}
      </div>

      {/* Save Task Button */}
      <div style={{ padding: "10px", marginTop: "20px" }}>
        <Button onClick={handleTaskSave} text="Save Task" intent="primary" />
      </div>
    </div>
  );
};

export default NewTaskForm;
