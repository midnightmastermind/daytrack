import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchMessage } from "./store/messageSlice";
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
import { DatePicker3 } from "@blueprintjs/datetime2";
import { useDrag, useDrop } from "react-dnd";
import { DndProvider } from "react-dnd";
import { DateTime } from "luxon";
import NewTaskForm from "./NewTaskForm.jsx";
import { TouchBackend } from "react-dnd-touch-backend";
import "./App.css";
import { fetchTasks } from "./store/tasksSlice";
import {
  fetchAllDayPlans,
  createDayPlan,
  updateDayPlan,
} from "./store/dayPlanSlice";

// Define type constants for drag and drop
const ItemTypes = {
  TASK: "task",
};


function App() {
  const dispatch = useDispatch();
  const { tasks } = useSelector((state) => state.tasks);
  const { dayplans } = useSelector((state) => state.dayplans);

  // Local state for task bank & day plans (kept in sync with Redux)
  const [tasksState, setTasksState] = useState(tasks || []);
  const [dayPlansState, setDayPlansState] = useState(dayplans || []);

  // Selected date (local state)
  const [selectedDate, setSelectedDate] = useState(new Date());
  // Local schedule assignments: keyed by timeslot with an array of assigned tasks
  const [assignments, setAssignments] = useState({});
  // Dirty flag to indicate schedule changes
  const [planDirty, setPlanDirty] = useState(false);
  // For editing a task from the task bank
  const [task, setTask] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [openAll, setOpenAll] = useState(true);
  // For the DatePicker popover
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);

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
      if (found) {
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

  // --- Define local handleTaskDetailChange inside TaskCard ---
  // This function will be defined inside TaskCard so that it operates on its local taskState.
  // (See the TaskCard component below.)

  // TaskCard: renders each task from the bank, with a cog button to open the edit form
  const TaskCard = ({ task, openAll }) => {
    const [isOpen, setIsOpen] = useState(openAll);
    const [taskState, setTaskState] = useState(task);

    const [{ isDragging }, drag] = useDrag(() => {
      console.log("Setting up drag for task:", taskState.name);
      return {
        type: ItemTypes.TASK,
        item: { task: taskState.name, details: taskState.columns },
        collect: (monitor) => ({
          isDragging: monitor.isDragging(),
        }),
      };
    });

    const handleCaretClick = () => {
      console.log("Toggling collapse for task:", taskState.name);
      setIsOpen(!isOpen);
    };

    // Define a local version of handleTaskDetailChange for this task
    const handleTaskDetailChange = (columnName, subtaskName, value) => {
      console.log(
        `Before updating [${taskState.name}]: Changing ${columnName} > ${subtaskName} to ${value}`
      );
      setTaskState((prev) => {
        // Deep clone the previous state
        const updatedTask = JSON.parse(JSON.stringify(prev));
        console.log("Cloned task state:", updatedTask);
        if (!updatedTask.columns || !Array.isArray(updatedTask.columns)) {
          console.log("No columns found in task state.");
          return updatedTask;
        }
        const colIndex = updatedTask.columns.findIndex(
          (col) => col.name === columnName
        );
        if (colIndex === -1) {
          console.log("Column not found:", columnName);
        } else {
          if (
            !updatedTask.columns[colIndex].subtasks ||
            !Array.isArray(updatedTask.columns[colIndex].subtasks)
          ) {
            console.log("No subtasks array found for column:", columnName);
          } else {
            const subIndex = updatedTask.columns[colIndex].subtasks.findIndex(
              (st) => st.name === subtaskName
            );
            if (subIndex === -1) {
              console.log("Subtask not found:", subtaskName);
            } else {
              console.log(
                `Updating ${columnName} > ${subtaskName} from ${updatedTask.columns[colIndex].subtasks[subIndex].value} to ${value}`
              );
              updatedTask.columns[colIndex].subtasks[subIndex].value = value;
            }
          }
        }
        console.log("Updated task state:", updatedTask);
        return updatedTask;
      });
    };

    return (
      <Card
        ref={drag}
        elevation={Elevation.FOUR}
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          opacity: isDragging ? 0.5 : 1,
        }}
      >
        <div className="task-header">
          {taskState.columns ? (
            <Button
              icon={isOpen ? "caret-down" : "caret-right"}
              onClick={handleCaretClick}
            />
          ) : (
            <Icon icon="dot" />
          )}
          <div className="task-name">{taskState.name}</div>
          <Button
            icon="cog"
            minimal
            onClick={() => {
              console.log("Editing task:", taskState.name);
              setTask(taskState);
              handleDrawerToggle();
            }}
          />
          <Icon icon="horizontal-inbetween" />
        </div>
        {taskState.columns && (
          <Collapse isOpen={isOpen} keepChildrenMounted>
            <div className="task-column-container">
              {taskState.columns.map((column) => (
                <div className="task-column" key={column.name}>
                  <strong className="column-name">{column.name}</strong>
                  {column.subtasks.map((field) =>
                    field.type === "bool" ? (
                      <Checkbox
                        key={field.name}
                        label={<span className="option-name">{field.name}</span>}
                        checked={field.value || false}
                        onChange={(e) =>
                          handleTaskDetailChange(
                            column.name,
                            field.name,
                            e.target.checked
                          )
                        }
                      />
                    ) : (
                      <InputGroup
                        key={field.name}
                        placeholder={`Enter ${field.name}`}
                        value={field.value || ""}
                        onChange={(e) =>
                          handleTaskDetailChange(
                            column.name,
                            field.name,
                            e.target.value
                          )
                        }
                      />
                    )
                  )}
                </div>
              ))}
            </div>
          </Collapse>
        )}
      </Card>
    );
  };

  // ScheduleCard: supports dropping tasks (multiple tasks per timeslot)
  const ScheduleCard = ({ timeSlot }) => {
    const tasksForSlot = assignments[timeSlot] || [];
    const [{ isOver }, drop] = useDrop(() => ({
      accept: ItemTypes.TASK,
      drop: (item) => {
        console.log(`Dropped task "${item.task}" into timeslot "${timeSlot}"`);
        const newTask = { task: item.task, details: item.details, parent_id: null };
        setAssignments((prev) => {
          const currentTasks = prev[timeSlot] ? [...prev[timeSlot]] : [];
          console.log("Current tasks for timeslot before drop:", currentTasks);
          const updated = { ...prev, [timeSlot]: [...currentTasks, newTask] };
          console.log("Updated assignments after drop:", updated);
          return updated;
        });
        setPlanDirty(true);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }));
    return (
      <Card
        ref={drop}
        elevation={Elevation.FOUR}
        interactive
        style={{
          border: isOver ? "2px dashed #4caf50" : "2px solid #ccc",
          backgroundColor: isOver ? "#e0f7e0" : undefined,
        }}
      >
        <div className="timeslot">{timeSlot}</div>
        {tasksForSlot.map((assignedTask, idx) => (
          <div key={idx} className="assigned-task">
            <div>{assignedTask.task}</div>
          </div>
        ))}
      </Card>
    );
  };

  // TaskDisplay: iterates over time slots and displays assigned tasks.
  const TaskDisplay = () => {
    return (
      <CardList className="display">
        {timeSlots.map((timeSlot) => {
          const tasksForSlot = assignments[timeSlot] || [];
          if (tasksForSlot.length === 0) return null;
          return (
            <Card key={timeSlot} elevation={Elevation.FOUR} className="display-card">
              <div className="timeslot">
                <strong>{timeSlot}</strong>
              </div>
              {tasksForSlot.map((assignedTask, j) => (
                <div key={j} className="task-option">
                  • {assignedTask.task}
                </div>
              ))}
            </Card>
          );
        })}
      </CardList>
    );
  };

  // Save DayPlan: convert assignments to array format and dispatch create/update.
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

    // Check if a plan for the selected date already exists
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
        <Navbar className="tool-bar">
          <Navbar.Group align={Alignment.LEFT} className="navbar-group">
            <Button
              icon="plus"
              intent="primary"
              minimal
              onClick={() => {
                console.log("Opening task drawer for new task");
                handleDrawerToggle();
              }}
            />
            {/* Date Button with Popover */}
            <Popover
              content={
                <DatePicker3
                  value={selectedDate}
                  onChange={(newDate) => {
                    console.log("DatePicker changed date to:", newDate);
                    setSelectedDate(newDate);
                  }}
                />
              }
              interactionKind="click"
            >
              <Button icon="calendar" minimal />
            </Popover>
            <div style={{ fontSize: "10px", marginLeft: "2px" }}>
              {DateTime.fromJSDate(selectedDate).toFormat("MMM d, yyyy")}
            </div>
            <Button
              icon="floppy-disk"
              minimal
              disabled={!planDirty}
              onClick={handleSaveDayPlan}
            />
          </Navbar.Group>
        </Navbar>

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

        <div className="left-side">
          <CardList className="card-column task-bank">
            {tasksState.map((taskItem) => (
              <TaskCard key={taskItem.name} task={taskItem} openAll={openAll} />
            ))}
          </CardList>

          <div className="schedule">
            <Card className="boundary-card" elevation={Elevation.FOUR} interactive={false}>
              <div className="timeslot">Wakeup</div>
            </Card>
            <CardList className="card-column">
              {timeSlots.map((timeSlot, index) => (
                <ScheduleCard key={index} timeSlot={timeSlot} />
              ))}
            </CardList>
            <Card className="boundary-card" elevation={Elevation.FOUR} interactive={false}>
              <div className="timeslot">Sleep</div>
            </Card>
          </div>
        </div>

        <div className="right-side">
          <TaskDisplay />
        </div>
      </div>
    </DndProvider>
  );
}

export default App;
