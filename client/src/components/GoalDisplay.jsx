// === GoalDisplay.jsx ===
import React from "react";
import { useSelector } from "react-redux";
import { Card, Button, Tag, Elevation } from "@blueprintjs/core";
import { findTaskByIdDeep } from "../helpers/taskUtils"; // ✅ import helper
import GoalItem from "./GoalItem";

const GoalDisplay = ({ goals, onEditGoal }) => {
  return (
    <div className="goal-display-container">
      <div className="goal-display-header">
        <div className="section-header">Goals / Habits</div>
        <Button icon="plus" text="New Goal" minimal onClick={() => onEditGoal(null)} />
      </div>
      <div className="goals-container">
        {goals && goals.length > 0 ? (
          goals.map((goal) => <GoalItem key={goal._id || goal.id} goal={goal} onEdit={onEditGoal} />)
        ) : (
          <div>No goals yet</div>
        )}
      </div>
    </div>
  );
};

export default GoalDisplay;
