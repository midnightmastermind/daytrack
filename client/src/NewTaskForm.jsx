import React, { useState, useEffect } from "react";
import {
  Button,
  FormGroup,
  InputGroup,
  Checkbox,
  Tag
} from "@blueprintjs/core";
import "./NewTaskForm.css";
import { useDispatch } from "react-redux";
import {
  createTask,
  updateTask,
  addTaskOptimistic,
  updateTaskOptimistic
} from "../store/tasksSlice";
import { v4 as uuidv4 } from "uuid";

// === Recursive component to edit a child task ===
const ChildEditor = ({ child, onChange, onDelete }) => {
  const handleFieldChange = (field, value) => {
    onChange({ ...child, [field]: value });
  };

  const handleNestedChange = (childId, updatedNestedChild) => {
    const newChildren = child.children.map((c) =>
      c.id === childId ? updatedNestedChild : c
    );
    onChange({ ...child, children: newChildren });
  };

  const addNestedChild = () => {
    const newChild = {
      id: `${Date.now()}-${Math.random()}`,
      name: "",
      properties: { checkbox: false, input: false, category: false },
      values: { checkbox: false, input: "" },
      children: [],
    };
    onChange({ ...child, children: [...(child.children || []), newChild] });
  };

  return (
    <div className="child-editor" style={{ marginLeft: "20px", marginTop: "10px" }}>
      <div className="child-header" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <InputGroup
          value={child.name}
          placeholder="Child name"
          onChange={(e) => handleFieldChange("name", e.target.value)}
          style={{ flex: 1 }}
        />
        <Checkbox
          label={<div className="child-property-selection">Checkbox</div>}
          checked={child.properties.checkbox}
          onChange={(e) => handleFieldChange("properties", { ...child.properties, checkbox: e.target.checked })}
        />
        <Checkbox
          label={<div className="child-property-selection">Input</div>}
          checked={child.properties.input}
          onChange={(e) => handleFieldChange("properties", { ...child.properties, input: e.target.checked })}
        />
        <Checkbox
          label={<div className="child-property-selection">Category</div>}
          checked={child.properties.category}
          onChange={(e) => handleFieldChange("properties", { ...child.properties, category: e.target.checked })}
        />
        <Button icon="delete" minimal onClick={onDelete} />
      </div>

      {child.properties.category && (
        <div className="nested-controls" style={{ marginLeft: "20px", marginTop: "5px" }}>
          <Button icon="plus" minimal text="Add Nested Child" onClick={addNestedChild} />
        </div>
      )}
      {child.children?.length > 0 && (
        <div className="nested-children">
          {child.children.map((nestedChild) => (
            <ChildEditor
              key={nestedChild.id}
              child={nestedChild}
              onChange={(updated) => handleNestedChange(nestedChild.id, updated)}
              onDelete={() => {
                const newChildren = child.children.filter((c) => c.id !== nestedChild.id);
                onChange({ ...child, children: newChildren });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// === Main Task Form ===
const NewTaskForm = ({ task, onSave, onDelete }) => {
  const dispatch = useDispatch();

  const [taskName, setTaskName] = useState("");
  const [children, setChildren] = useState([]);

  useEffect(() => {
    if (task) {
      setTaskName(task.name || "");
      setChildren(task.children || []);
    }
  }, [task]);

  const addChild = () => {
    const newChild = {
      id: `${Date.now()}-${Math.random()}`,
      name: "",
      properties: { checkbox: false, input: false, category: false },
      values: { checkbox: false, input: "" },
      children: [],
    };
    setChildren((prev) => [...prev, newChild]);
  };

  const updateChild = (childId, updatedChild) => {
    setChildren((prev) => prev.map((child) => (child.id === childId ? updatedChild : child)));
  };

  const deleteChild = (childId) => {
    setChildren((prev) => prev.filter((child) => child.id !== childId));
  };

  const handleSaveTask = () => {
    const newTask = {
      name: taskName,
      description: "",
      properties: { card: true, checkbox: false, input: false, category: true },
      children,
    };

    if (task && task._id) {
      dispatch(updateTaskOptimistic({ id: task._id, updates: newTask }));
      dispatch(updateTask({ id: task._id, taskData: newTask }));
    } else {
      const tempId = `temp_${uuidv4()}`;
      const optimistic = { ...newTask, tempId };
      dispatch(addTaskOptimistic(optimistic));
      dispatch(createTask({ ...newTask, tempId }));
    }

    onSave?.(newTask);
  };

  return (
    <div className="new-task-form" style={{ padding: "20px" }}>
      <h3>Create/Edit Task Form</h3>
      <FormGroup label="Task Name" labelFor="task-name">
        <InputGroup
          id="task-name"
          placeholder="Enter task name"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
        />
      </FormGroup>
      <div className="children-section" style={{ marginTop: "20px" }}>
        <h5>Children</h5>
        <Button icon="plus" text="New Child" onClick={addChild} />
        <div className="children-list" style={{ marginTop: "10px" }}>
          {children.map((child) => (
            <ChildEditor
              key={child.id}
              child={child}
              onChange={(updated) => updateChild(child.id, updated)}
              onDelete={() => deleteChild(child.id)}
            />
          ))}
        </div>
      </div>
      <div style={{ marginTop: "20px" }}>
        <Button
          text={task ? "Update Task" : "Save Task"}
          intent="primary"
          onClick={handleSaveTask}
        />
        {task && (
          <Button
            text="Delete Task"
            intent="danger"
            onClick={() => onDelete?.(task)}
            style={{ marginLeft: "10px" }}
          />
        )}
      </div>
    </div>
  );
};

export default NewTaskForm;
