import React, { useState, useEffect } from "react";
import { Button, Card } from "@blueprintjs/core";
import { useDispatch } from "react-redux";
import {
  updateGoal,
  updateGoalOptimistic,
  createGoal,
  addGoalOptimistic,
  deleteGoal,
  deleteGoalOptimistic,
} from "../../store/goalSlice";
import { v4 as uuidv4 } from "uuid";
import GoalItemEditor from "./GoalItemEditor";
import CountdownEditor from "./CountdownEditor";
import GoalPreviewPanel from "./GoalPreviewPanel";
import { getTaskAncestryByIdDeep } from "../../helpers/taskUtils";
import Section from "../../components/Section";
import Input from "../../components/Input";
import "./GoalForm.css";

const GoalForm = ({ goal, tasks, onSave, onClose }) => {
  const dispatch = useDispatch();
  const [headerName, setHeaderName] = useState("");
  const [headerEnabled, setHeaderEnabled] = useState(false);
  const [goalItems, setGoalItems] = useState([]);
  const [countdowns, setCountdowns] = useState([]);

  const taskOptions = getTaskOptions(tasks || []);

  useEffect(() => {
    if (!goal) {
      setHeaderName("");
      setHeaderEnabled(false);
      setGoalItems([]);
      setCountdowns([]);
      return;
    }

    setHeaderName(goal.header || "");
    setHeaderEnabled(!!goal.header);
    setCountdowns(
      (goal.countdowns || []).map((cd) => ({
        ...cd,
        date: new Date(cd.date),
      }))
    );
    setGoalItems(goal.goalItems || []);
  }, [goal]);

  const handleSaveGoal = () => {
    const newGoal = {
      header: headerEnabled ? headerName : "",
      goalItems,
      countdowns: countdowns.map((cd) => ({
        ...cd,
        date: cd.date instanceof Date ? cd.date.toISOString() : cd.date,
      })),
    };

    const tempId = goal?.tempId || `temp_${uuidv4()}`;
    const fullGoal = { ...newGoal, tempId };

    if (goal && goal._id) {
      dispatch(updateGoalOptimistic({ id: goal._id, updates: fullGoal }));
      dispatch(updateGoal({ id: goal._id, goalData: fullGoal }));
    } else {
      dispatch(addGoalOptimistic(fullGoal));
      dispatch(createGoal(fullGoal));
    }

    onSave?.(fullGoal);
  };

  const updateGoalItem = (index, updatedItem) => {
    const updated = [...goalItems];
    updated[index] = updatedItem;
    setGoalItems(updated);
  };

  const removeGoalItem = (index) => {
    setGoalItems(goalItems.filter((_, i) => i !== index));
  };

  const updateCountdown = (index, key, value) => {
    const updated = countdowns.map((cd, i) =>
      i === index ? { ...cd, [key]: value } : cd
    );
    setCountdowns(updated);
  };

  const removeCountdown = (index) => {
    setCountdowns(countdowns.filter((_, i) => i !== index));
  };

  function getTaskOptions(taskTree = []) {
    const result = [];

    function walk(tasks) {
      for (const task of tasks) {
        const id = task._id || task.tempId || task.id;
        const ancestry = getTaskAncestryByIdDeep(taskTree, id);
        const pathArray = ancestry?.map((t) => t.name) || [];
        console.log(ancestry);
        console.log(pathArray);
        result.push({
          id,
          ancestry: ancestry,
          pathArray: pathArray,
          hasInput: task.properties?.input || false,
        });

        if (task.children) walk(task.children);
        if (task.categories) walk(task.categories);
      }
    }

    walk(taskTree);
    return result;
  }
  console.log(taskOptions);
  return (
    <div className="goal-form">
      <div className="goal-form-section-container">
        <Card className="goal-editor" elevation={2}>
          <Section label="Goal Header" labelSize="large">
            <Input
              type="switch"
              value={headerEnabled}
              onChange={setHeaderEnabled}
            />
            {headerEnabled && (
              <Input
                type="text"
                label="Header Name"
                value={headerName}
                onChange={setHeaderName}
              />
            )}
          </Section>

          <Section className="goal-items" label="Goal Items" labelSize="large" flexDirection="column">
            {goalItems.map((item, idx) => (
              <GoalItemEditor
                key={idx}
                index={idx}
                goalItem={item}
                onUpdate={(updated) => updateGoalItem(idx, updated)}
                onDelete={() => removeGoalItem(idx)}
                taskOptions={taskOptions}
                tasks={tasks}
              />
            ))}
            <Button
              icon="plus"
              text="Add Goal Item"
              onClick={() =>
                setGoalItems((prev) => [
                  ...prev,
                  {
                    label: "",
                    timeScale: "daily",
                    valueType: "integer",
                    hasTarget: true,
                    target: 0,
                    operator: "=",
                    starting: 0,
                    tasks: [],
                  },
                ])
              }
              minimal
              intent="primary"
            />
          </Section>

          <Section label="Countdowns">
            {countdowns.map((cd, i) => (
              <CountdownEditor
                key={`cd-${i}`}
                index={i}
                countdown={cd}
                updateCountdown={updateCountdown}
                removeCountdown={removeCountdown}
              />
            ))}
            <Button
              icon="time"
              text="Add Countdown"
              onClick={() =>
                setCountdowns((prev) => [...prev, { name: "", date: new Date() }])
              }
              minimal
              intent="primary"
            />
          </Section>
        </Card>

        <div className="goal-form-actions">
          <Button onClick={handleSaveGoal} text="Save Goal" intent="primary" />
          {goal && goal._id && (
            <Button
              onClick={() => {
                dispatch(deleteGoalOptimistic(goal._id));
                dispatch(deleteGoal(goal._id));
                onClose();
              }}
              className="delete-button"
              text="Delete"
              intent="danger"
            />
          )}
        </div>

        <GoalPreviewPanel
          headerEnabled={headerEnabled}
          headerName={headerName}
          goalItems={goalItems}
          countdowns={countdowns}
        />
      </div>
    </div>
  );
};

export default GoalForm;
