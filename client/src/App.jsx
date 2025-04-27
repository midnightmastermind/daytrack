import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { DragDropContext } from "react-beautiful-dnd";
import { DateTime } from "luxon";
import { Drawer, DrawerSize, Position, Toaster, Intent } from "@blueprintjs/core";
import "./App.css";
import { TimeProvider } from "./context/TimeProvider";
import { buildScheduleAssignmentsFromTask, countTasks } from './helpers/taskUtils.js';
import { buildCompoundKey } from "./helpers/goalUtils";

import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  addTaskOptimistic,
  updateTaskOptimistic,
  deleteTaskOptimistic
} from "./store/tasksSlice";

import {
  fetchGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  addGoalOptimistic,
  updateGoalOptimistic,
  deleteGoalOptimistic
} from "./store/goalSlice";

import {
  fetchGoalProgress,
  createGoalProgress,
  addPendingProgress
} from "./store/goalProgressSlice";

import {
  fetchAllDayPlans,
  createDayPlan,
  updateDayPlan
} from "./store/dayPlanSlice";

import Toolbar from "./components/Toolbar";
import TaskBank from "./components/TaskBank";
import Schedule from "./components/Schedule";
import TaskDisplay from "./components/TaskDisplay";
import GoalDisplay from "./components/GoalDisplay";
import NewTaskForm from "./NewTaskForm";
import GoalForm from "./GoalForm";
import LiveTime from "./components/LiveTime";

import { makeSelectGoalsWithProgress } from "./selectors/goalSelectors";
import DatePickerPopover from "./components/DatePickerPopover.jsx";

const AppToaster = Toaster.create({ position: Position.TOP_RIGHT });

function App() {
  const dispatch = useDispatch();
  const { tasks } = useSelector((state) => state.tasks);
  const { dayplans } = useSelector((state) => state.dayplans);
  const { goals } = useSelector((state) => state.goals);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const goalsWithProgress = useSelector(makeSelectGoalsWithProgress(selectedDate));

  const [taskSnapshot, setTaskSnapshot] = useState([]);
  const taskSnapshotRef = useRef([]);

  const [assignments, setAssignments] = useState({ actual: {}, preview: {} });
  const [lastSavedAssignments, setLastSavedAssignments] = useState({ actual: {}, preview: {} });
  const [task, setTask] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [goalDrawerOpen, setGoalDrawerOpen] = useState(false);
  const [planDirty, setPlanDirty] = useState(false);

  useEffect(() => {
    dispatch(fetchTasks());
    dispatch(fetchAllDayPlans());
    dispatch(fetchGoals());
    dispatch(fetchGoalProgress());
  }, [dispatch]);

  useEffect(() => {
    setTaskSnapshot(tasks);
    taskSnapshotRef.current = tasks;
  }, [tasks]);

  const generateTimeSlots = () => {
    let slots = [];
    let start = DateTime.local().set({ hour: 7, minute: 0 });
    let end = DateTime.local().set({ hour: 23, minute: 30 });
    while (start <= end) {
      slots.push(start.toFormat("h:mm a"));
      start = start.plus({ minutes: 30 });
    }
    return slots;
  };
  const timeSlots = generateTimeSlots();

  useEffect(() => {
    const found = dayplans.find((plan) =>
      new Date(plan.date).toDateString() === selectedDate.toDateString()
    );
    if (found) {
      const actual = {};
      const preview = {};
      (found.result || []).forEach((entry) => {
        actual[entry.timeSlot] = entry.assignedTasks || [];
      });
      (found.plan || []).forEach((entry) => {
        preview[entry.timeSlot] = entry.assignedTasks || [];
      });
      setAssignments({ actual, preview });
      setLastSavedAssignments({ actual, preview });
    } else {
      setAssignments({ actual: {}, preview: {} });
      setLastSavedAssignments({ actual: {}, preview: {} });
    }
    setPlanDirty(false);
  }, [selectedDate, dayplans]);

  const saveDayPlan = async (assignmentsToSave, type = "actual") => {
    const resultArray = Object.entries(assignmentsToSave[type]).map(
      ([timeSlot, assignedTasks]) => ({
        timeSlot,
        assignedTasks,
      })
    );
  
    const existing = dayplans.find(
      (p) => new Date(p.date).toDateString() === selectedDate.toDateString()
    );
  
    const payload = {
      date: selectedDate,
      plan: type === "preview" ? resultArray : existing?.plan || [],
      result: type === "actual" ? resultArray : existing?.result || [],
    };
  
    if (type === "actual") {
      const date = selectedDate.toISOString();
      const countMap = countTasks(assignmentsToSave[type]);
      console.log("🧮 Final countMap:", countMap);
  
      for (const goal of goals) {
        const goalId = goal._id?.toString?.() || goal.tempId;
        const goalType = goal.type || "goal";
        const goalFlowDir = goal.goalFlowDir || "any";
  
        for (const task of goal.tasks || []) {
          const baseId = task.task_id?.toString?.();
          if (!baseId) {
            console.warn("⚠️ Task is missing task_id", task);
            continue;
          }
  
          // === CASE 1: Grouped task from GoalForm UI ===
          if (task.grouping && task.units && task.unitSettings) {
            for (const unit of task.units) {
              if (unit.type === "text") continue;
              const unitKey = unit.key;
              const compoundKey = buildCompoundKey(baseId, unitKey);
              const count = countMap[compoundKey] || 0;
              const flow = task.unitSettings?.[unitKey]?.flow || "in";
  
              const unitSettings = task.unitSettings?.[unitKey] || {};

              const payload = {
                goalId,
                goal_id: goalId,
                date,
                taskId: compoundKey,
                count,
                flow,
                goalFlowDir,
                inputFlow: flow,
                reverseFlow: unitSettings.reverseFlow ?? false,
                hasTarget: unitSettings.hasTarget ?? true,
                useInput: unitSettings.useInput ?? true,
                starting: unitSettings.starting || 0
              };
  
              if (!payload.taskId || payload.taskId === "undefined") {
                console.warn("❌ Skipping invalid taskId in grouped UI", payload);
                continue;
              }
  
              if (goalType === "goal" && count === 0) {
                console.log("🛑 Skipping zero-count grouped UI", compoundKey);
                continue;
              }
  
              console.log(`🔁 [Grouped UI ${goalType}]`, compoundKey, "→", count);
              dispatch(addPendingProgress(payload));
              dispatch(createGoalProgress(payload));
            }
            continue;
          }
          console.log(task);
          // === CASE 2: Grouped task from DB (flattened structure) ===
          if (task.grouping && task.unit) {
            const compoundKey = buildCompoundKey(baseId, task.unit);
            if (!compoundKey) {
              console.warn("⚠️ Skipping invalid compoundKey", task);
              continue;
            }            const count = countMap[compoundKey] || 0;
            const flow = task.flow || "in";
  
            const payload = {
              goalId,
              goal_id: goalId,
              date,
              taskId: compoundKey,
              count,
              flow,
              goalFlowDir,
              inputFlow: flow,
              reverseFlow: task.reverseFlow ?? false,
              hasTarget: task.hasTarget ?? true,
              useInput: task.useInput ?? true,
              starting: task.starting || 0
            };
            
  
            if (!payload.taskId || payload.taskId === "undefined") {
              console.warn("❌ Skipping invalid taskId in grouped DB", payload);
              continue;
            }
  
            if (goalType === "goal" && count === 0) {
              console.log("🛑 Skipping zero-count grouped DB", compoundKey);
              continue;
            }
  
            console.log(`🔁 [Grouped DB ${goalType}]`, compoundKey, "→", count);
            dispatch(addPendingProgress(payload));
            dispatch(createGoalProgress(payload));
            continue;
          }
  
          // === CASE 3: Regular goal or tracker ===
          const count = countMap[baseId] || 0;
          const flow = task.flow || "in";
  
          const payload = {
            goalId,
            goal_id: goalId,
            date,
            taskId: baseId,
            count,
            flow,
            goalFlowDir,
            inputFlow: flow,
            reverseFlow: task.reverseFlow ?? false,
            hasTarget: task.hasTarget ?? true,
            useInput: task.useInput ?? true,
            starting: task.starting || 0
          };
  
          if (!payload.taskId || payload.taskId === "undefined") {
            console.warn("❌ Skipping invalid regular taskId", payload);
            continue;
          }
  
          if (goalType === "goal" && count === 0) {
            console.log("🛑 Skipping zero-count regular task", baseId);
            continue;
          }
  
          console.log(`📌 [Regular ${goalType}]`, baseId, "→", count);
          dispatch(addPendingProgress(payload));
          dispatch(createGoalProgress(payload));
        }
      }
    }
  
    setLastSavedAssignments({
      ...lastSavedAssignments,
      [type]: assignmentsToSave[type],
    });
  
    const response = existing
      ? await dispatch(updateDayPlan({ id: existing._id, dayPlanData: payload }))
      : await dispatch(createDayPlan({ ...payload }));
  
    AppToaster.show({
      message: response?.payload
        ? `✅ ${type} schedule saved!`
        : `❌ Failed to save ${type} schedule`,
      intent: response?.payload ? Intent.SUCCESS : Intent.DANGER,
    });
  };
  
  console.log(goals);
  console.log(tasks);
  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || !source) return;

    const fromTaskBank = source.droppableId === "taskBank";
    const type = destination.droppableId.includes("preview") ? "preview" : "actual";
    const slotKey = destination.droppableId.replace("preview_", "").replace("actual_", "");
    const updated = { ...assignments };
    const destSlot = updated[type][slotKey] || [];

    if (fromTaskBank) {
      const taskFromBank = taskSnapshotRef.current.find((t) => t._id?.toString() === draggableId);
      if (!taskFromBank) return;

      console.log("[🧲 onDragEnd] Dragged task:", taskFromBank.name, taskFromBank);
      const selectedLeaves = buildScheduleAssignmentsFromTask(taskFromBank);
      console.log("[🌿 buildScheduleAssignmentsFromTask] Selected leaves:", selectedLeaves.map(t => t.name));

      if (!selectedLeaves.length && taskFromBank.properties?.card) {
        selectedLeaves.push({
          ...taskFromBank,
          id: taskFromBank._id?.toString(),
          originalId: taskFromBank._id?.toString(),
          assignmentId: `${taskFromBank._id}-${Date.now()}-${Math.random()}`,
          assignmentAncestry: [taskFromBank],
        });
      }

      const currentIds = new Set(destSlot.map(t => t.assignmentId));
      const newTasks = selectedLeaves.filter(t => !currentIds.has(t.assignmentId));
      if (newTasks.length < selectedLeaves.length) {
        AppToaster.show({
          message: "That task is already scheduled at this time.",
          intent: Intent.WARNING,
        });
      }

      updated[type][slotKey] = [...destSlot, ...newTasks];
    }

    setAssignments(updated);
    saveDayPlan(updated, type);
  };

  return (
    <TimeProvider>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="container">
          <Toolbar
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            planDirty={planDirty}
            onSaveDayPlan={() => saveDayPlan(assignments, "actual")}
          />
          <div className="main-content">
            <div className="content">
              <div className="left-side">
                <TaskBank
                  tasks={tasks}
                  onEditTask={(task) => setTask(task)}
                  onOpenDrawer={() => setIsDrawerOpen(true)}
                  onTaskUpdate={(updatedTask) => {
                    const newSnapshot = taskSnapshotRef.current.map((t) =>
                      t._id === updatedTask._id ? updatedTask : t
                    );
                    taskSnapshotRef.current = newSnapshot;
                    setTaskSnapshot(newSnapshot);
                  }}
                />
                <div className="schedule-container dual">
                  <div className="time-header">
                    <div className="selected-date">
                      <DatePickerPopover
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                      />
                    </div>
                    <div className="current-time">
                      <LiveTime />
                    </div>
                    <div className="time-divider" />
                  </div>
                  <div className="schedule-header">
                    <div className="plan-header">Plan</div>
                    <div className="agenda-header">Agenda</div>
                  </div>
                  <div className="schedules-scroll-wrapper">
                    <Schedule
                      label="Plan"
                      timeSlots={timeSlots}
                      assignments={assignments.preview}
                      setAssignments={(data) => setAssignments((prev) => ({ ...prev, preview: data }))}
                      setPlanDirty={setPlanDirty}
                      onAssignmentsChange={(data) => saveDayPlan({ ...assignments, preview: data }, "preview")}
                    />
                    <Schedule
                      label="Agenda"
                      timeSlots={timeSlots}
                      assignments={assignments.actual}
                      setAssignments={(data) => setAssignments((prev) => ({ ...prev, actual: data }))}
                      setPlanDirty={setPlanDirty}
                      onAssignmentsChange={(data) => saveDayPlan({ ...assignments, actual: data }, "actual")}
                    />
                  </div>
                </div>
              </div>
              <div className="right-side">
                <GoalDisplay
                  key={selectedDate.toISOString()}
                  goals={goalsWithProgress}
                  onEditGoal={(goal) => {
                    setEditingGoal(goal);
                    setGoalDrawerOpen(true);
                  }}
                />
                <TaskDisplay timeSlots={timeSlots} assignments={assignments.actual} />
              </div>
            </div>
          </div>

          <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} size={DrawerSize.MEDIUM} position={Position.LEFT} title="Create / Edit Task" className="task-form-drawer">
            <NewTaskForm
              task={task}
              onSave={(taskData) => {
                const tempId = `temp_${Date.now()}`;
                dispatch(addTaskOptimistic({ ...taskData, tempId }));
                dispatch(createTask({ ...taskData, tempId }));
                setIsDrawerOpen(false);
              }}
              onDelete={(t) => {
                dispatch(deleteTaskOptimistic(t._id));
                dispatch(deleteTask(t._id));
                setIsDrawerOpen(false);
              }}
            />
          </Drawer>

          <Drawer isOpen={goalDrawerOpen} onClose={() => setGoalDrawerOpen(false)} size={DrawerSize.MEDIUM} position={Position.RIGHT} title="Create / Edit Goal" className="goal-form-drawer">
            <GoalForm
              goal={editingGoal}
              tasks={tasks}
              onSave={() => {
                setGoalDrawerOpen(false);
              }}
              onDelete={(g) => {
                dispatch(deleteGoalOptimistic(g._id));
                dispatch(deleteGoal(g._id));
                setGoalDrawerOpen(false);
              }}
            />
          </Drawer>
        </div>
      </DragDropContext>
    </TimeProvider>
  );
}

export default App;
