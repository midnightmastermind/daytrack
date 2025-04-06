import React, { useState, useEffect, useMemo } from "react";
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
import { makeSelectGoalsWithProgress } from "./selectors/goalSelectors";

const AppToaster = Toaster.create({ position: Position.TOP_RIGHT });

function App() {
  const dispatch = useDispatch();
  const { tasks } = useSelector((state) => state.tasks);
  const { dayplans } = useSelector((state) => state.dayplans);
  const { goals } = useSelector((state) => state.goals);

  console.log("[App] tasks:", tasks);
  console.log("[App] dayplans:", dayplans);
  console.log("[App] goals:", goals);

  const [selectedDate, setSelectedDate] = useState(new Date());
  console.log("[App] selectedDate:", selectedDate);

  const goalsWithProgressSelector = useMemo(() => {
    console.log("[App] makeSelectGoalsWithProgress - selectedDate:", selectedDate);
    return makeSelectGoalsWithProgress(selectedDate);
  }, [selectedDate]);

  const goalsWithProgress = useSelector(goalsWithProgressSelector);
  console.log("[App] goalsWithProgress:", goalsWithProgress);

  const [assignments, setAssignments] = useState({ actual: {}, preview: {} });
  const [lastSavedAssignments, setLastSavedAssignments] = useState({ actual: {}, preview: {} });
  const [tasksState, setTasksState] = useState([]);
  const [dayPlansState, setDayPlansState] = useState([]);
  const [task, setTask] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [goalDrawerOpen, setGoalDrawerOpen] = useState(false);
  const [planDirty, setPlanDirty] = useState(false);
  const [currentTime, setCurrentTime] = useState(DateTime.local().toFormat("HH:mm:ss"));

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(DateTime.local().toFormat("HH:mm:ss"));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const generateTimeSlots = () => {
    let slots = [];
    let startTime = DateTime.local().set({ hour: 7, minute: 0 });
    let endTime = DateTime.local().set({ hour: 23, minute: 30 });
    while (startTime <= endTime) {
      slots.push(startTime.toFormat("h:mm a"));
      startTime = startTime.plus({ minutes: 30 });
    }
    console.log("[generateTimeSlots] timeSlots:", slots);
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
    console.log("[useEffect] tasks:", tasks);
    setTasksState(tasks || []);
  }, [tasks]);

  useEffect(() => {
    console.log("[useEffect] dayplans:", dayplans);
    setDayPlansState(dayplans || []);
  }, [dayplans]);

  useEffect(() => {
    const found = dayPlansState.find((plan) => new Date(plan.date).toDateString() === selectedDate.toDateString());
    console.log("[useEffect] found plan:", found);

    if (found) {
      const actual = {};
      const preview = {};
      (found.result || []).forEach((entry) => {
        actual[entry.timeSlot] = entry.assignedTasks || [];
      });
      (found.plan || []).forEach((entry) => {
        preview[entry.timeSlot] = entry.assignedTasks || [];
      });
      console.log("[useEffect] actual:", actual);
      console.log("[useEffect] preview:", preview);
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
      if (task.checked !== false) {
        const id = (task.task_id || task._id || task.id)?.toString();
        if (id) ids.add(id);
      }
      (task.children || []).forEach(walk);
    };
    (goal.tasks || []).forEach(walk);
    console.log("[flattenGoalTaskIds] ids for goal", goal._id || goal.tempId, ":", ids);
    return ids;
  };

  const saveDayPlan = async (assignmentsToSave, type = "actual") => {
    console.log("[saveDayPlan] assignmentsToSave:", assignmentsToSave);
    console.log("[saveDayPlan] type:", type);

    const resultArray = Object.entries(assignmentsToSave[type]).map(([timeSlot, assignedTasks]) => ({
      timeSlot,
      assignedTasks,
    }));

    console.log("[saveDayPlan] resultArray:", resultArray);

    const existingPlan = dayPlansState.find(
      (plan) => new Date(plan.date).toDateString() === selectedDate.toDateString()
    );

    console.log("[saveDayPlan] existingPlan:", existingPlan);

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

    const currentCount = countTasks(lastSavedAssignments[type]);
    const nextCount = countTasks(assignmentsToSave[type]);
    console.log("[saveDayPlan] currentCount:", currentCount);
    console.log("[saveDayPlan] nextCount:", nextCount);

    const allIds = new Set([...Object.keys(currentCount), ...Object.keys(nextCount)]);
    const date = selectedDate.toISOString();

    if (type === "actual") {
      for (const id of allIds) {
        const oldVal = currentCount[id] || 0;
        const newVal = nextCount[id] || 0;
        const diff = newVal - oldVal;
        console.log(`[saveDayPlan] id: ${id}, oldVal: ${oldVal}, newVal: ${newVal}, diff: ${diff}`);

        if (diff !== 0) {
          const relatedGoals = goals.filter((goal) => flattenGoalTaskIds(goal).has(id.toString()));
          console.log("[saveDayPlan] relatedGoals:", relatedGoals);

          for (const goal of relatedGoals) {
            const goalId = goal._id?.toString();
            const tempId = goalId || goal.tempId || `temp_${goal.header || Math.random().toString(36).slice(2, 10)}`;

            dispatch(addPendingProgress({ goalId, date, taskId: id.toString(), diff }));
            dispatch(createGoalProgress({
              goalId,
              tempId: goal._id ? undefined : tempId,
              date,
              taskId: id.toString(),
              increment: nextCount[id],
            }));
          }
        }
      }
    }

    const nextSaved = { ...lastSavedAssignments, [type]: assignmentsToSave[type] };
    console.log("[saveDayPlan] nextSaved:", nextSaved);
    setLastSavedAssignments(nextSaved);

    const response = existingPlan
      ? await dispatch(updateDayPlan({ id: existingPlan._id, dayPlanData: payload }))
      : await dispatch(createDayPlan({ ...payload }));

    console.log("[saveDayPlan] response:", response);

    if (response?.payload) {
      AppToaster.show({ message: `✅ ${type} schedule saved!`, intent: Intent.SUCCESS });
    } else {
      AppToaster.show({ message: `❌ Failed to save ${type} schedule`, intent: Intent.DANGER });
    }
  };

  const onDragEnd = (result) => {
    console.log("[onDragEnd] result:", result);

    const { source, destination, draggableId } = result;
    if (!destination || !source || typeof source.index !== "number" || typeof destination.index !== "number") return;

    const fromTaskBank = source.droppableId === "taskBank";
    const whichSchedule = destination.droppableId.includes("preview") ? "preview" : "actual";
    const slotKey = destination.droppableId.replace("preview_", "").replace("actual_", "");

    console.log("[onDragEnd] fromTaskBank:", fromTaskBank);
    console.log("[onDragEnd] whichSchedule:", whichSchedule);
    console.log("[onDragEnd] slotKey:", slotKey);

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

  const currentDate = DateTime.fromJSDate(new Date()).toFormat("M/d/yyyy");
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
              <div className="live-time">current time: {currentDate} {currentTime}</div>
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
