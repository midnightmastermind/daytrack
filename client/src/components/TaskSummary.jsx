// TaskSummary.jsx
import React from "react";
import { Tag } from "@blueprintjs/core";

const getInputSummary = (input) => {
  if (typeof input === "string") return input.trim();
  if (typeof input === "object" && input !== null) {
    return Object.entries(input)
      .filter(([_, val]) => typeof val?.value !== "undefined")
      .map(([key, val]) => `${key}: ${val.value}`)
      .join(", ");
  }
  return "";
};

const extractAncestryTags = (task, showAncestry = false) => {
  const ancestry = task.assignmentAncestry || [];
  const inputSummary = getInputSummary(task.values?.input);
  const baseLabel = inputSummary ? `${task.name}: ${inputSummary}` : task.name || "(unnamed)";
  const taskKey = task._id || task.id || baseLabel;

  if (!showAncestry || ancestry.length === 0) {
    return [{
      key: taskKey,
      name: baseLabel,
      intent: "primary",
      minimal: false,
    }];
  }

  return ancestry.map((node, i, arr) => {
    const summary = getInputSummary(node.values?.input);
    const name = summary ? `${node.name}: ${summary}` : node.name || "(unnamed)";
    return {
      key: node._id || node.id || name,
      name,
      intent: i === arr.length - 1 ? "primary" : "none",
      minimal: i !== arr.length - 1,
    };
  });
};

const TaskSummary = ({ task, showAncestry = false, className = "" }) => {
  const tags = extractAncestryTags(task, showAncestry);

  return (
    <div className={`task-summary ${className}`} style={{ display: "flex", flexWrap: "wrap" }}>
      {tags.map((tag) => (
        <Tag
          key={tag.key}
          intent={tag.intent}
          minimal={tag.minimal}
          style={{ marginRight: "5px", marginBottom: "5px" }}
        >
          {tag.name}
        </Tag>
      ))}
    </div>
  );
};

export default TaskSummary;