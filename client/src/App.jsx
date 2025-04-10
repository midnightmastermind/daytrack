import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { DragDropContext } from "react-beautiful-dnd";
import { DateTime } from "luxon";
import { Drawer, DrawerSize, Position, Toaster, Intent } from "@blueprintjs/core";
import "./App.css";

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

  const flattenGoalTaskIds = (goal) => {
    const ids = new Set();
    const walk = (task) => {
      const id = task.task_id || task._id || task.id;
      if (id) ids.add(id.toString());
      (task.children || []).forEach(walk);
    };
    (goal.tasks || []).forEach(walk);
    return ids;
  };

  const countTasks = (assignments) => {
    const countMap = {};
    for (const slotTasks of Object.values(assignments)) {
      for (const task of slotTasks) {
        const id = task.originalId;
        if (id) countMap[id] = (countMap[id] || 0) + 1;
      }
    }
    return countMap;
  };

  const saveDayPlan = async (assignmentsToSave, type = "actual") => {
    const resultArray = Object.entries(assignmentsToSave[type]).map(([timeSlot, assignedTasks]) => ({
      timeSlot,
      assignedTasks,
    }));
    const existing = dayplans.find((p) => new Date(p.date).toDateString() === selectedDate.toDateString());
    const payload = {
      date: selectedDate,
      plan: type === "preview" ? resultArray : existing?.plan || [],
      result: type === "actual" ? resultArray : existing?.result || [],
    };
    const prevCount = countTasks(lastSavedAssignments[type]);
    const nextCount = countTasks(assignmentsToSave[type]);
    const allTaskIds = new Set([...Object.keys(prevCount), ...Object.keys(nextCount)]);
    const date = selectedDate.toISOString();

    if (type === "actual") {
      for (const taskId of allTaskIds) {
        const count = nextCount[taskId] || 0;
        const relatedGoals = goals.filter((g) => flattenGoalTaskIds(g).has(taskId));
        for (const goal of relatedGoals) {
          const goalId = goal._id?.toString() || goal.tempId;
          dispatch(addPendingProgress({ goalId, date, taskId, count }));
          await dispatch(createGoalProgress({ goalId, date, taskId, count }));
        }
      }
    }

    setLastSavedAssignments({ ...lastSavedAssignments, [type]: assignmentsToSave[type] });

    const response = existing
      ? await dispatch(updateDayPlan({ id: existing._id, dayPlanData: payload }))
      : await dispatch(createDayPlan({ ...payload }));

    AppToaster.show({
      message: response?.payload ? `✅ ${type} schedule saved!` : `❌ Failed to save ${type} schedule`,
      intent: response?.payload ? Intent.SUCCESS : Intent.DANGER,
    });
  };

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

      const selectedLeaves = [];
      let foundChecked = false;

      const walk = (node, ancestry = []) => {
        const isChecked = (node.properties?.checkbox && node.values?.checkbox) ||
          (node.properties?.input && node.values?.input?.trim() !== "");

        const nextAncestry = [...ancestry, node];
        if (isChecked && (!node.children || node.children.length === 0)) {
          foundChecked = true;
          selectedLeaves.push({
            ...node,
            id: node._id?.toString(),
            originalId: node._id?.toString(),
            assignmentId: `${node._id}-${Date.now()}-${Math.random()}`,
            assignmentAncestry: nextAncestry,
          });
        }
        (node.children || []).forEach((child) => walk(child, nextAncestry));
      };

      walk(taskFromBank);

      if (!foundChecked && taskFromBank.properties?.card) {
        selectedLeaves.push({
          ...taskFromBank,
          id: taskFromBank._id?.toString(),
          originalId: taskFromBank._id?.toString(),
          assignmentId: `${taskFromBank._id}-${Date.now()}-${Math.random()}`,
          assignmentAncestry: [taskFromBank],
        });
      }

      updated[type][slotKey] = [...destSlot, ...selectedLeaves];
    }

    setAssignments(updated);
    saveDayPlan(updated, type);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="container">
        <Toolbar
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          planDirty={planDirty}
          onSaveDayPlan={() => saveDayPlan(assignments, "actual")}
        />
        <div className="main-content">
          <div className="time-header">
            <div className="selected-date">DayPlan: {DateTime.fromJSDate(selectedDate).toFormat("M/d/yyyy")}</div>
            <div className="current-time"><LiveTime /></div>
          </div>
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
                <div className="schedule-header">
                  <div className="plan-header">Plan</div>
                  <div className="agenda-header">Agenda</div>
                </div>
                <div className="schedules-scroll-wrapper">
                  <div className="schedules">
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

        <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} size={DrawerSize.MEDIUM} position={Position.LEFT} title="Create / Edit Task">
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

        <Drawer isOpen={goalDrawerOpen} onClose={() => setGoalDrawerOpen(false)} size={DrawerSize.MEDIUM} position={Position.RIGHT} title="Create / Edit Goal">
          <GoalForm
            goal={editingGoal}
            tasks={tasks}
            onSave={(goalData) => {
              const tempId = `temp_${Date.now()}`;
              if (editingGoal && editingGoal._id) {
                dispatch(updateGoalOptimistic({ id: editingGoal._id, updates: goalData }));
                dispatch(updateGoal({ id: editingGoal._id, goalData }));
              } else {
                dispatch(addGoalOptimistic({ ...goalData, tempId }));
                dispatch(createGoal({ ...goalData, tempId }));
              }
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
  );
}

export default App;
