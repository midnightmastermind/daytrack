import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { DragDropContext } from "react-beautiful-dnd";
import { DateTime } from "luxon";
import { Drawer, DrawerSize, Position, Toaster, Intent } from "@blueprintjs/core";
import "./App.css";
import { TimeProvider } from "./context/TimeProvider";
import { buildScheduleAssignmentsFromTask, countTasks, filterByTaskAndUnit, findTaskByIdDeep, countValues, insertTaskById } from './helpers/taskUtils.js';
import { buildCompoundKey, splitCompoundKey, calculateGoalProgress } from "./helpers/goalUtils";

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
  deleteGoalProgress,
  updateGoalProgress,
  addPendingProgress,
  removePendingProgress
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
  const { goalprogress } = useSelector((state) => state.goalProgress);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const goalsWithProgress = useSelector(makeSelectGoalsWithProgress(selectedDate));

  const [taskSnapshot, setTaskSnapshot] = useState([]);
  const taskSnapshotRef = useRef([]);
  const adhocDraftMapRef = useRef(new Map());

  const [assignments, setAssignments] = useState({ actual: {}, preview: {} });
  const [lastSavedAssignments, setLastSavedAssignments] = useState({ actual: {}, preview: {} });
  const [task, setTask] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [goalDrawerOpen, setGoalDrawerOpen] = useState(false);
  const [planDirty, setPlanDirty] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  useEffect(() => {
    dispatch(fetchTasks());
    dispatch(fetchAllDayPlans());
    dispatch(fetchGoals());
    dispatch(fetchGoalProgress());
  }, [dispatch]);

  useEffect(() => {
    console.log("New Tasks: ", tasks);
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

  const handleInsertAdhoc = (tempId, draftTask) => {
    if (!adhocDraftMapRef.current.has(tempId)) {
      adhocDraftMapRef.current.set(tempId, draftTask);
    }
  }

  const insertAdhocTask = (task) => {
    console.log("insert adhoc task: ", task);
    dispatch(addTaskOptimistic(task));

    const updatedSnapshot = insertTaskById(taskSnapshotRef.current, task.parentId, task);
    console.log("updated snapshot: ", task);

    setTaskSnapshot(updatedSnapshot);
    taskSnapshotRef.current = updatedSnapshot;
  };

  const saveDayPlan = async (assignmentsToSave, type = "actual") => {
    console.log("====saveDayPlan====");

    const resultArray = Object.entries(assignmentsToSave[type]).map(
      ([timeSlot, assignedTasks]) => ({
        timeSlot,
        assignedTasks,
      })
    );

    const existing = dayplans.find(
      (p) => new Date(p.date).toDateString() === selectedDate.toDateString()
    );

    const dayPlanPayload = {
      date: selectedDate,
      plan: type === "preview" ? resultArray : existing?.plan || [],
      result: type === "actual" ? resultArray : existing?.result || [],
    };

    if (type === "actual") {
      const date = selectedDate.toISOString();
      const countArray = countTasks(assignmentsToSave[type]);
      const valueArray = countValues(assignmentsToSave[type]);
      const prevCountArray = countTasks(lastSavedAssignments[type] || {});


      for (const goal of goals) {
        const goalId = goal._id?.toString?.() || goal.tempId;
        const calculations = calculateGoalProgress({ goal, countArray, valueArray, tasks });

        const dateStr = new Date(date).toDateString();

        const existingProgress = goalprogress
          .filter((r) => r.goal_id?.toString?.() === goalId && new Date(r.date).toDateString() === dateStr);

        const progressLookup = {};
        for (const rec of existingProgress) {
          const taskId = rec.taskId;
          const key = `${taskId}__${rec.progressKey || "null"}`;
          progressLookup[key] = rec;
        }

        for (const [taskId, result] of Object.entries(calculations || {})) {
          if (typeof result === "number") {
            let taskIdStr = taskId?.toString?.();
            if (!taskIdStr || taskIdStr === "undefined") {
              taskIdStr = `${goalId}__null__adhoc_${Date.now()}`;
            }
            if (typeof result !== "number" || isNaN(result)) continue;

            const key = `${taskIdStr}__null`;
            const existing = progressLookup[key];
            const payload = { goalId, date, taskId: taskIdStr, progressKey: null, value: result };
            dispatch(addPendingProgress(payload));

            if (result === 0 && existing) {
              dispatch(deleteGoalProgress({ id: existing._id }));
            } else if (existing && existing.value !== result) {
              dispatch(updateGoalProgress({ id: existing._id, updates: { value: result } }));
            } else if (!existing && result !== 0) {
              dispatch(createGoalProgress(payload));
            }

          } else if (typeof result === "object") {
            for (const [progressKey, value] of Object.entries(result)) {
              let taskIdStr = taskId?.toString?.();
              if (!taskIdStr || taskIdStr === "undefined") {
                taskIdStr = `${goalId}__${progressKey}__adhoc_${Date.now()}`;
              }
              if (typeof value !== "number" || isNaN(value)) continue;

              const key = `${taskIdStr}__${progressKey}`;
              const existing = progressLookup[key];
              const payload = { goalId, date, taskId: taskIdStr, progressKey, value };
              dispatch(addPendingProgress(payload));

              if (value === 0 && existing) {
                dispatch(deleteGoalProgress({ id: existing._id }));
              } else if (existing && existing.value !== value) {
                dispatch(updateGoalProgress({ id: existing._id, updates: { value } }));
              } else if (!existing && value !== 0) {
                dispatch(createGoalProgress(payload));
              }
            }
          }
        }
        const goalIdStr = (goal._id || goal.tempId)?.toString?.();

        const existingRecords = goalprogress.filter(
          (r) =>
            r.goalId?.toString?.() === goalIdStr ||
            r.goal_id?.toString?.() === goalIdStr
        );

        for (const rec of existingRecords) {
          const baseId = rec.taskId;
          const unitKey = rec.progressKey || null;

          const isMissing =
            !countArray[baseId] && // task is not in current schedule
            (unitKey === null || !Object.keys(valueArray?.[baseId] || {}).includes(unitKey));

          if (isMissing) {
            dispatch(removePendingProgress(rec._id)); // immediate optimistic delet
            dispatch(deleteGoalProgress({ id: rec._id }));
          }
        }
      }
    }
    setLastSavedAssignments({
      ...lastSavedAssignments,
      [type]: assignmentsToSave[type],
    });

    const response = existing
      ? await dispatch(updateDayPlan({ id: existing._id, dayPlanData: dayPlanPayload }))
      : await dispatch(createDayPlan({ ...dayPlanPayload }));

    AppToaster.show({
      message: response?.payload
        ? `✅ ${type} schedule saved!`
        : `❌ Failed to save ${type} schedule`,
      intent: response?.payload ? Intent.SUCCESS : Intent.DANGER,
    });
  };

  const onDragEnd = (result) => {
    console.log("====onDragEnd====");
    setDraggedTaskId(null); // Reset after drop

    const { source, destination, draggableId } = result;
    if (!destination || !source || destination.droppableId === "taskBank") return;

    const fromTaskBank = source.droppableId === "taskBank";

    const type = destination.droppableId.includes("preview") ? "preview" : "actual";
    const slotKey = destination.droppableId.replace("preview_", "").replace("actual_", "");
    const updated = { ...assignments };
    const destSlot = updated[type][slotKey] || [];

    if (fromTaskBank) {
      let taskFromBank = taskSnapshotRef.current.find((t) => t._id?.toString() === draggableId);

      if (taskFromBank && adhocDraftMapRef.current.size > 0) {
        const matchingAdhocs = [...adhocDraftMapRef.current.entries()]
          .filter(([key]) => key.startsWith(`adhoc_${draggableId}`))
          .map(([_, task]) => task);

        if (matchingAdhocs.length > 0) {
          matchingAdhocs.forEach((adhocTask) => {
            insertAdhocTask(adhocTask); // Inserts + updates snapshot
            console.log("⚡️Inserted adhoc on drag:", adhocTask.name);
          });
          adhocDraftMapRef.current.clear();

          // Re-fetch parent from updated snapshot after insertion
          taskFromBank = taskSnapshotRef.current.find((t) =>
            (t._id || t.tempId)?.toString() === draggableId
          );
        }
      }
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

  const onDragStart = (start) => {
    const { draggableId, source } = start;
    console.log("🔥 Drag started for", draggableId, "from", source.droppableId);
    // setDraggedTaskId(draggableId);

    // Optional: set state to track currently dragged task
    // setDraggingTaskId(draggableId);
  };
  const onBeforeCapture = (before) => {
    const taskId = before.draggableId;
    setDraggedTaskId(taskId); // set it early
  };
  return (
    <TimeProvider>
      <DragDropContext onBeforeCapture={onBeforeCapture} onDragStart={onDragStart} onDragEnd={onDragEnd}>
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
                  draggedTaskId={draggedTaskId}
                  onInsertAdhoc={handleInsertAdhoc}
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
