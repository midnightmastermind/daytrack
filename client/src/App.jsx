// ✅ App.jsx with optimistic updates using addPendingProgress and clearPendingProgress
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
import { getTaskDifferences } from "./utils/getTaskDifferences";
import store from './store/store'
const AppToaster = Toaster.create({ position: Position.TOP_RIGHT });

function App() {
  const dispatch = useDispatch();

  const { tasks } = useSelector((state) => state.tasks);
  const { dayplans } = useSelector((state) => state.dayplans);
  const { goals } = useSelector((state) => state.goals);
  const progressRecords = useSelector((state) => state.goalProgress?.progressRecords || []);

  const [selectedDate, setSelectedDate] = useState(new Date());

  const goalsWithProgressSelector = useMemo(
    () => makeSelectGoalsWithProgress(selectedDate),
    [selectedDate]
  );

  const goalsWithProgress = useSelector(goalsWithProgressSelector);
  const [tasksState, setTasksState] = useState([]);
  const [dayPlansState, setDayPlansState] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [lastSavedAssignments, setLastSavedAssignments] = useState({});
  const [planDirty, setPlanDirty] = useState(false);
  const [task, setTask] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [goalDrawerOpen, setGoalDrawerOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

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

  useEffect(() => setTasksState(tasks || []), [tasks]);
  useEffect(() => setDayPlansState(dayplans || []), [dayplans]);

  useEffect(() => {
    const found = dayPlansState.find(
      (plan) => new Date(plan.date).toDateString() === selectedDate.toDateString()
    );
    if (found && found.result) {
      const newAssignments = {};
      (found.result || []).forEach((entry) => {
        newAssignments[entry.timeSlot] = entry.assignedTasks || [];
      });
      setAssignments(newAssignments);
      setLastSavedAssignments(newAssignments);
    } else {
      setAssignments({});
      setLastSavedAssignments({});
    }
    setPlanDirty(false);
  }, [selectedDate, dayPlansState]);

  const handleTaskUpdate = (updatedTask) => {
    setTasksState((prevTasks) =>
      prevTasks.map((task) => (task._id === updatedTask._id ? updatedTask : task))
    );
  };

  const flattenGoalTaskIds = (goal) => {
    const ids = new Set();
  
    const walk = (task) => {
      if (task.checked !== false) {
        const id = (task.task_id || task._id || task.id)?.toString();
        if (id) ids.add(id);
      }
  
      if (Array.isArray(task.children)) {
        for (const child of task.children) {
          walk(child);
        }
      }
    };
  
    for (const task of goal.tasks || []) {
      walk(task);
    }
  
    return ids;
  };
  
  const saveDayPlan = async (assignmentsToSave) => {
    const resultArray = Object.entries(assignmentsToSave).map(([timeSlot, assignedTasks]) => ({
      timeSlot,
      assignedTasks,
    }));

    const dayPlanData = { date: selectedDate, plan: resultArray, result: resultArray };
    const existingPlan = dayPlansState.find(
      (plan) => new Date(plan.date).toDateString() === selectedDate.toDateString()
    );

    console.log("💾 Saving day plan for", selectedDate.toDateString());
    console.log("🗂 Day plan payload:", dayPlanData);
    const { added, removed } = getTaskDifferences(lastSavedAssignments, assignmentsToSave);
    const date = selectedDate.toISOString();

    for (const { id, count } of [...added, ...removed.map(r => ({ ...r, count: -r.count }))]) {
      const relatedGoals = goals.filter((goal) =>
        flattenGoalTaskIds(goal).has(id.toString())
      );
      
      for (const goal of relatedGoals) {

        const taskIdStr = id.toString();
        const goalId = goal._id?.toString();
        const tempId = goalId || goal.tempId || `temp_${goal.header || Math.random().toString(36).slice(2, 10)}`;
        const dateStr = date;
        console.log("🚀 Dispatching addPendingProgress", {
          goalId,
          date,
          taskId: taskIdStr,
          diff: count,
        });
        dispatch(addPendingProgress({
          goalId,
          date,
          taskId: taskIdStr,
          diff: count,
        }));
        dispatch(createGoalProgress({
          goalId,
          tempId: goal.tempId || (goal._id ? undefined : tempId),
          date: dateStr,
          taskId: taskIdStr,
          increment: count,
        }));
      }
    }


    const toastMsg = existingPlan ? "Day plan updated" : "Day plan created";
    const response = existingPlan
      ? await dispatch(updateDayPlan({ id: existingPlan._id, dayPlanData }))
      : await dispatch(createDayPlan(dayPlanData));

    if (response?.payload) {
      setLastSavedAssignments(assignmentsToSave);
      AppToaster.show({ message: toastMsg, intent: Intent.SUCCESS });
    } else {
      AppToaster.show({ message: "Failed to save day plan", intent: Intent.DANGER });
    }
  };

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || !source || typeof source.index !== "number" || typeof destination.index !== "number") return;

    let updatedAssignments = { ...assignments };
    const fromTaskBank = source.droppableId === "taskBank";
    let movedTask;

    console.log("🟢 DRAG END EVENT");
    console.log("Source:", source);
    console.log("Destination:", destination);
    console.log("Dragged Task ID:", draggableId);
    if (fromTaskBank) {
      const taskFromBank = tasksState.find((task) => task._id.toString() === draggableId);
      if (!taskFromBank) return;
      const deepClone = (obj) => JSON.parse(JSON.stringify(obj));
      movedTask = {
        ...deepClone(taskFromBank),
        id: taskFromBank._id.toString(),
        originalId: taskFromBank._id.toString(),
        assignmentId: `${taskFromBank._id}-${Date.now()}-${Math.random()}`,
        parent_id: null,
      };
    } else {
      const sourceTasks = [...(assignments[source.droppableId] || [])];
      movedTask = sourceTasks[source.index];
      sourceTasks.splice(source.index, 1);
      updatedAssignments[source.droppableId] = sourceTasks;
    }

    const destTasks = [...(assignments[destination.droppableId] || [])];
    destTasks.splice(destination.index, 0, movedTask);
    updatedAssignments[destination.droppableId] = destTasks;

    setAssignments(updatedAssignments);
    console.log("📥 New assignments to save:", updatedAssignments);
    saveDayPlan(updatedAssignments);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="container">
        <Toolbar
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          planDirty={planDirty}
          onSaveDayPlan={() => saveDayPlan(assignments)}
          onOpenDrawer={() => {
            setTask(null);
            setIsDrawerOpen(true);
          }}
        />
        <div className="main-content">
          <div className="left-side">
            <div className="task-bank-container">
              <div className="task-bank-header">Task Bank</div>
              <TaskBank
                tasks={tasksState}
                onEditTask={(task) => setTask(task)}
                onOpenDrawer={() => setIsDrawerOpen(true)}
                onTaskUpdate={handleTaskUpdate}
              />
            </div>
            <div className="schedule-container">
              <Schedule
                timeSlots={timeSlots}
                assignments={assignments}
                setAssignments={setAssignments}
                setPlanDirty={setPlanDirty}
                onAssignmentsChange={saveDayPlan} // ✅ Add this
              />
            </div>
          </div>
          <div className="right-side">
            <GoalDisplay

              key={selectedDate.toISOString()}
              goals={goalsWithProgress} onEditGoal={(goal) => {
                setEditingGoal(goal);
                setGoalDrawerOpen(true);
              }}
            />
            <TaskDisplay timeSlots={timeSlots} assignments={assignments} />
          </div>
        </div>

        <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} size={DrawerSize.SMALL} position={Position.LEFT} title="Create / Edit Task">
          <NewTaskForm
            task={task}
            onSave={(newTask) => {
              setTasksState((prev) => [...prev, newTask]);
              setIsDrawerOpen(false);
            }}
          />
        </Drawer>

        <Drawer isOpen={goalDrawerOpen} onClose={() => setGoalDrawerOpen(false)} size={DrawerSize.MEDIUM} position={Position.RIGHT} title="Create / Edit Goal">
          <GoalForm
            goal={editingGoal}
            tasks={tasksState}
            onSave={(newGoal) => {
              if (editingGoal && editingGoal._id) {
                dispatch(updateGoal({ id: editingGoal._id, goalData: newGoal }));
              } else {
                dispatch(createGoal(newGoal));
              }
              setGoalDrawerOpen(false);
            }}
            onDelete={(goalToDelete) => {
              if (goalToDelete && goalToDelete._id) {
                dispatch(deleteGoal(goalToDelete._id));
              }
              setGoalDrawerOpen(false);
            }}
          />
        </Drawer>
      </div>
    </DragDropContext>
  );
}

export default App;