// components/GoalItem.jsx
import React from "react";
import { useSelector } from "react-redux";
import { Card, Button, Tag, Elevation } from "@blueprintjs/core";
import { findTaskByIdDeep } from "../helpers/taskUtils";

const GoalItem = ({ goal, onEdit, showEditButton = true }) => {
  const tasks = useSelector((state) => state.tasks.tasks || []);

  console.log(goal);

  const getLiveTaskName = (taskId) => {
    const match = findTaskByIdDeep(taskId, tasks);
    return match?.name || "(unknown)";
  };

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
          const flowIcon = t.flow === "in" ? "⬆️" : t.flow === "out" ? "⬇️" : "";

          // === GROUPED INPUT TASK ===
          if (t.grouping && Array.isArray(t.units)) {
            const unitSettings = t.unitSettings || (t.unit ? {
              [t.unit]: {
                enabled: true,
                flow: t.flow || "any",
                ...(t.type === "goal"
                  ? {
                      operator: t.operator || "=",
                      target: t.target || 0,
                      timeScale: t.timeScale || "daily",
                    }
                  : {
                      starting: t.starting || 0,
                    }),
              }
            } : {});
            
            const children = Object.entries(unitSettings)
            .filter(([unitKey, unit]) => {
              const unitMeta = t.units.find((u) => u.key === unitKey);
              return unit.enabled && unitMeta?.type !== "text";
            })
            .map(([unitKey, unit]) => {
              const unitMeta = t.units.find((u) => u.key === unitKey);
              return {
                unitKey,
                unitLabel: unitMeta?.label || unitKey,
                flow: unit.flow || "any",
                target: unit.target,
                operator: unit.operator,
                timeScale: unit.timeScale,
                starting: unit.starting,
                type: t.type,
                progress: unitMeta?.progress || 0, // 🔥 this is what was missing
              };
            });

            if (children.length === 0) return null;

            return (
              <div
                key={`group-${t.task_id}-${index}`}
                className="goal-task-grouped"
              >
                <Tag className="group-unit-header" intent="primary">{displayName}</Tag>
                <div className="goal-units-container">
                {children.map((unit) => {
                    const unitKey = unit.unitKey;
                    const unitMeta = t.units.find((u) => u.key === unitKey);
                    const label = unitMeta?.label || unitKey;
                    const flow = unit.flow || "in";
                    const flowIcon = flow === "in" ? "⬆️" : flow === "out" ? "⬇️" : "";

                    const current = unit.progress || 0;
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
                      <div
                        key={unitKey}
                        className="goal-unit"
                      >
                        <Tag className="unit-tag" minimal>{flowIcon} {label}</Tag>
                        {t.type === "goal" ? (
                          <Tag className="unit-progress" intent={intent} minimal={!isComplete}>
                            {current} / {target}
                          </Tag>
                        ) : (
                          <Tag className="unit-progress" intent="primary" minimal>
                            {starting}
                          </Tag>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          // === REGULAR TASK ===
          const current = t.progress || 0;
          const target = t.target || 0;
          const starting = t.starting || 0;
          const operator = t.operator || "=";
          const flow = t.flow || "in";

          const isComplete =
            (operator === "=" && current === target) ||
            (operator === ">" && current > target) ||
            (operator === ">=" && current >= target) ||
            (operator === "<" && current < target) ||
            (operator === "<=" && current <= target);

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
              {t.type === "tracker" ? (
                <Tag className="unit-progress" intent="primary" minimal>
                  Starting: {starting}
                </Tag>
              ) : (
                <Tag className="unit-progress" minimal={!isComplete} intent={intent}>
                  {current} / {target}
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
