import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { DragDropContext } from "react-beautiful-dnd";
import { DateTime } from "luxon";
import { Button, Drawer, DrawerSize, Position, Toaster, Intent } from "@blueprintjs/core";
import "./App.css";
import { TimeProvider } from "./context/TimeProvider";
import { buildScheduleAssignmentsFromTask, countTasks, filterByTaskAndUnit, findTaskByIdDeep, countValues, insertTaskById, sanitizeInputValues } from './helpers/taskUtils.js';
import { buildProgressEntriesFromTask } from "./helpers/goalUtils";
import useIsMobile from "./helpers/useIsMobile.js";
import {
  fetchTasks,
  deleteTask,
  updateTask,
  addTaskOptimistic,
  deleteTaskOptimistic,
  reorderTasksOptimistic,
  bulkReorderTasks,
  updateTaskOptimistic
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
import Notebook from "./components/Notebook.jsx";
import GoalForm from "./forms/goals/GoalForm";
import LiveTime from "./components/LiveTime";
import PlanTemplateManager from "./components/PlanTemplateManager";
import { makeSelectGoalsWithProgress } from "./selectors/goalSelectors";
import DatePickerPopover from "./components/DatePickerPopover.jsx";

export const AppToaster = Toaster.create({ position: Position.BOTTOM_RIGHT });

function App() {
  const dispatch = useDispatch();
  const { tasks } = useSelector((state) => state.tasks);
  const { dayplans } = useSelector((state) => state.dayplans);
  const { goals } = useSelector((state) => state.goals);
  const [notebookText, setNotebookText] = useState("");

  const [selectedDate, setSelectedDate] = useState(new Date());
  const goalsWithProgress = useSelector(makeSelectGoalsWithProgress(selectedDate));
  const [taskSnapshot, setTaskSnapshot] = useState([]);
  const [rightPanelMode, setRightPanelMode] = useState("goals");
  const [leftPanelMode, setLeftPanelMode] = useState("schedule"); // or "notebook"

  const [currentTemplate, setCurrentTemplate] = useState(null);
  const isMobile = useIsMobile();
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [shouldHideDrawer, setShouldHideDrawer] = useState(false);
  const [pointerOverDrawer, setPointerOverDrawer] = useState(false);
  const [scheduleTemporarilyDisabled, setScheduleTemporarilyDisabled] = useState(false);

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
  const drawerRef = useRef(null);

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
      setNotebookText(found.notebook || "");
      setAssignments({ actual, preview });
      setLastSavedAssignments({ actual, preview });
    } else {
      setNotebookText("");
      setAssignments({ actual: {}, preview: {} });
      setLastSavedAssignments({ actual: {}, preview: {} });
    }
    setPlanDirty(false);
  }, [selectedDate, dayplans]);

  const toggleRightPanelMode = () => {
    setRightPanelMode((prev) => (prev === "goals" ? "history" : "goals"));
  };

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e) => {
      if (!drawerRef.current) return;

      const rect = drawerRef.current.getBoundingClientRect();
      const cursorX = e.clientX;

      // Console for debugging

      if (cursorX > rect.right + 50) {
        setShouldHideDrawer(true);
        setScheduleTemporarilyDisabled(false);
      } else {
        setShouldHideDrawer(false);
        setScheduleTemporarilyDisabled(true);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [isDragging]);

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

  const handleCopyFromAgenda = (slot) => {
    const agendaTasks = assignments.actual[slot] || [];
    const planTasks = assignments.preview[slot] || [];

    const planIds = new Set(planTasks.map((t) => t.assignmentId));
    const newTasks = agendaTasks.filter((t) => !planIds.has(t.assignmentId));

    const updatedPreview = {
      ...assignments.preview,
      [slot]: [...planTasks, ...newTasks],
    };

    const updated = {
      ...assignments,
      preview: updatedPreview,
    };

    setAssignments(updated);
    saveDayPlan(updated, "preview");
  };

  const handleCopyAllToAgenda = () => {
    const updatedActual = { ...assignments.actual };

    for (const slot of timeSlots) {
      const planTasks = assignments.preview[slot] || [];
      const agendaTasks = assignments.actual[slot] || [];

      const agendaIds = new Set(agendaTasks.map((t) => t.assignmentId));
      const newTasks = planTasks.filter((t) => !agendaIds.has(t.assignmentId));

      updatedActual[slot] = [...agendaTasks, ...newTasks];
    }

    const updated = {
      ...assignments,
      actual: updatedActual,
    };

    setAssignments(updated);
    saveDayPlan(updated, "actual");
  };

  const handleCopyAllFromAgenda = () => {
    const updatedPreview = { ...assignments.preview };

    for (const slot of timeSlots) {
      const agendaTasks = assignments.actual[slot] || [];
      const planTasks = assignments.preview[slot] || [];

      const planIds = new Set(planTasks.map((t) => t.assignmentId));
      const newTasks = agendaTasks.filter((t) => !planIds.has(t.assignmentId));

      updatedPreview[slot] = [...planTasks, ...newTasks];
    }

    const updated = {
      ...assignments,
      preview: updatedPreview,
    };

    setAssignments(updated);
    saveDayPlan(updated, "preview");
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
    adhocDraftMapRef.current.set(tempId, structuredTask);
  };

  const insertAdhocTask = (task) => {

    // Don't reset checkbox yet
    dispatch(addTaskOptimistic(task));

    const updatedSnapshot = insertTaskById(taskSnapshotRef.current, task.parentId, task);
    taskSnapshotRef.current = updatedSnapshot;
    setTaskSnapshot(updatedSnapshot);

    // Remove from adhoc map AFTER insert
    adhocDraftMapRef.current.delete(task.id);
  };

  const saveNotebookOnly = async (text) => {
    const existing = dayplans.find(
      (p) => new Date(p.date).toDateString() === selectedDate.toDateString()
    );

    if (!existing) return;

    const updated = { ...existing, notebook: text };
    setNotebookText(text); // update local state

    // Update in Redux/state if you want:
    dispatch(updateDayPlan({ id: existing._id, dayPlanData: { notebook: text } }));

    AppToaster.show({
      message: "📝 Notebook saved!",
      intent: Intent.SUCCESS,
    });
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
      
        // Clone goalItems to avoid mutating Redux state
        const goalItems = (goal.goalItems || []).map((item) => ({
          ...item,
          progress: [...(item.progress || [])],
        }));
      
        for (const slotTasks of Object.values(assignmentsToSave[type])) {
          if (!Array.isArray(slotTasks)) continue;
      
          for (const task of slotTasks) {
            const entries = buildProgressEntriesFromTask(
              task,
              goalItems,
              date,
              task.assignmentId
            );
            newEntries = [...newEntries, ...entries];
          }
        }
      
        // Determine removed assignmentIds
        const prevAssignments = Object.values(lastSavedAssignments[type] || {}).flat();
        const newAssignments = Object.values(assignmentsToSave[type] || {}).flat();
      
        const removedAssignmentIds = prevAssignments
          .map((t) => t.assignmentId)
          .filter(
            (id) => id && !newAssignments.some((nt) => nt.assignmentId === id)
          );
      
        // Update each goalItem's progress individually
        for (const item of goalItems) {
          const key = `${goal._id || goal.tempId}__item${item.order}`;
          const entriesToAdd = newEntries.filter((e) => e.goalItemKey === key);
          const existing = item.progress || [];
      
          const newAssignmentIds = new Set(entriesToAdd.map((e) => e.assignmentId));
          const cleaned = existing.filter(
            (entry) =>
              !removedAssignmentIds.includes(entry.assignmentId) &&
              !newAssignmentIds.has(entry.assignmentId)
          );
      
          item.progress = [...cleaned, ...entriesToAdd];
        }
      
        if (newEntries.length > 0 || removedAssignmentIds.length > 0) {
          dispatch(updateGoalOptimistic({
            id: goal._id,
            updates: {
              goalItems,
            },
          }));
          dispatch(updateGoal({
            id: goal._id,
            goalData: {
              goalItems,
            },
          }));
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
    setDraggedTaskId(null);

    const { source, destination, draggableId } = result;
    if (!destination || !source) return;
    console.log(result);
    // ✅ If reordering inside task bank
    if (source.droppableId === "taskBank" && destination.droppableId === "taskBank") {
      const taskBankTasks = taskSnapshotRef.current
        .filter((task) => task.properties?.card)
        .sort((a, b) => (a.properties?.order ?? 0) - (b.properties?.order ?? 0));

      const [moved] = taskBankTasks.splice(source.index, 1);
      taskBankTasks.splice(destination.index, 0, moved);

      const reordered = taskBankTasks.map((task, index) => ({
        ...task,
        properties: {
          ...task.properties,
          order: index,
        },
      }));

      const updatedSnapshot = taskSnapshotRef.current.map((task) => {
        const updated = reordered.find((t) => (t._id || t.tempId) === (task._id || task.tempId));
        return updated || task;
      });

      taskSnapshotRef.current = updatedSnapshot;
      setTaskSnapshot(updatedSnapshot);

      dispatch(reorderTasksOptimistic(reordered)); // ✅ Optimistic update
      dispatch(bulkReorderTasks(reordered));       // ✅ Server save

      return;
    }

    const fromTaskBank = source.droppableId === "taskBank";

    const type = destination.droppableId.includes("preview") ? "preview" : "actual";
    const slotKey = destination.droppableId.replace("preview_", "").replace("actual_", "");
    const updated = { ...assignments };
    const destSlot = updated[type][slotKey] || [];

    if (fromTaskBank) {
      let taskFromBank = findTaskByIdDeep(draggableId, taskSnapshotRef.current);

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
    setIsDragging(false);
    setShouldHideDrawer(false); // reset
    setLeftDrawerOpen(false);

    setAssignments(updated);
    const cleared = taskSnapshotRef.current.map((t) => deepResetAdhocCheckboxes(t));
    taskSnapshotRef.current = cleared;
    setTaskSnapshot(cleared);
    saveDayPlan(updated, type);
  };

  const onDragStart = (start) => {
    const { draggableId, source } = start;
    setIsDragging(true);

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

  // console.log("leftDrawerOpen", leftDrawerOpen);
  // console.log("shouldHideDrawer", shouldHideDrawer);
  // console.log("pointerOverDrawer", pointerOverDrawer);
  // console.log("isDragging", isDragging);
  return (
    <TimeProvider>
      <div className="container">
        <Toolbar
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          planDirty={planDirty}
          onSaveDayPlan={() => saveDayPlan(assignments, "actual")}
        />
        <div className="main-content">
          <div className="content">
            <div className="left-side-container">
              <div className="left-side-header">
                <div className="section-header">View</div>
                <Button
                  icon="exchange"
                  onClick={() =>
                    setLeftPanelMode((prev) => (prev === "schedule" ? "notebook" : "schedule"))
                  }
                  minimal
                  title="Switch between Task/Schedule and Notebook"
                />
              </div>
              <div className="left-side">
                {leftPanelMode === "schedule" ? (
                  <>
                    {isMobile && (
                      <div className={"left-mobile-toolbar"}>
                        <Button
                          icon="menu"
                          minimal
                          onClick={() => setLeftDrawerOpen(true)}
                          title="Open Task Bank"
                        />
                      </div>
                    )}
                    <DragDropContext onBeforeCapture={onBeforeCapture} onDragStart={onDragStart} onDragEnd={onDragEnd}>
                      {isMobile ? (

                        <Drawer
                          isOpen={leftDrawerOpen}
                          onClose={() => setLeftDrawerOpen(false)}
                          position={Position.LEFT}
                          title="Tasks"
                          className={`mobile-taskbank-drawer ${shouldHideDrawer ? "soft-hide" : ""}`}
                          hasBackdrop={!shouldHideDrawer}
                          usePortal={false} // 👈 KEY CHANGE
                        >
                          <div
                            ref={drawerRef}
                            onPointerEnter={() => {
                              if (isDragging) setPointerOverDrawer(true);
                            }}
                            onPointerLeave={() => {
                              if (isDragging) setPointerOverDrawer(false);
                            }}>
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
                          </div>
                        </Drawer>
                      ) : (
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
                      )}
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
                          <div className="plan-header-container">
                            <PlanTemplateManager
                              assignments={assignments.preview}
                              setAssignments={(data) => setAssignments((prev) => ({ ...prev, preview: data }))}
                              allDayPlans={dayplans.filter(dp => !dp.date && dp.name)}
                              savePlanTemplate={saveNamedPlanTemplate}
                              updatePlanTemplate={updateNamedPlanTemplate}
                              currentTemplate={currentTemplate}
                              deletePlanTemplate={deletePlanTemplate}
                              setCurrentTemplate={setCurrentTemplate}
                              saveAssignments={(data) => saveDayPlan({ ...assignments, preview: data }, "preview")}
                            />

                            <div className="plan-header">
                              <div>Plan</div>
                              <Button
                                icon="arrow-right"
                                className="timeslot-button"
                                minimal
                                small
                                title="Copy entire Plan → Live"
                                onClick={handleCopyAllToAgenda} // ✅ Plan ➡️ Live
                              />
                            </div>
                          </div>
                          <div className="agenda-header">
                            <Button
                              icon="arrow-left"
                              className="timeslot-button"
                              minimal
                              small
                              title="Copy entire Live → Plan"
                              onClick={handleCopyAllFromAgenda} // ✅ Live ➡️ Plan
                            />
                            <div>Live</div>
                          </div>
                        </div>
                        <div className="schedules-scroll-wrapper">
                          <Schedule
                            disableDrop={scheduleTemporarilyDisabled || pointerOverDrawer}
                            label="Plan"
                            onCopyToAgenda={handleCopyToAgenda}
                            timeSlots={timeSlots}
                            assignments={assignments.preview}
                            setAssignments={(data) => setAssignments((prev) => ({ ...prev, preview: data }))}
                            setPlanDirty={setPlanDirty}
                            onAssignmentsChange={(data) => saveDayPlan({ ...assignments, preview: data }, "preview")}
                          />
                          <Schedule
                            disableDrop={scheduleTemporarilyDisabled || pointerOverDrawer}
                            label="Live"
                            onCopyFromAgenda={handleCopyFromAgenda} // ✅
                            timeSlots={timeSlots}
                            assignments={assignments.actual}
                            setAssignments={(data) => setAssignments((prev) => ({ ...prev, actual: data }))}
                            setPlanDirty={setPlanDirty}
                            onAssignmentsChange={(data) => saveDayPlan({ ...assignments, actual: data }, "actual")}
                          />
                        </div>
                      </div>
                    </DragDropContext>
                  </>
                ) : (
                  <Notebook
                    selectedDate={selectedDate}
                    initialText={notebookText}
                    onSave={saveNotebookOnly}
                    onDelete={() => saveNotebookOnly("")}
                  />
                )}
              </div>
            </div>
            <div className="right-side">
              {isMobile && (
                <div className={"right-mobile-toolbar"}>
                  <Button
                    icon="panel-stats"
                    minimal
                    onClick={() => setRightDrawerOpen(true)}
                    title="Open Right Panel"
                  />
                </div>
              )}
              {isMobile ? (
                <Drawer
                  isOpen={rightDrawerOpen}
                  onClose={() => setRightDrawerOpen(false)}
                  position={Position.RIGHT}
                  title={rightPanelMode === "goals" ? "Goals" : "Task History"}
                  className="mobile-rightpanel-drawer"
                  usePortal={false} // 👈 KEY CHANGE

                >
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
                </Drawer>
              ) : (
                <>
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
                </>
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
            taskListLength={tasks.length}
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
    </TimeProvider>
  );
}

export default App;
