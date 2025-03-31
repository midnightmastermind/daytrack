import React from "react";
import { Card, Button, Tag, Elevation } from "@blueprintjs/core";

const GoalItem = ({ goal, onEdit }) => {
  return (
    <Card
      className="goal-item"
      elevation={Elevation.TWO}
      style={{
        marginBottom: "10px",
        padding: "10px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        {goal.header && goal.header.trim() !== "" && (
          <h4 className="goal-header-preview">{goal.header}</h4>
        )}
        <div className="goal-tasks">
          {goal.tasks &&
            goal.tasks.map((t) => {
              // Instead of displaying the full path, display only the final segment.
              const displayName =
                t.path && t.path.length > 0
                  ? t.path[t.path.length - 1]
                  : "";
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
                  <Tag minimal intent='primary'>{displayName}</Tag>
                  {t.target ? (
                    <span>
                      ({t.progress || 0}/{t.target})
                    </span>
                  ) : null}
                </div>
              );
            })}
        </div>
      </div>
      <Button
        icon="cog"
        minimal
        className="edit-goal-button"
        onClick={() => onEdit(goal)}
      />
    </Card>
  );
};

const GoalDisplay = ({ goals, onEditGoal }) => {
  return (
    <div className="goal-display-container" style={{ padding: "10px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3>Goals / Habits</h3>
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