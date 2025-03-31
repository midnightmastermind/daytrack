import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { DragDropContext } from "react-beautiful-dnd";
import { DateTime } from "luxon";
import { Drawer, DrawerSize, Position } from "@blueprintjs/core";
import "./App.css";
import "./responsive.css";
// Redux actions
import { fetchTasks } from "./store/tasksSlice";
import { fetchAllDayPlans, createDayPlan, updateDayPlan } from "./store/dayPlanSlice";
import { fetchGoals, createGoal, updateGoal, deleteGoal } from "./store/goalSlice";
import { fetchGoalProgress } from "./store/goalProgressSlice";

// Components
import Toolbar from "./components/Toolbar";
import TaskBank from "./components/TaskBank";
import Schedule from "./components/Schedule";
import TaskDisplay from "./components/TaskDisplay";
import GoalDisplay from "./components/GoalDisplay";
import NewTaskForm from "./NewTaskForm.jsx";
import GoalForm from "./GoalForm.jsx";

function App() {
  const dispatch = useDispatch();
  
  // Redux state
  const { tasks } = useSelector((state) => state.tasks);
  const { dayplans } = useSelector((state) => state.dayplans);
  const { goals } = useSelector((state) => state.goals);
  const { goalProgress } = useSelector((state) => state.goalProgress);

  // Local state copies for immediate UI use
  const [tasksState, setTasksState] = useState(tasks || []);
  const [dayPlansState, setDayPlansState] = useState(dayplans || []);
  const [goalsState, setGoalsState] = useState(goals || []);
  const [goalProgressState, setGoalProgressState] = useState(goalProgress || []);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [assignments, setAssignments] = useState({});
  const [planDirty, setPlanDirty] = useState(false);
  const [task, setTask] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [goalDrawerOpen, setGoalDrawerOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  // Generate time slots (7:00 AM - 11:30 PM, 30-minute increments)
  const generateTimeSlots = () => {
    let slots = [];
    let startTime = DateTime.local().set({ hour: 7, minute: 0 });
    let endTime = DateTime.local().set({ hour: 23, minute: 30 });
    while (startTime <= endTime) {
      slots.push(startTime.toFormat("h:mm a"));
      startTime = startTime.plus({ minutes: 30 });
    }
    console.log("Generated time slots:", slots);
    return slots;
  };
  const timeSlots = generateTimeSlots();

  // Dispatch initial fetches
  useEffect(() => {
    console.log("Dispatching fetchTasks, fetchAllDayPlans, fetchGoals, and fetchGoalProgress");
    dispatch(fetchTasks());
    dispatch(fetchAllDayPlans());
    dispatch(fetchGoals());
    dispatch(fetchGoalProgress());
  }, [dispatch]);

  // Sync Redux tasks with local state
  useEffect(() => {
    console.log("Redux tasks updated:", tasks);
    setTasksState(tasks || []);
  }, [tasks]);

  // Sync Redux dayplans with local state
  useEffect(() => {
    console.log("Redux dayplans updated:", dayplans);
    setDayPlansState(dayplans || []);
  }, [dayplans]);

  // Sync Redux goals with local state
  useEffect(() => {
    console.log("Redux goals updated:", goals);
    setGoalsState(goals || []);
  }, [goals]);

  // Sync Redux goalProgress with local state
  useEffect(() => {
    console.log("Redux goalProgress updated:", goalProgress);
    setGoalProgressState(goalProgress || []);
  }, [goalProgress]);

  // Update assignments for the selected date based on dayPlansState
  useEffect(() => {
    console.log("Updating assignments for selected date:", selectedDate);
    if (dayPlansState && dayPlansState.length > 0) {
      const found = dayPlansState.find((plan) => {
        console.log("Comparing plan date:", plan.date);
        return new Date(plan.date).toDateString() === selectedDate.toDateString();
      });
      if (found && found.result) {
        console.log("Found dayplan for date:", found);
        const newAssignments = {};
        (found.result || []).forEach((entry) => {
          console.log("Processing result entry:", entry);
          newAssignments[entry.timeSlot] = entry.assignedTasks || [];
        });
        console.log("New assignments set:", newAssignments);
        setAssignments(newAssignments);
      } else {
        console.log("No dayplan found for selected date. Resetting assignments.");
        setAssignments({});
      }
      setPlanDirty(false);
    }
  }, [selectedDate, dayPlansState]);

  // Save or update the DayPlan when requested
  const handleSaveDayPlan = () => {
    console.log("Saving DayPlan for date:", selectedDate);
    const resultArray = Object.keys(assignments).map((timeSlot) => {
      console.log("Saving timeslot:", timeSlot, "with tasks:", assignments[timeSlot]);
      return {
        timeSlot,
        assignedTasks: assignments[timeSlot],
      };
    });
    const dayPlanData = {
      date: selectedDate,
      plan: resultArray,
      result: resultArray,
    };
    console.log("DayPlan data prepared:", dayPlanData);

    const existingPlan = dayPlansState.find((plan) => {
      return new Date(plan.date).toDateString() === selectedDate.toDateString();
    });
    if (existingPlan && existingPlan._id) {
      console.log("Existing plan found. Updating plan with id:", existingPlan._id);
      dispatch(updateDayPlan({ id: existingPlan._id, dayPlanData }));
    } else {
      console.log("No existing plan found. Creating new DayPlan.");
      dispatch(createDayPlan(dayPlanData));
    }
    setPlanDirty(false);
  };

  // onDragEnd: Handle drag-and-drop logic
  const onDragEnd = (result) => {
    console.log("onDragEnd:", result);
    const { source, destination, draggableId } = result;
    if (!destination || !source) {
      console.log("Missing source or destination, exiting.");
      return;
    }
    if (typeof source.index !== "number" || typeof destination.index !== "number") {
      console.log("Invalid source or destination index, exiting.");
      return;
    }

    let updatedAssignments = { ...assignments };
    const fromTaskBank = source.droppableId === "taskBank";
    let movedTask;

    if (fromTaskBank) {
      const taskFromBank = tasksState.find(
        (task) => task._id.toString() === draggableId
      );
      if (!taskFromBank) {
        console.log("Task not found in tasksState");
        return;
      }
      // Create a new instance with a new assignmentId so it becomes independent
      movedTask = {
        ...taskFromBank,
        id: taskFromBank._id.toString(),        // original id for reference
        originalId: taskFromBank._id.toString(),  // reference to the original task
        assignmentId: `${taskFromBank._id}-${Date.now()}-${Math.random()}`,
        parent_id: null,
      };
    } else {
      // Moving from within the schedule
      const sourceTasks = [...(assignments[source.droppableId] || [])];
      movedTask = sourceTasks[source.index];
      sourceTasks.splice(source.index, 1);
      updatedAssignments[source.droppableId] = sourceTasks;
    }

    const destTasks = [...(assignments[destination.droppableId] || [])];

    if (fromTaskBank) {
      // Always add a new instance when dragging from the task bank.
      destTasks.splice(destination.index, 0, movedTask);
    } else {
      const existingIndex = destTasks.findIndex(
        (task) => task.assignmentId === movedTask.assignmentId
      );
      if (existingIndex !== -1) {
        destTasks[existingIndex] = movedTask;
      } else {
        destTasks.splice(destination.index, 0, movedTask);
      }
    }

    updatedAssignments[destination.droppableId] = destTasks;
    console.log("Updated assignments:", updatedAssignments);
    setAssignments(updatedAssignments);
    setPlanDirty(true);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="container">
        <Toolbar
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          planDirty={planDirty}
          onSaveDayPlan={handleSaveDayPlan}
          onOpenDrawer={() => {
            console.log("Opening task drawer");
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
                onEditTask={(task) => {
                  console.log("Editing task:", task.name);
                  setTask(task);
                }}
                onOpenDrawer={() => setIsDrawerOpen(true)}
              />
            </div>
            
            <div className="schedule-container">
              <Schedule
                timeSlots={timeSlots}
                assignments={assignments}
                setAssignments={setAssignments}
                setPlanDirty={setPlanDirty}
              />
            </div>
          </div>
          <div className="right-side">
            <GoalDisplay
  goals={goalsState}
  onEditGoal={(goal) => {
    setEditingGoal(goal);
    setGoalDrawerOpen(true);
  }}
/>
            <TaskDisplay
              timeSlots={timeSlots}
              assignments={assignments}
            />
          </div>
        </div>
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          size={DrawerSize.SMALL}
          position={Position.LEFT}
          title="Create / Edit Task"
        >
          <NewTaskForm
            task={task}
            onSave={(newTask) => {
              console.log("New task saved:", newTask);
              setTasksState((prev) => [...prev, newTask]);
              setIsDrawerOpen(false);
            }}
          />
        </Drawer>
        <Drawer
          isOpen={goalDrawerOpen}
          onClose={() => setGoalDrawerOpen(false)}
          size={DrawerSize.MEDIUM}
          position={Position.RIGHT}
          title="Create / Edit Goal"
        >
          <GoalForm
            goal={editingGoal}
            tasks={tasksState} // Pass all tasks for the dropdown
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