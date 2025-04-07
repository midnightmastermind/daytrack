import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { DragDropContext } from "react-beautiful-dnd";
import { DateTime } from "luxon";
import { Drawer, DrawerSize, Position, Toaster, Intent } from "@blueprintjs/core";
import "./App.css";

import { fetchTasks } from "./store/tasksSlice";
import { fetchAllDayPlans, createDayPlan, updateDayPlan } from "./store/dayPlanSlice";
import { fetchGoals, createGoal, updateGoal, deleteGoal } from "./store/goalSlice";
import { fetchGoalProgress, createGoalProgress, addPendingProgress } from "./store/goalProgressSlice";

import Toolbar from "./components/Toolbar";
import TaskBank from "./components/TaskBank";
import Schedule from "./components/Schedule";
import TaskDisplay from "./components/TaskDisplay";
import GoalDisplay from "./components/GoalDisplay";
import NewTaskForm from "./NewTaskForm.jsx";
import GoalForm from "./GoalForm.jsx";
import LiveTime from './components/LiveTime';

import { makeSelectGoalsWithProgress } from "./selectors/goalSelectors";

const AppToaster = Toaster.create({ position: Position.TOP_RIGHT });

function App() {
  const dispatch = useDispatch();
  const { tasks } = useSelector((state) => state.tasks);
  const { dayplans } = useSelector((state) => state.dayplans);
  const { goals } = useSelector((state) => state.goals);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const goalsWithProgress = useSelector(makeSelectGoalsWithProgress(selectedDate));

  const [assignments, setAssignments] = useState({ actual: {}, preview: {} });
  const [lastSavedAssignments, setLastSavedAssignments] = useState({ actual: {}, preview: {} });
  const [tasksState, setTasksState] = useState([]);
  const [dayPlansState, setDayPlansState] = useState([]);
  const [task, setTask] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [goalDrawerOpen, setGoalDrawerOpen] = useState(false);
  const [planDirty, setPlanDirty] = useState(false);

  const generateTimeSlots = () => {
    let slots = [];
    let startTime = DateTime.local().set({ hour: 7, minute: 0 });
    let endTime = DateTime.local().set({ hour: 23, minute: 30 });
    while (startTime <= endTime) {
      slots.push(startTime.toFormat("h:mm a"));
      startTime = startTime.plus({ minutes: 30 });
    }
    return slots;
  };
  const timeSlots = generateTimeSlots();

  useEffect(() => {
    dispatch(fetchTasks());
    dispatch(fetchAllDayPlans());
    dispatch(fetchGoals());
    dispatch(fetchGoalProgress());
  }, [dispatch]);

  useEffect(() => {
    setTasksState(tasks || []);
  }, [tasks]);

  useEffect(() => {
    setDayPlansState(dayplans || []);
  }, [dayplans]);

  useEffect(() => {
    const found = dayPlansState.find((plan) => new Date(plan.date).toDateString() === selectedDate.toDateString());
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
  }, [selectedDate, dayPlansState]);

  const flattenGoalTaskIds = (goal) => {
    const ids = new Set();
    const walk = (task) => {
      const id = (task.task_id || task._id || task.id)?.toString();
      if (id) ids.add(id);
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
  
    const existingPlan = dayPlansState.find(
      (plan) => new Date(plan.date).toDateString() === selectedDate.toDateString()
    );
  
    const payload = {
      date: selectedDate,
      plan: type === "preview" ? resultArray : existingPlan?.plan || [],
      result: type === "actual" ? resultArray : existingPlan?.result || [],
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
  
    const previousCount = countTasks(lastSavedAssignments[type] || {});
    const nextCount = countTasks(assignmentsToSave[type]);
    const allTaskIds = new Set([...Object.keys(previousCount), ...Object.keys(nextCount)]);
    const date = selectedDate.toISOString();
  
    if (type === "actual") {
      for (const taskId of allTaskIds) {
        const count = nextCount[taskId] || 0; // 👈 handles deletions by falling back to 0
        const relatedGoals = goals.filter((goal) => flattenGoalTaskIds(goal).has(taskId));
        for (const goal of relatedGoals) {
          const goalId = goal._id?.toString() || goal.tempId;
          dispatch(addPendingProgress({ goalId, date, taskId, count }));
          await dispatch(createGoalProgress({ goalId, date, taskId, count }));
        }
      }
    }
  
    const nextSaved = { ...lastSavedAssignments, [type]: assignmentsToSave[type] };
    setLastSavedAssignments(nextSaved);
  
    const response = existingPlan
      ? await dispatch(updateDayPlan({ id: existingPlan._id, dayPlanData: payload }))
      : await dispatch(createDayPlan({ ...payload }));
  
    if (response?.payload) {
      AppToaster.show({ message: `✅ ${type} schedule saved!`, intent: Intent.SUCCESS });
    } else {
      AppToaster.show({ message: `❌ Failed to save ${type} schedule`, intent: Intent.DANGER });
    }
  };
  

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || !source || typeof source.index !== "number" || typeof destination.index !== "number") return;
  
    const fromTaskBank = source.droppableId === "taskBank";
    const whichSchedule = destination.droppableId.includes("preview") ? "preview" : "actual";
    const slotKey = destination.droppableId.replace("preview_", "").replace("actual_", "");
  
    const updated = { ...assignments };
    const destSlot = updated[whichSchedule][slotKey] || [];
  
    if (fromTaskBank) {
      const taskFromBank = tasksState.find((task) => task._id?.toString() === draggableId);
      if (!taskFromBank) return;
  
      const selectedLeaves = [];
      let foundChecked = false;
  
      const walk = (node, ancestry = []) => {
        const isChecked = (node.properties?.checkbox && node.values?.checkbox) ||
          (node.properties?.input && node.values?.input?.trim() !== "");
  
        const current = {
          _id: node._id,
          name: node.name,
          properties: node.properties || {},
          values: node.values || {},
        };
  
        const nextAncestry = [...ancestry, current];
  
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
          assignmentAncestry: [{
            _id: taskFromBank._id,
            name: taskFromBank.name,
            properties: taskFromBank.properties || {},
            values: taskFromBank.values || {},
          }],
        });
      }
  
      updated[whichSchedule][slotKey] = [...destSlot, ...selectedLeaves];
    }
  
    setAssignments(updated);
    saveDayPlan(updated, whichSchedule);
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
            <div className="selected-date">
              DayPlan: {DateTime.fromJSDate(selectedDate).toFormat("M/d/yyyy")}
            </div>
            <div className="current-time">
              <LiveTime />
            </div>
          </div>
          <div className="content">
            <div className="left-side">
              <TaskBank
                tasks={tasksState}
                onEditTask={(task) => setTask(task)}
                onOpenDrawer={() => setIsDrawerOpen(true)}
                onTaskUpdate={(t) =>
                  setTasksState((prev) => prev.map((tk) => (tk._id === t._id ? t : tk)))
                }
              />
              <div className="schedule-container dual">
                <div className="schedule-header"><div className="plan-header">Plan</div><div className="agenda-header">Agenda</div></div>
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

        <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} size={DrawerSize.SMALL} position={Position.LEFT} title="Create / Edit Task">
          <NewTaskForm task={task} onSave={(newTask) => {
            setTasksState((prev) => [...prev, newTask]);
            setIsDrawerOpen(false);
          }} />
        </Drawer>
        <Drawer isOpen={goalDrawerOpen} onClose={() => setGoalDrawerOpen(false)} size={DrawerSize.MEDIUM} position={Position.RIGHT} title="Create / Edit Goal">
          <GoalForm
            goal={editingGoal}
            tasks={tasksState}
            onSave={(newGoal) => {
              editingGoal && editingGoal._id
                ? dispatch(updateGoal({ id: editingGoal._id, goalData: newGoal }))
                : dispatch(createGoal(newGoal));
              setGoalDrawerOpen(false);
            }}
            onDelete={(goalToDelete) => {
              goalToDelete && goalToDelete._id && dispatch(deleteGoal(goalToDelete._id));
              setGoalDrawerOpen(false);
            }}
          />
        </Drawer>
      </div>
    </DragDropContext>
  );
}

export default App;