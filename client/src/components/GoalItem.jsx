import React, { useRef, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Card, Button, Tag, Elevation } from "@blueprintjs/core";
import { findTaskByIdDeep, formatValueWithAffixes } from "../helpers/taskUtils";
import { getWeek } from "../helpers/goalUtils";
import TaskIcon from "./TaskIcon";

import { DateTime } from "luxon";

const formatCountdownPreview = (name, date) => {
  if (!date || !name) return null;
  const parsed = date instanceof Date ? date : new Date(date);
  const now = DateTime.now();
  const then = DateTime.fromJSDate(parsed);

  if (!then.isValid) return null;

  const diff = then.diff(now, ["days", "hours", "minutes"]).toObject();
  if (diff.days < 0) return `⏳ ${name} has passed`;

  const parts = [];
  if (diff.days >= 1) parts.push(`${Math.floor(diff.days)}d`);
  if (diff.hours >= 1) parts.push(`${Math.floor(diff.hours)}h`);
  if (diff.minutes >= 1 && diff.days < 1) parts.push(`${Math.floor(diff.minutes)}m`);

  return `⏳ ${parts.join(" ")} until ${name}`;
};


const GoalItem = ({ goal, onEdit, showEditButton = true, dragListeners = {}, dragAttributes = {}, preview = false }) => {
  console.log(goal);
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
    const task = goal.tasks.find(t => t.task_id === taskId || t._id === taskId || t.id === taskId);
    const unitSettings = unitKey ? task?.unitSettings?.[unitKey] : task;
    const timeScale = unitSettings?.timeScale || "overall";

    if (timeScale === "overall") {
      return goal.totals?.[unitKey || taskId] || 0;
    }

    if (timeScale === "daily" || timeScale === "weekly" || timeScale === "monthly") {
      // Use filtered values from totalsByDate
      for (const [date, totalsForDate] of Object.entries(goal.totalsByDate || {})) {
        const dateObj = new Date(date);
        const selected = new Date(); // or pass this as prop
        const match = {
          daily: dateObj.toDateString() === selected.toDateString(),
          weekly:
            dateObj.getFullYear() === selected.getFullYear() &&
            getWeek(dateObj) === getWeek(selected),
          monthly:
            dateObj.getFullYear() === selected.getFullYear() &&
            dateObj.getMonth() === selected.getMonth(),
        };
        if (match[timeScale]) {
          return totalsForDate?.[unitKey || taskId] || 0;
        }
      }
    }

    return 0;
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

  function isComplete({ current, target, operator = "=", hasTarget = true }) {
    if (!hasTarget || target == null) {
      return current > 0;
    }

    switch (operator) {
      case "=":
        return current === target;
      case ">":
        return current > target;
      case "<":
        return current < target;
      default:
        return false;
    }
  }

  return (
    <Card className="goal-item" elevation={Elevation.TWO}>
      <div className="goal-header">
        {goal.header && <div className="goal-header-preview">{goal.header}</div>}
        {showEditButton && (
          <Button icon="cog" minimal className="edit-goal-button" onClick={() => onEdit?.(goal)} />
        )}
      </div>
      <div className="goal-content"  {...dragAttributes} {...dragListeners}>
        {goal.countdowns?.length > 0 && (
          <div className="goal-countdown-tags">
            {goal.countdowns.map((cd, idx) => {
              const label = formatCountdownPreview(cd.name, cd.date);
              return (
                label && (
                  <Tag key={`goal-cd-${idx}`} icon="time" minimal>
                    {label}
                  </Tag>
                )
              );
            })}
          </div>
        )}
        <div className="goal-tasks">
          {(goal.tasks || [])
            .slice()
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((task, index) => {
              const displayName = getLiveTaskName(task.task_id || task._id || task.id);
              const taskKey = task.task_id || task._id || task.id;
              const actualTask = findTaskByIdDeep(taskKey, tasks);
              if (task.grouping && Array.isArray(task.units)) {
                return (
                  <div key={`group-${taskKey}-${index}`} className="goal-task-grouped">
                    <Tag className="group-unit-header" intent="primary">
                      <TaskIcon icon={task.properties?.icon} />
                      {displayName}
                    </Tag>
                    <div className="goal-units-container">
                    {task?.units && Array.isArray(task.units) &&
                        [...task.units]
                          .sort((a, b) => {
                            const orderA = task.unitSettings?.[a.key]?.order ?? a.index ?? 0;
                            const orderB = task.unitSettings?.[b.key]?.order ?? b.index ?? 0;
                            if (typeof orderA !== "number") return 1;
                            if (typeof orderB !== "number") return -1;
                            return orderA - orderB;
                          })
                        .filter((unit) => unit.type !== "text" && task.unitSettings?.[unit.key]?.enabled)
                        .map((unit) => {
                          const label = unit.name;
                          const unitKey = unit.key;
                          const key = `${taskKey}__${unitKey}`;
                          const change = changeIndicators[key];
                          const current = getProgressValue(taskKey, unitKey) || 0;
                          const unitSettings = task.unitSettings?.[unitKey];
                          const target = unitSettings?.target || 0;
                          const operator = unitSettings?.operator || "=";
                          const complete = isComplete({
                            current,
                            target,
                            operator,
                            hasTarget: unitSettings?.hasTarget !== false,
                          });

                          const intent = complete ? "success" : "danger";

                          const currentDisplay = formatValueWithAffixes(unit.prefix, current, unit.type, unit.suffix);
                          const targetDisplay = formatValueWithAffixes(unit.prefix, target, unit.type, unit.suffix);

                          return (
                            <div key={unitKey} className="goal-unit" style={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Tag className="unit-tag" intent={intent} minimal={!complete}>
                                <TaskIcon icon={unit.icon} />
                                {label}
                              </Tag>
                              {unitSettings?.hasTarget === false
                                ? <Tag intent={intent} minimal={!complete}>{currentDisplay}</Tag>
                                : <Tag className="unit-progress" intent={intent} minimal={!complete}>
                                  {currentDisplay} / {targetDisplay}
                                </Tag>}
                              {change === "up" && <span className="triangle-indicator success">▲</span>}
                              {change === "down" && <span className="triangle-indicator danger">▼</span>}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              }

              const current = getProgressValue(taskKey) || 0;
              const target = task.target || 0;
              const operator = task.operator || "=";
              const complete = isComplete({
                current,
                target,
                operator,
                hasTarget: task?.hasTarget !== false,
              });
              const intent = complete ? "success" : "danger";
              const key = taskKey;
              const change = changeIndicators[key];

              const currentDisplay = formatValueWithAffixes("", current, task.type, "");
              const targetDisplay = formatValueWithAffixes("", target, task.type, "");

              return (
                <div key={`regular-${key}-${index}`} className="goal-task" style={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Tag className="unit-tag" intent={intent} minimal={!complete}>
                    <TaskIcon icon={actualTask?.properties?.icon} />
                    {displayName}
                  </Tag>
                  {task.hasTarget == false
                    ? <Tag intent={intent} minimal>{currentDisplay}</Tag>
                    : <Tag intent={intent} minimal={!complete}>{currentDisplay} / {targetDisplay}</Tag>}
                  {change === "up" && <span className="triangle-indicator success">▲</span>}
                  {change === "down" && <span className="triangle-indicator danger">▼</span>}
                </div>
              );
            })}
        </div>
      </div>
    </Card>
  );
};

export default GoalItem;
