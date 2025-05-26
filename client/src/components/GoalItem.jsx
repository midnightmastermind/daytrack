import React, { useRef, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Card, Button, Tag, Elevation } from "@blueprintjs/core";
import { findTaskByIdDeep } from "../helpers/taskUtils";

const GoalItem = ({ goal, onEdit, showEditButton = true }) => {
  const tasks = useSelector((state) => state.tasks.tasks || []);
  const [changeIndicators, setChangeIndicators] = useState({});
  const prevValuesRef = useRef({});

  const getLiveTaskName = (taskId) => {
    const match = findTaskByIdDeep(taskId, tasks);
    return match?.name || "(unknown)";
  };

  const triggerChangeIndicator = (key, direction) => {
    setChangeIndicators((prev) => ({ ...prev, [key]: direction }));
    setTimeout(() => {
      setChangeIndicators((prev) => ({ ...prev, [key]: null }));
    }, 1500);
  };

  const getProgressValue = (taskId, unitKey = null) => {
    if (unitKey) return goal.totals?.[unitKey] || 0;
    return goal.totals?.[taskId] || 0;
  };

  useEffect(() => {
    const next = {};
    const updates = {};

    for (const task of goal.tasks || []) {
      const taskKey = task.task_id || task._id || task.id;

      if (task.grouping && Array.isArray(task.units)) {
        for (const unit of task.units.filter((u) => u.type !== "text")) {
          const unitKey = unit.key;
          const key = `${taskKey}__${unitKey}`;
          const current = getProgressValue(taskKey, unitKey);
          const prev = prevValuesRef.current[key] ?? 0;

          next[key] = current;

          if (current !== prev) {
            updates[key] = current > prev ? "up" : "down";
          }
        }
      } else {
        const key = taskKey;
        const current = getProgressValue(taskKey);
        const prev = prevValuesRef.current[key] ?? 0;

        next[key] = current;

        if (current !== prev) {
          updates[key] = current > prev ? "up" : "down";
        }
      }
    }

    prevValuesRef.current = next;

    for (const key in updates) {
      triggerChangeIndicator(key, updates[key]);
    }
  }, [goal.totals]);

  return (
    <Card className="goal-item" elevation={Elevation.TWO}>
      <div className="goal-header">
        {goal.header && <div className="goal-header-preview">{goal.header}</div>}
        {showEditButton && (
          <Button icon="cog" minimal className="edit-goal-button" onClick={() => onEdit?.(goal)} />
        )}
      </div>

      <div className="goal-tasks">
        {goal.tasks?.map((t, index) => {
          const displayName = getLiveTaskName(t.task_id || t._id || t.id);
          const taskKey = t.task_id || t._id || t.id;

          if (t.grouping && Array.isArray(t.units)) {
            return (
              <div key={`group-${taskKey}-${index}`} className="goal-task-grouped">
                <Tag className="group-unit-header" intent="primary">{displayName}</Tag>
                <div className="goal-units-container">
                  {t.units
                    .filter((unit) => unit.type !== "text" && t.unitSettings?.[unit.key]?.enabled)
                    .map((unit) => {
                      const label = unit.label || unit.key;
                      const unitKey = unit.key;
                      const key = `${taskKey}__${unitKey}`;
                      const change = changeIndicators[key];
                      const current = getProgressValue(taskKey, unitKey);
                      const target = t.unitSettings?.[unitKey]?.target || 0;
                      const operator = t.unitSettings?.[unitKey]?.operator || "=";
                      const isComplete =
                        (operator === "=" && current === target) ||
                        (operator === ">" && current > target) ||
                        (operator === "<" && current < target);
                      const intent = isComplete ? "success" : "danger";
                      
                      console.log("Label", label)
                      console.log("Change", change);
                      return (
                        <div key={unitKey} className="goal-unit" style={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Tag className="unit-tag" minimal>{label}</Tag>
                          <Tag className="unit-progress" intent={intent} minimal={!isComplete}>
                            {current} / {target}
                          </Tag>
                          {change === "up" && <span className="triangle-indicator success">▲</span>}
                          {change === "down" && <span className="triangle-indicator danger">▼</span>}
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          }

          const current = getProgressValue(taskKey);
          const target = t.target || 0;
          const operator = t.operator || "=";
          const isComplete =
            (operator === "=" && current === target) ||
            (operator === ">" && current > target) ||
            (operator === "<" && current < target);
          const intent = isComplete ? "success" : "danger";
          const key = taskKey;
          const change = changeIndicators[key];

          return (
            <div key={`regular-${key}-${index}`} className="goal-task" style={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Tag intent="primary">{displayName}</Tag>
              {t.type === "tracker"
                ? <Tag intent="primary" minimal>{current}</Tag>
                : <Tag intent={intent} minimal={!isComplete}>{current} / {target}</Tag>}
              {change === "up" && <span className="triangle-indicator success">▲</span>}
              {change === "down" && <span className="triangle-indicator danger">▼</span>}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default GoalItem;
