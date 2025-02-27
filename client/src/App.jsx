import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { DragDropContext } from "react-beautiful-dnd";
import { DateTime } from "luxon";
import { Drawer, DrawerSize, Position } from "@blueprintjs/core";
import "./App.css";
import { fetchTasks } from "./store/tasksSlice";
import { fetchAllDayPlans, createDayPlan, updateDayPlan } from "./store/dayPlanSlice";

// Components (assumed to be in ./components)
import Toolbar from "./components/Toolbar";
import TaskBank from "./components/TaskBank";
import Schedule from "./components/Schedule";
import TaskDisplay from "./components/TaskDisplay";
import NewTaskForm from "./NewTaskForm.jsx";

function App() {
  const dispatch = useDispatch();
  const { tasks } = useSelector((state) => state.tasks);
  const { dayplans } = useSelector((state) => state.dayplans);

  const [tasksState, setTasksState] = useState(tasks || []);
  const [dayPlansState, setDayPlansState] = useState(dayplans || []);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [assignments, setAssignments] = useState({});
  const [planDirty, setPlanDirty] = useState(false);
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
    console.log("Dispatching fetchTasks and fetchAllDayPlans");
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

  // onDragEnd: if a task is dropped in a timeslot and a task with the same id already exists, replace it; otherwise, add it.
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

    // Copy the current assignments
    let updatedAssignments = { ...assignments };
    // Determine if the drag originates from the task bank
    const fromTaskBank = source.droppableId === "taskBank";
    let movedTask;

    if (fromTaskBank) {
      // Get the full task from tasksState using the draggableId (which is task._id)
      const taskFromBank = tasksState.find(
        (task) => task._id.toString() === draggableId
      );
      if (!taskFromBank) {
        console.log("Task not found in tasksState");
        return;
      }
      // Always create a new instance with a new assignmentId for each drop
      movedTask = {
        ...taskFromBank,
        id: taskFromBank._id.toString(),        // original id (for reference)
        originalId: taskFromBank._id.toString(),  // reference to the original task
        // Generate a new unique assignmentId (ensuring a new draggable identity)
        assignmentId: `${taskFromBank._id}-${Date.now()}-${Math.random()}`,
        parent_id: null,
      };
    } else {
      // Dragging from within the schedule: use the existing instance.
      const sourceTasks = [...(assignments[source.droppableId] || [])];
      movedTask = sourceTasks[source.index];
      // Remove it from the source timeslot.
      sourceTasks.splice(source.index, 1);
      updatedAssignments[source.droppableId] = sourceTasks;
    }

    // Get the destination tasks for the timeslot.
    const destTasks = [...(assignments[destination.droppableId] || [])];

    if (fromTaskBank) {
      // Always add as a new instance when dragging from task bank,
      // so even if a task with the same originalId exists, we add a new copy.
      destTasks.splice(destination.index, 0, movedTask);
    } else {
      // If moving within the schedule, update based on assignmentId.
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
          console.log("Opening drawer");
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
              <div className="boundary-card">Wake Up</div>
              <Schedule
                timeSlots={timeSlots}
                assignments={assignments}
                setAssignments={setAssignments}
                setPlanDirty={setPlanDirty}
              />
              <div className="boundary-card">Sleep</div>
            </div>
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
      </div>
    </DragDropContext>
  );
}

export default App;
