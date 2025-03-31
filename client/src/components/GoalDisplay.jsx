import React from "react";
import { Card, CardList, Elevation, Button, Icon } from "@blueprintjs/core";

// A simple component to render a single goal progress item
const GoalItem = ({ goal, onEdit }) => {
  return (
    <Card className="goal-item" elevation={Elevation.FOUR} style={{ marginBottom: "10px", padding: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          {goal.header && <h4>{goal.header}</h4>}
          <div>
            {goal.tasks && goal.tasks.map((t, idx) => (
              <div key={idx} className="goal-task">
                {t.path} {t.goalValue ? `(${t.progress || 0}/${t.goalValue})` : ""}
              </div>
            ))}
          </div>
        </div>
        <Button icon="cog" minimal onClick={() => onEdit(goal)} />
      </div>
    </Card>
  );
};

const GoalDisplay = ({ goals, onEditGoal }) => {
  return (
    <div className="goal-display-container">
      <div className="goal-display-header-container">
        <div className="goal-display-header">Goals</div>
        <Button icon="plus" text="New Goal" minimal onClick={() => onEditGoal(null)} />
      </div>
      {goals && goals.length > 0 ? (
        <CardList className="goal-list">
          {goals.map((goal) => (
            <GoalItem key={goal._id || goal.id} goal={goal} onEdit={onEditGoal} />
          ))}
        </CardList>
      ) : (
        <div>No goals yet</div>
      )}
    </div>
  );
};

export default GoalDisplay;
