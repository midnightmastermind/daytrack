import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchMessage } from "./store/messageSlice";
import { fetchTasks } from "./store/tasksSlice";
import { fetchAllDayPlans, createDayPlan, updateDayPlan } from "./store/dayPlanSlice";
import { DndProvider } from "react-dnd";
import { TouchBackend } from "react-dnd-touch-backend";
import { DateTime } from "luxon";
import {
  Button,
  Card,
  CardList,
  Collapse,
  Dialog,
  Drawer,
  DrawerSize,
  Elevation,
  Checkbox,
  InputGroup,
  Navbar,
  Position,
  Alignment,
  Icon,
  Popover,
} from "@blueprintjs/core";
import "./App.css";

// Components
import Toolbar from "./components/Toolbar";
import TaskBank from "./components/TaskBank";
import Schedule from "./components/Schedule";
import TaskDisplay from "./components/TaskDisplay";
import NewTaskForm from "./NewTaskForm.jsx";

function App() {
  const dispatch = useDispatch();
  const { tasks } = useSelector((state) => state.tasks);
  const { dayplans } = useSelector((state) => state.dayplans);

  // Local state (sync with Redux)
  const [tasksState, setTasksState] = useState(tasks || []);
  const [dayPlansState, setDayPlansState] = useState(dayplans || []);
  
  // Selected date for the DayPlan
  const [selectedDate, setSelectedDate] = useState(new Date());
  // Local schedule assignments: keyed by timeslot with an array of assigned tasks
  const [assignments, setAssignments] = useState({});
  // Dirty flag to indicate schedule changes
  const [planDirty, setPlanDirty] = useState(false);
  // For editing a task from the task bank
  const [task, setTask] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

  useEffect(() => {
    console.log("Dispatching fetchMessage, fetchTasks, and fetchAllDayPlans");
    dispatch(fetchMessage());
    dispatch(fetchTasks());
    dispatch(fetchAllDayPlans());
  }, [dispatch]);

  useEffect(() => {
    console.log("Redux tasks updated:", tasks);
    setTasksState(tasks || []);
  }, [tasks]);

  useEffect(() => {
    console.log("Redux dayplans updated:", dayplans);
    setDayPlansState(dayplans || []);
  }, [dayplans]);

  // Update assignments when selectedDate or dayPlansState change
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

  const handleDrawerToggle = () => {
    console.log("Toggling drawer. Current state:", isDrawerOpen);
    setIsDrawerOpen(!isDrawerOpen);
  };

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

  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <div className="container">
        <Toolbar 
          selectedDate={selectedDate} 
          setSelectedDate={setSelectedDate} 
          planDirty={planDirty} 
          onSaveDayPlan={handleSaveDayPlan} 
        />
        <div className="left-side">
          <TaskBank 
            tasks={tasksState} 
            onEditTask={(task) => {
              console.log("Editing task:", task.name);
              setTask(task);
            }}
            onOpenDrawer={() => setIsDrawerOpen(true)}
          />
          <Schedule 
            timeSlots={timeSlots} 
            assignments={assignments} 
            setAssignments={setAssignments} 
            setPlanDirty={setPlanDirty}
          />
          </div>
          <div className="right-side">
          <TaskDisplay 
            timeSlots={timeSlots} 
            assignments={assignments} 
          />
          </div>
        </div>
        <Drawer
          isOpen={isDrawerOpen}
          onClose={handleDrawerToggle}
          size={DrawerSize.SMALL}
          position={Position.LEFT}
          title="Create / Edit Task"
        >
          <NewTaskForm
            task={task}
            onSave={(newTask) => {
              console.log("New task saved:", newTask);
              setTasksState((prev) => [...prev, newTask]);
              handleDrawerToggle();
            }}
          />
        </Drawer>
    </DndProvider>
  );
}

export default App;
