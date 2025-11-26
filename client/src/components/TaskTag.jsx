import React, { useState, useRef } from "react";
import { useSelector } from "react-redux";
import {
  Tag,
  Button,
  Popover,
  PopoverInteractionKind,
  Card,
  InputGroup,
} from "@blueprintjs/core";
import {
  findTaskByIdDeep,
  formatValueWithAffixes,
  getAncestorGroupingUnits,
} from "../helpers/taskUtils";
import TaskIcon from "./TaskIcon";

/** === Helper: extract valid input entries === */
const getValidInputEntries = (input = {}, { minimal = false } = {}) => {
  // If it's a primitive (string, number, etc), just return it as one entry
  if (typeof input === "string" || typeof input === "number") {
    if (minimal && (input === 0 || input === "0" || input === "")) return [];
    return [["text", input]];
  }

  if (typeof input !== "object" || input === null) return [];

  return Object.entries(input).filter(([_, val]) => {
    const value = typeof val === "object" ? val?.value : val;
    if (typeof value === "undefined") return false;
    if (minimal && (value === 0 || value === "0" || value === "")) return false;
    return true;
  });
};
/** === TaskAncestry === */
const TaskAncestry = ({ ancestry, currentTaskId }) => {
  if (!ancestry || ancestry.length === 0) return null;

  return (
    <div className="task-ancestry" style={{ display: "flex", gap: "5px" }}>
      {ancestry
        .filter((a) => ((a._id || a.id) !== currentTaskId) && (a.id || a._id))
        .map((ancestor, i) => (
          <Tag
            key={ancestor._id || ancestor.id || `${ancestor.name}-${i}`}
            minimal
            intent="none"
            className="task-tag-ancestor"
          >
            <TaskIcon icon={ancestor?.properties?.icon} />
            {ancestor.name || "(unnamed)"}
          </Tag>
        ))}
    </div>
  );
};

/** === MainTaskTag === */
const MainTaskTag = ({ task }) => {
  const taskId = task._id || task.id || task.name;
  const taskName = task.name || "(unnamed)";

  return (
    <div className="main-task-tag">
      <Tag key={taskId} className={`${task?.properties?.temp ? 'temporary-task' : ''}`} intent="primary" minimal={false}>
        <TaskIcon icon={task?.properties?.icon} />
        {taskName}
      </Tag>
    </div>
  );
};

// /** === TaskSummary === */
// const TaskSummary = ({ task, entries = [], tasks = [] }) => {
//   const taskId = task._id || task.id || task.tempId;
//   const units = getAncestorGroupingUnits(tasks, taskId);

//   if (!entries || entries.length === 0) return null;

//   return (
//     <div className="task-summary">
//       {entries.map(([key, val]) => {
//         const unitMeta = units.find((u) => u.key === key) || {};
//         const value = typeof val === "object" ? val.value : val;
//         const flow = typeof val === "object" ? val.flow : "in";

//         const formatted = formatValueWithAffixes(
//           unitMeta.prefix || "",
//           value,
//           unitMeta.type || "string",
//           unitMeta.suffix || ""
//         );

//         const intent = flow === "in" ? "success" : "danger";

//         return (
//           <div className="summary-unit" key={key}>
//             <Tag className="summary-unit-label" intent={intent}>
//               <TaskIcon icon={unitMeta.icon} />
//               {unitMeta.label || unitMeta.name || key}
//             </Tag>
//             <Tag className="summary-unit-value" intent={intent}>{formatted}</Tag>
//           </div>
//         );
//       })}
//     </div>
//   );
// };

const TaskSummary = ({ task, entries = [], tasks = [] }) => {
  const taskId = task._id || task.id || task.tempId;
  const units = getAncestorGroupingUnits(tasks, taskId.includes("adhoc") ? task.parentId : taskId );

  if (!entries || entries.length === 0) return null;

  return (
    <div className="task-summary" speed={0.5}>
      {entries.map(([key, val]) => {
        // Just print primitive string/number values directly
        if (typeof val !== "object" || val === null) {
          return (
            <div className="summary-unit scroll-child" key={key}>
              <Tag className="summary-unit-value" intent="primary">{val}</Tag>
            </div>
          );
        }

        const unitMeta = units.find((u) => u.key === key) || {};
        const value = val.value;
        const flow = val.flow || "in";

        const formatted = formatValueWithAffixes(
          unitMeta.prefix || "",
          value,
          unitMeta.type || "string",
          unitMeta.suffix || ""
        );

        const intent = flow === "in" ? "success" : "danger";

        return (
          <div className="summary-unit scroll-child" key={key}>
            <Tag className="summary-unit-label" intent={intent}>
              <TaskIcon icon={unitMeta.icon} />
              {unitMeta.label || unitMeta.name || key}
            </Tag>
            <Tag className="summary-unit-value" intent={intent}>{formatted}</Tag>
          </div>
        );
      })}
    </div>
  );
};

const TaskTag = ({
  task,
  showAncestry = false,
  minimalValues = false,
  onRemove = null,
  className = "",
}) => {
  const tasks = useSelector((state) => state.tasks.tasks || []);
  const input = task.values?.input || {};
  const ancestry = showAncestry ? task.assignmentAncestry || [] : [];
  const summaryEntries = getValidInputEntries(input, { minimal: minimalValues });

  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef();

  const taskId = task._id || task.id || task.tempId;
  const combinedClass = `task-tag ${className} ${
    summaryEntries.length === 0 ? "task-standalone" : ""
  }`;

  const content = (
    <div className="task-content">
      {ancestry.length > 0 && (
        <TaskAncestry ancestry={ancestry} currentTaskId={taskId} />
      )}
      <MainTaskTag task={task} />
      {summaryEntries.length > 0 && (
        <TaskSummary task={task} entries={summaryEntries} tasks={tasks} />
      )}
    </div>
  );

  const handleClosePopover = () => setIsOpen(false);

  const EditPopover = (
    <Card style={{ padding: "10px", minWidth: "200px" }}>
      <InputGroup
        value={task.name}
        fill
        disabled
        placeholder="Edit task name"
        style={{ marginBottom: "10px" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Button
          icon="floppy-disk"
          text="Save"
          disabled
          onClick={handleClosePopover}
        />
        <Button
          icon="trash"
          intent="danger"
          onClick={() => {
            handleClosePopover();
            if (onRemove) onRemove();
          }}
        />
      </div>
    </Card>
  );

  const rightIcon = (
    <Popover
      ref={popoverRef}
      interactionKind={PopoverInteractionKind.CLICK}
      isOpen={isOpen}
      onInteraction={(nextOpen) => setIsOpen(nextOpen)}
      content={EditPopover}
      position="bottom-right"
      minimal
    >
      <Button
        icon="cog"
        className={`edit-button ${isOpen ? 'edit-button-isopen' : ''}`}
        minimal
        small
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev); // Toggle open state
        }}
      />
    </Popover>
  );

  if (typeof onRemove === "function" && !task?.properties?.temp) {
    return (
      <Tag
        minimal={true}
        intent="none"
        className={combinedClass}
        rightIcon={rightIcon}
      >
        {content}
      </Tag>
    );
  }

  return (
    <div
      className={combinedClass}
      style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}
    >
      {content}
    </div>
  );
};

export default TaskTag;
