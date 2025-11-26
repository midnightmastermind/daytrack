import React from "react";
import GoalCard from "../../components/GoalCard";

const GoalPreviewPanel = ({ goal }) => {
  if (!goal) return null;

  return (
    <div className="goal-preview-panel">
      <GoalCard goal={goal} preview={true} showEditButton={false} />
    </div>
  );
};

export default GoalPreviewPanel;
