import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { DragDropContext } from "react-beautiful-dnd";
import { DateTime } from "luxon";
import { Button, Drawer, DrawerSize, Position, Toaster, Intent } from "@blueprintjs/core";
import "./App.css";
import { TimeProvider } from "./context/TimeProvider";
import { buildScheduleAssignmentsFromTask, countTasks, filterByTaskAndUnit, findTaskByIdDeep, countValues, insertTaskById, sanitizeInputValues } from './helpers/taskUtils.js';
import {  buildProgressEntriesFromTask } from "./helpers/goalUtils";

import {
  fetchTasks,
  deleteTask,
  addTaskOptimistic,
  deleteTaskOptimistic
} from "./store/tasksSlice";

import {
  fetchGoals,
  updateGoal,
  deleteGoal,
  updateGoalOptimistic,
  deleteGoalOptimistic
} from "./store/goalSlice";


import {
  fetchAllDayPlans,
  createDayPlan,
  updateDayPlan,
  deleteDayPlan,
  deleteDayPlanOptimistic,
  addDayPlanOptimistic
} from "./store/dayPlanSlice";

import Toolbar from "./components/Toolbar";
import TaskBank from "./components/TaskBank";
import Schedule from "./components/Schedule";
import TaskDisplay from "./components/TaskDisplay";
import GoalDisplay from "./components/GoalDisplay";
import NewTaskForm from "./NewTaskForm";
import GoalForm from "./GoalForm";
import LiveTime from "./components/LiveTime";
import PlanTemplateManager from "./components/PlanTemplateManager";
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
  const [rightPanelMode, setRightPanelMode] = useState("goals");
  const [currentTemplate, setCurrentTemplate] = useState(null);

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
  console.log(adhocDraftMapRef);
  useEffect(() => {
    dispatch(fetchTasks());
    dispatch(fetchAllDayPlans());
    dispatch(fetchGoals());
  }, [dispatch]);

  useEffect(() => {
    const cleaned = tasks.map(deepResetAdhocCheckboxes); 
    setTaskSnapshot(cleaned);
    taskSnapshotRef.current = cleaned;
  }, [tasks]);

  const generateTimeSlots = () => {
    let slots = [];
    let start = DateTime.local().set({ hour: 0, minute: 0 });
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

  const toggleRightPanelMode = () => {
    setRightPanelMode((prev) => (prev === "goals" ? "history" : "goals"));
  };

  const handleCopyToAgenda = (slot) => {
    const planTasks = assignments.preview[slot] || [];
    const agendaTasks = assignments.actual[slot] || [];
  
    const agendaIds = new Set(agendaTasks.map((t) => t.assignmentId));
    const newTasks = planTasks.filter((t) => !agendaIds.has(t.assignmentId));
  
    const updatedAgenda = {
      ...assignments.actual,
      [slot]: [...agendaTasks, ...newTasks],
    };
  
    const updated = {
      ...assignments,
      actual: updatedAgenda,
    };
  
    setAssignments(updated);
  
    // ✅ Save to DB
    saveDayPlan(updated, "actual");
  };

  const deletePlanTemplate = async (id) => {
    dispatch(deleteDayPlanOptimistic(id));
    const res = await dispatch(deleteDayPlan(id));
  
    if (res?.payload) {
      AppToaster.show({ message: `🗑️ Plan deleted`, intent: Intent.WARNING });
    }
  };
  const saveNamedPlanTemplate = async (name, assignmentsData) => {
    const tempId = `temp_${Date.now()}`;
    const payload = {
      _id: tempId, // or tempId field
      name,
      plan: Object.entries(assignmentsData).map(([timeSlot, assignedTasks]) => ({
        timeSlot,
        assignedTasks,
      })),
    };
    dispatch(addDayPlanOptimistic(payload)); // ✅ Optimistic update
  
    const res = await dispatch(createDayPlan(payload));
    if (res?.payload) {
      AppToaster.show({ message: `✅ Plan "${name}" saved!`, intent: Intent.SUCCESS });
      setCurrentTemplate(res.payload);
    }
  };
  
  const updateNamedPlanTemplate = async (id, assignmentsData) => {
    const payload = {
      _id: id,
      plan: Object.entries(assignmentsData).map(([timeSlot, assignedTasks]) => ({
        timeSlot,
        assignedTasks,
      })),
    };
  
    dispatch(setDayPlanOptimistic(payload)); // ✅ optimistic
    const res = await dispatch(updateDayPlan({ id, dayPlanData: payload }));
  
    if (res?.payload) {
      AppToaster.show({ message: `✅ Plan "${res.payload.name}" updated!`, intent: Intent.SUCCESS });
    }
  };
  function buildAdhocChildFromDraft(draft, groupingUnits = []) {
    const tempId = draft.tempId;
    // Sanitize the input using those keys
    const cleanInput = sanitizeInputValues(draft, groupingUnits);

    return {
      id: tempId,
      tempId,
      name: draft.name || "",
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
        input: cleanInput, // ✅ this is now cleaned properly
      },
      children: [],
      goals: [],
      counters: [],
    };
  }


  const handleInsertAdhoc = (tempId, draftTask) => {
    const groupingUnits = findTaskByIdDeep(draftTask.parentId, taskSnapshotRef.current)?.properties?.grouping?.units || [];
    const structuredTask = buildAdhocChildFromDraft(draftTask, groupingUnits);
    console.log("save to adhocmap");
    adhocDraftMapRef.current.set(tempId, structuredTask);
    console.log(adhocDraftMapRef.current)
  };

  const insertAdhocTask = (task) => {
    console.log("insert adhoc task: ", task);
  
    // Don't reset checkbox yet
    dispatch(addTaskOptimistic(task));
  
    const updatedSnapshot = insertTaskById(taskSnapshotRef.current, task.parentId, task);
    taskSnapshotRef.current = updatedSnapshot;
    setTaskSnapshot(updatedSnapshot);
  
    // Remove from adhoc map AFTER insert
    adhocDraftMapRef.current.delete(task.id);
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
      const progressUpdates = {};

      for (const goal of goals) {
        let newEntries = [];

        for (const slotTasks of Object.values(assignmentsToSave[type])) {
          if (!Array.isArray(slotTasks)) continue;

          for (const task of slotTasks) {
            const entries = buildProgressEntriesFromTask(task, goal, date, task.assignmentId);
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
      console.log(taskSnapshotRef.current);
      let taskFromBank = findTaskByIdDeep(draggableId, taskSnapshotRef.current);

      console.log(taskFromBank);
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

      console.log(taskFromBank)

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
    const cleared = taskSnapshotRef.current.map((t) => deepResetAdhocCheckboxes(t));
    console.log(cleared);
    taskSnapshotRef.current = cleared;
    setTaskSnapshot(cleared);
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

  function deepResetAdhocCheckboxes(task) {
    let changed = false;
  
    // Only clear if it's a preset adhoc task
    let updated = { ...task };
    if (task.properties?.preset && task.values?.checkbox) {
      updated = {
        ...updated,
        values: {
          ...updated.values,
          checkbox: false,
        },
      };
      changed = true;
    }
  
    // Recurse into children
    if (Array.isArray(task.children)) {
      const updatedChildren = task.children.map(deepResetAdhocCheckboxes);
      updated.children = updatedChildren;
    }
  
    return updated;
  }
  
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
                    <div className="plan-header">
                    <PlanTemplateManager
                        assignments={assignments.preview}
                        setAssignments={(data) => setAssignments((prev) => ({ ...prev, preview: data }))}
                        allDayPlans={dayplans.filter(dp => !dp.date && dp.name)}
                        savePlanTemplate={saveNamedPlanTemplate}
                        updatePlanTemplate={updateNamedPlanTemplate}
                        currentTemplate={currentTemplate}
                        deletePlanTemplate={deletePlanTemplate}
                        setCurrentTemplate={setCurrentTemplate}
                      />

                      <div>Plan</div>
                    </div>
                    <div className="agenda-header">Agenda</div>
                  </div>
                  <div className="schedules-scroll-wrapper">
                    <Schedule
                      label="Plan"
                      onCopyToAgenda={handleCopyToAgenda}
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
                <div className="right-side-header">
                  <div className="section-header">
                    Display
                  </div>
                  <Button
                    icon="exchange"
                    onClick={toggleRightPanelMode}
                    minimal
                    title="Switch between Goals and Task History"
                  />
                </div>

                {rightPanelMode === "goals" ? (
                  <GoalDisplay
                    key={selectedDate.toISOString()}
                    goals={goalsWithProgress}
                    onEditGoal={(goal) => {
                      setEditingGoal(goal);
                      setGoalDrawerOpen(true);
                    }}
                  />
                ) : (
                  <TaskDisplay timeSlots={timeSlots} assignments={assignments.actual} />
                )}
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
