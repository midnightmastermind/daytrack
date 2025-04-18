// GoalItem.jsx
import React from "react";
import { useSelector } from "react-redux";
import { Card, Button, Tag, Elevation } from "@blueprintjs/core";
import { findTaskByIdDeep } from "../helpers/taskUtils";

const GoalItem = ({ goal, onEdit, showEditButton = true }) => {
  const tasks = useSelector((state) => state.tasks.tasks || []);

  const getLiveTaskName = (taskId) => {
    const match = findTaskByIdDeep(taskId, tasks);
    return match?.name || "(unknown)";
  };

  return (
    <Card className="goal-item" elevation={Elevation.TWO}>
      <div className="goal-header">
        {goal.header && goal.header.trim() !== "" && (
          <div className="goal-header-preview">{goal.header}</div>
        )}
        {showEditButton && (
          <Button icon="cog" minimal className="edit-goal-button" onClick={() => onEdit?.(goal)} />
        )}
      </div>
      <div className="goal-tasks">
        {goal.tasks &&
          goal.tasks.map((t) => {
            const displayName = getLiveTaskName(t.task_id || t._id || t.id);
            const current = t.progress || 0;
            const target = t.target || 0;
            const operator = t.operator || "=";

            const isComplete =
              (operator === "=" && current === target) ||
              (operator === ">" && current > target) ||
              (operator === ">=" && current >= target) ||
              (operator === "<" && current < target) ||
              (operator === "<=" && current <= target);

            const intent = isComplete ? "success" : "danger";

            return (
              <div
                key={t.task_id}
                className="goal-task"
                style={{
                  marginBottom: "5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <Tag minimal={false} intent="primary">{displayName}</Tag>
                {t.target ? (
                  <Tag minimal={!isComplete} intent={intent}>
                    {current}/{target}
                  </Tag>
                ) : null}
              </div>
            );
          })}
      </div>
    </Card>
  );
};

export default GoalItem;
