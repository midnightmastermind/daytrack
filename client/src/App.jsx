import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { DragDropContext } from "react-beautiful-dnd";
import { DateTime } from "luxon";
import { Drawer, DrawerSize, Position, Toaster, Intent } from "@blueprintjs/core";
import "./App.css";
import { TimeProvider } from "./context/TimeProvider";
import { buildScheduleAssignmentsFromTask, countTasks, filterByTaskAndUnit, findTaskByIdDeep, countValues, insertTaskById } from './helpers/taskUtils.js';
import { buildCompoundKey, splitCompoundKey, calculateGoalProgress, buildProgressEntriesFromTask } from "./helpers/goalUtils";

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
    // dispatch(fetchGoalProgress());
  }, [dispatch]);

  useEffect(() => {
    // console.log("New Tasks: ", tasks);
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


  function buildAdhocChildFromDraft(draft, groupingUnits = []) {
    const tempId = draft.tempId;
    const input = { ...draft };
  
    groupingUnits.forEach(unit => {
      if (!input[unit.key]) {
        input[unit.key] = unit.type === "text" ? "" : { value: 0, flow: "in" };
      }
    });
  
    return {
      id: tempId,
      tempId,
      name: draft.name?.trim() || "",
      parentId: draft.parentId,
      properties: {
        group: false,
        preset: true,
        checkbox: true,
        input: true,
        card: false,
        category: false,
      },
      values: {
        checkbox: draft.checkbox || false,
        input, // Includes all units + name + tempId
      },
      children: [],
      goals: [],
      counters: [],
    };
  }
  
  const handleInsertAdhoc = (tempId, draftTask) => {
    const groupingUnits = findTaskByIdDeep(draftTask.parentId, taskSnapshotRef.current)?.properties?.grouping?.units || [];
    const structuredTask = buildAdhocChildFromDraft(draftTask, groupingUnits);
    adhocDraftMapRef.current.set(tempId, structuredTask);
  };

  const insertAdhocTask = (task) => {
    console.log("insert adhoc task: ", task);
    dispatch(addTaskOptimistic(task));

    const updatedSnapshot = insertTaskById(taskSnapshotRef.current, task.parentId, task);
    console.log("updated snapshot: ", task);

    setTaskSnapshot(updatedSnapshot);
    taskSnapshotRef.current = updatedSnapshot;
  };
  console.log(tasks);
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
      console.log(assignments);
      const progressUpdates = {};

      for (const goal of goals) {
        let newEntries = [];
      
        for (const slotTasks of Object.values(assignmentsToSave[type])) {
          if (!Array.isArray(slotTasks)) continue;
      
          for (const task of slotTasks) {
            const entries = buildProgressEntriesFromTask(task, goal, date, task.assignmentId);
            console.log(task);
            console.log(goal);
            console.log(entries);
            newEntries = [...newEntries, ...entries];
          }
        }
      
        // 🧼 Determine removed assignmentIds
        const prevAssignments = Object.values(lastSavedAssignments[type] || {}).flat();
        const newAssignments = Object.values(assignmentsToSave[type] || {}).flat();
      
        const removedAssignmentIds = prevAssignments
          .map(t => t.assignmentId)
          .filter(id => id && !newAssignments.some(nt => nt.assignmentId === id));
      
        // 🧽 Filter out removed AND duplicate assignmentIds
        const newAssignmentIds = new Set(newEntries.map(e => e.assignmentId));
        const cleanedProgress = (goal.progress || []).filter(
          (entry) =>
            !removedAssignmentIds.includes(entry.assignmentId) &&
            !newAssignmentIds.has(entry.assignmentId) // <- prevent duplicates
        );
      
        const updatedProgress = [...cleanedProgress, ...newEntries];
      
        if (newEntries.length > 0 || removedAssignmentIds.length > 0) {
          dispatch(updateGoalOptimistic({ id: goal._id, updates: { progress: updatedProgress } }));
          dispatch(updateGoal({ id: goal._id, goalData: { progress: updatedProgress } }));
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
            insertAdhocTask(adhocTask);
            adhocDraftMapRef.current.delete(adhocTask.id);
          });
          taskFromBank = taskSnapshotRef.current.find((t) => (t._id || t.tempId)?.toString() === draggableId);
        }
      }
      
      if (!taskFromBank) return;
      console.log("[🧲 onDragEnd] Dragged task:", taskFromBank.name, taskFromBank);
      const selectedLeaves = buildScheduleAssignmentsFromTask(taskFromBank);
      console.log("[🌿 buildScheduleAssignmentsFromTask] Selected leaves:", selectedLeaves.map(t => t.name));

      const currentIds = new Set(destSlot.map(t => t.assignmentId));
      const newTasks = selectedLeaves.filter(t => !currentIds.has(t.assignmentId));
      // if (newTasks.length < selectedLeaves.length) {
      //   AppToaster.show({
      //     message: "That task is already scheduled at this time.",
      //     intent: Intent.WARNING,
      //   });
      // }

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
                  onEditTask={(task) => {
                    setTask(task);
                    setIsDrawerOpen(true); // edit flow keeps the task
                  }}
                  onNewTask={() => {
                    setTask(null); // ← clear any previously selected task
                    setIsDrawerOpen(true);
                  }}
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
                setIsDrawerOpen(false);
                setTask(null);
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
