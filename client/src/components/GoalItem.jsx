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
  const getGoalChildrenFromSettings = (units, unitSettings) =>
    units
      .filter(u => u.type !== "text") // skip text-only
      .map(u => ({
        unitKey: u.key,
        unitLabel: u.label,
        value: 0,
        ...unitSettings[u.key],
      }));
  return (
    <Card className="goal-item" elevation={Elevation.TWO}>
      <div className="goal-header">
        {goal.header && (
          <div className="goal-header-preview">{goal.header}</div>
        )}
        {showEditButton && (
          <Button
            icon="cog"
            minimal
            className="edit-goal-button"
            onClick={() => onEdit?.(goal)}
          />
        )}
      </div>

      <div className="goal-tasks">
        {goal.tasks?.map((t, index) => {
          const displayName = getLiveTaskName(t.task_id || t._id || t.id);

          // === GROUPED INPUT TASK ===
          if (t.grouping && Array.isArray(t.children)) {
            if (t.children.length === 0) return null;

            return (
              <div
                key={`group-${t.task_id}-${index}`}
                className="goal-task-grouped"
              >
                <Tag className="group-unit-header" intent="primary">
                  {displayName}
                </Tag>
                <div className="goal-units-container">
                  {t.children.map((unit) => {
                    if (unit.enabled) {
                      const label = unit.unitLabel || unit.unitKey;
                      const flow = unit.flow || "in";
                      const flowIcon = flow === "in" ? "⬆️" : flow === "out" ? "⬇️" : "";

                      const current = unit.value || 0;
                      const target = unit.target || 0;
                      const starting = unit.starting || 0;
                      const operator = unit.operator || "=";

                      const isComplete =
                        (operator === "=" && current === target) ||
                        (operator === ">" && current > target) ||
                        (operator === ">=" && current >= target) ||
                        (operator === "<" && current < target) ||
                        (operator === "<=" && current <= target);

                      const intent = isComplete ? "success" : "danger";

                      return (
                        <div key={unit.unitKey} className="goal-unit">
                          <Tag className="unit-tag" minimal>
                            {flowIcon} {label}
                          </Tag>
                          {target ? (
                            <Tag
                              className="unit-progress"
                              intent={intent}
                              minimal={!isComplete}
                            >
                              {current} / {target}
                            </Tag>
                          ) : (
                            <Tag className="unit-progress" intent="primary" minimal>
                              {current}
                            </Tag>
                          )}
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            );
          }

          // === REGULAR TASK ===
          const {
            value = 0,
            target = 0,
            starting = 0,
            operator = "=",
            flow = "in",
            type,
          } = t;

          const isComplete =
            (operator === "=" && value === target) ||
            (operator === ">" && value > target) ||
            (operator === ">=" && value >= target) ||
            (operator === "<" && value < target) ||
            (operator === "<=" && value <= target);

          const intent = isComplete ? "success" : "danger";
          const icon = flow === "in" ? "⬆️" : flow === "out" ? "⬇️" : "";

          return (
            <div
              key={`regular-${t.task_id}-${index}`}
              className="goal-task"
              style={{
                marginBottom: "5px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Tag minimal={false} intent="primary">
                {displayName}
              </Tag>
              {type === "tracker" ? (
                <Tag className="unit-progress" intent="primary" minimal>
                  {value}
                </Tag>
              ) : (
                <Tag className="unit-progress" minimal={!isComplete} intent={intent}>
                  {value} / {target}
                </Tag>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default GoalItem;
