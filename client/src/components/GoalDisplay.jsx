import React from "react";
import { Card, Button, Tag, Elevation } from "@blueprintjs/core";

const GoalItem = ({ goal, onEdit }) => {
  return (
    <Card
      className="goal-item"
      elevation={Elevation.TWO}
    >
      <div className="goal-header">
        {goal.header && goal.header.trim() !== "" && (
          <div className="goal-header-preview">{goal.header}</div>
        )}
        <Button
          icon="cog"
          minimal
          className="edit-goal-button"
          onClick={() => onEdit(goal)}
        />
      </div>
      <div className="goal-tasks">
        {goal.tasks &&
          goal.tasks.map((t) => {
            const displayName =
              t.path && t.path.length > 0 ? t.path[t.path.length - 1] : "";

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

const GoalDisplay = ({ goals, onEditGoal }) => {
  return (
    <div className="goal-display-container">
      <div
        className="goal-display-header"
      >
        <div className="section-header">Goals / Habits</div>
        <Button
          icon="plus"
          text="New Goal"
          minimal
          onClick={() => onEditGoal(null)}
        />
      </div>
      <div className="goals-container">
        {goals && goals.length > 0 ? (
          goals.map((goal) => (
            <GoalItem key={goal._id || goal.id} goal={goal} onEdit={onEditGoal} />
          ))
        ) : (
          <div>No goals yet</div>
        )}
      </div>
    </div>
  );
};

export default GoalDisplay;