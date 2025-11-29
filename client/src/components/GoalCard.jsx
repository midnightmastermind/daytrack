import React, { useRef, useEffect, useState } from "react";
import { Card, Button, Tag, Elevation } from "@blueprintjs/core";
import { formatValueWithAffixes } from "../helpers/taskUtils";
import { getTodayKey, getWeek } from "../helpers/goalUtils";
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

const GoalItem = ({ item, changeIndicators, triggerChangeIndicator }) => {
  const key = `${item.goalId}__item${item.order}`;
  const getProgressValue = () => {
    const timeScale = item.timeScale || "overall";

    if (timeScale === "overall") {
      return item.totals?.[key] || 0;
    }

    const dateKey = getTodayKey();

    return item.totalsByDate?.[dateKey]?.[key] || 0;
  };

  function formatItemValue(value, item) {
    return formatValueWithAffixes(item.unitPrefix || "", value, item.valueType || "string", item.unitSuffix || "");
  }

  const isComplete = ({ current, target, operator = "=", hasTarget = true }) => {
    if (!hasTarget || target == null) return current > 0;
    switch (operator) {
      case "=": return current === target;
      case ">": return current > target;
      case "<": return current < target;
      default: return false;
    }
  };

  const current = getProgressValue();

  const complete = isComplete({
    current,
    target: item.target ?? 0,
    operator: item.operator || "=",
    hasTarget: item.hasTarget !== false,
  });
  const intent = complete ? "success" : "danger";
  const change = changeIndicators[key];
  return (
    <div className="goal-task" style={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Tag className="unit-tag" intent={intent} minimal={!complete}>
        <TaskIcon icon={item.icon} />
        {item.label}
      </Tag>
      {item.hasTarget === false ? (
        <Tag intent={intent} minimal>
          {formatItemValue(current, item)}
        </Tag>) : (
        <Tag intent={intent} minimal={!complete}>
          {formatItemValue(current, item)} / {formatItemValue(item.target, item)}
        </Tag>
      )}
      {change === "up" && <span className="triangle-indicator success">▲</span>}
      {change === "down" && <span className="triangle-indicator danger">▼</span>}
    </div>
  );
};

const GoalCard = ({ goal, onEdit, showEditButton = true, dragListeners = {}, dragAttributes = {} }) => {
  const [changeIndicators, setChangeIndicators] = useState({});
  const prevValuesRef = useRef({});

  const triggerChangeIndicator = (key, direction) => {
    setChangeIndicators((prev) => ({ ...prev, [key]: direction }));
    setTimeout(() => {
      setChangeIndicators((prev) => ({ ...prev, [key]: null }));
    }, 1500);
  };

  useEffect(() => {
    const updates = {};
    const next = {};

    for (const item of goal.goalItems || []) {
      const key = `${item.goalId}__${item.order}`;
      let current = 0;
      if (item.timeScale === "overall") {
        current = item.totals?.[key] || 0;
      } else {
        const dateKey = new Date().toISOString().split("T")[0];
        current = item.totalsByDate?.[dateKey]?.[key] || 0;
      }
      const prev = prevValuesRef.current[key] ?? 0;
      next[key] = current;
      if (current !== prev) updates[key] = current > prev ? "up" : "down";
    }

    prevValuesRef.current = next;
    for (const key in updates) triggerChangeIndicator(key, updates[key]);
  }, [goal.goalItems]);

  return (
    <Card className="goal-item" elevation={Elevation.TWO}>
      <div className="goal-header">
        {goal.header && <div className="goal-header-preview">{goal.header}</div>}
        {showEditButton && (
          <Button icon="cog" minimal className="edit-goal-button" onClick={() => onEdit?.(goal)} />
        )}
      </div>
      <div className="goal-content" {...dragAttributes} {...dragListeners}>
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

        {(goal.goalItems || []).map((item, idx) => (
          <GoalItem
            key={`goal-item-${idx}`}
            item={item}
            changeIndicators={changeIndicators}
            triggerChangeIndicator={triggerChangeIndicator}
          />
        ))}
      </div>
    </Card>
  );
};

export default GoalCard;
