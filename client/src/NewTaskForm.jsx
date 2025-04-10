import React, { useState, useEffect } from "react";
import { Button, FormGroup, InputGroup, Checkbox } from "@blueprintjs/core";
import TaskCard from "./components/TaskCard";
import ScheduleCard from "./components/ScheduleCard";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import { v4 as uuidv4 } from "uuid";
import { getSelectedLeaves, getTaskKey } from "./helpers/taskUtils";
import "./NewTaskForm.css";

const ChildEditor = ({ child, onChange, onDelete }) => {
  const updateField = (field, value) => {
    onChange({ ...child, [field]: value });
  };

  const updateNestedChild = (id, updatedChild) => {
    const updated = child.children.map((c) => (c.id === id ? updatedChild : c));
    onChange({ ...child, children: updated });
  };

  const addNestedChild = () => {
    const newChild = {
      id: uuidv4(),
      name: "",
      properties: { checkbox: false, input: false, category: false },
      values: { checkbox: false, input: "" },
      children: [],
    };
    onChange({ ...child, children: [...(child.children || []), newChild] });
  };

  return (
    <div className="child-editor">
      <div className="child-editor-row">
        <InputGroup
          value={child.name}
          placeholder="Child name"
          onChange={(e) => updateField("name", e.target.value)}
          className="child-input"
        />
        <Checkbox
          label="Checkbox"
          checked={child.properties?.checkbox || false}
          onChange={(e) =>
            updateField("properties", {
              ...child.properties,
              checkbox: e.target.checked,
            })
          }
        />
        <Checkbox
          label="Input"
          checked={child.properties?.input || false}
          onChange={(e) =>
            updateField("properties", {
              ...child.properties,
              input: e.target.checked,
            })
          }
        />
        <Checkbox
          label="Category"
          checked={child.properties?.category || false}
          onChange={(e) =>
            updateField("properties", {
              ...child.properties,
              category: e.target.checked,
            })
          }
        />
        <Button icon="cross" minimal onClick={onDelete} />
      </div>

      {child.properties?.category && (
        <>
          <div className="nested-button">
            <Button icon="plus" minimal text="Add Nested Child" onClick={addNestedChild} />
          </div>
          <div className="nested-children">
            {(child.children || []).map((nested) => (
              <ChildEditor
                key={getTaskKey(nested)}
                child={nested}
                onChange={(updated) => updateNestedChild(nested.id, updated)}
                onDelete={() =>
                  onChange({
                    ...child,
                    children: child.children.filter((c) => c.id !== nested.id),
                  })
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const PreviewPanel = ({ previewTask, previewAssignments, setPreviewAssignments, onTaskUpdate }) => {
  const handlePreviewDrop = (result) => {
    if (!result.destination) return;

    const leaves = getSelectedLeaves(previewTask);

    if (leaves?.length) {
      setPreviewAssignments({ "7:30 AM": leaves });
    }
  };
  return (
    <div className="task-form-preview-panel">
      <h4>Preview</h4>
      <DragDropContext onDragEnd={handlePreviewDrop}>
        <div className="preview-bank-schedule">
          <div className="preview-taskbank">
            <Droppable droppableId="preview-bank">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  {previewTask && (
                    <TaskCard
                      task={previewTask}
                      index={0}
                      onEditTask={() => { }}
                      onOpenDrawer={() => { }}
                      onTaskUpdate={onTaskUpdate} // 👈 properly sync changes upward
                      preview={true}
                      hideSettings={true}
                    />
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          <div className="preview-schedule">
            <ScheduleCard
              label="preview"
              timeSlot="7:30 AM"
              assignments={previewAssignments}
              setAssignments={setPreviewAssignments}
              onAssignmentsChange={() => { }}
            />
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};

const NewTaskForm = ({ task, onSave, onDelete }) => {
  const [taskName, setTaskName] = useState("");
  const [children, setChildren] = useState([]);
  const [previewTask, setPreviewTask] = useState(null);
  const [previewAssignments, setPreviewAssignments] = useState({ "7:30 AM": [] });

  useEffect(() => {
    if (task) {
      const updated = {
        ...task,
        name: task.name || "",
        children: task.children || [],
        tempId: task.tempId || uuidv4(), // ✅ Ensure tempId
      };
      setTaskName(updated.name);
      setChildren(updated.children);
      setPreviewTask(updated);
    } else {
      const temp = {
        id: uuidv4(),
        tempId: uuidv4(), // ✅ Set tempId explicitly
        name: "",
        properties: { card: true, category: true },
        children: [],
      };
      setTaskName("");
      setChildren([]);
      setPreviewTask(temp);
    }
  }, [task]);


  useEffect(() => {
    if (previewTask) {
      setPreviewTask((prev) => ({ ...prev, name: taskName, children }));
    }
  }, [taskName, children]);

  const addChild = () => {
    const newChild = {
      id: uuidv4(),
      name: "",
      properties: { checkbox: false, input: false, category: false },
      values: { checkbox: false, input: "" },
      children: [],
    };
    const updatedChildren = [...children, newChild];
    setChildren(updatedChildren);
  };

  const updateChild = (id, updatedChild) => {
    const updated = children.map((c) => (c.id === id ? updatedChild : c));
    setChildren(updated);
  };

  const removeChild = (id) => {
    const filtered = children.filter((c) => c.id !== id);
    setChildren(filtered);
  };

  const handleSave = () => {
    const tempId = task?._id || task?.tempId || uuidv4();
    const newTask = {
      _id: task?._id,
      tempId,
      name: taskName,
      description: "",
      properties: { card: true, category: true },
      children,
    };
    onSave(newTask);
  };

  // ✅ sync updates from preview TaskCard
  const handlePreviewTaskUpdate = (updatedTask) => {
    setPreviewTask(updatedTask);
  };

  return (
    <div className="task-form">
      <div className="task-form-edit-panel task-form-panel"> {/* 🔥 Styled like GoalForm */}
        <h3>{task ? "Edit Task" : "Create New Task"}</h3>
        <FormGroup label="Task Name" labelFor="task-name">
          <InputGroup
            id="task-name"
            placeholder="Enter task name"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
          />
        </FormGroup>

        <div className="task-form-children-section">
          <h5 className="form-section-header">Children</h5>
          <Button icon="plus" text="New Child" onClick={addChild} />
          <div className="task-form-children-list">
            {children.map((child) => (
              <ChildEditor
                key={getTaskKey(child)}
                child={child}
                onChange={(updated) => updateChild(child.id, updated)}
                onDelete={() => removeChild(child.id)}
              />
            ))}
          </div>
        </div>

        <div className="task-form-actions">
          <Button intent="primary" onClick={handleSave} text={task ? "Update Task" : "Save Task"} />
          {task && (
            <Button
              intent="danger"
              onClick={() => onDelete(task)}
              text="Delete"
              style={{ marginLeft: "10px" }}
            />
          )}
        </div>
      </div>

      <PreviewPanel
        previewTask={previewTask}
        previewAssignments={previewAssignments}
        setPreviewAssignments={setPreviewAssignments}
        onTaskUpdate={handlePreviewTaskUpdate}
      />
    </div>
  );
};

export default NewTaskForm;
