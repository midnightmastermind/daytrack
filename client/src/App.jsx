import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchMessage } from "./store/messageSlice";
import { Button, Card, CardList, Collapse, Elevation, Checkbox, InputGroup, Navbar, Drawer, DrawerSize, Position, Alignment } from "@blueprintjs/core";
import { useDrag, useDrop } from "react-dnd";
import { DndProvider } from "react-dnd";
import { DateTime } from "luxon";
import NewTaskForm from './NewTaskForm.jsx';
import { Icon } from "@blueprintjs/core";
import { TouchBackend } from "react-dnd-touch-backend";
import { HTML5Backend } from "react-dnd-html5-backend";
import "./App.css";

// Define type constants for drag and drop
const ItemTypes = {
  TASK: "task"
};

const taskStructure = [
  {
    name: "check-in",
    options: [
      {
        name: "me",
        options: [
          { name: "meds", type: "checkbox", value: false },
          { name: "water", type: "checkbox", value: false },
          { name: "eat", type: "checkbox", value: false }
        ]
      },
      {
        name: "others",
        options: [
          { name: "messages", type: "checkbox", value: false },
          { name: "feed cats", type: "checkbox", value: false },
          { name: "pet cats", type: "checkbox", value: false },
          { name: "mom", type: "checkbox", value: false }
        ]
      },
      {
        name: "develop",
        options: [
          { name: "finance", type: "checkbox", value: false },
          { name: "nutrition", type: "checkbox", value: false },
          { name: "fitness", type: "checkbox", value: false },
          { name: "todo", type: "checkbox", value: false }
        ]
      }
    ]
  },
  {
    name: "clean-up",
    options: [
      {
        name: "physical",
        options: [
          { name: "laundry", type: "checkbox", value: false },
          { name: "trash", type: "checkbox", value: false },
          { name: "dishes", type: "checkbox", value: false },
          { name: "items", type: "checkbox", value: false }
        ]
      },
      {
        name: "virtual",
        options: [
          { name: "images", type: "checkbox", value: false },
          { name: "documents", type: "checkbox", value: false },
          { name: "videos", type: "checkbox", value: false },
          { name: "code", type: "checkbox", value: false },
          { name: "bookmarks", type: "checkbox", value: false }
        ]
      },
      {
        name: "work-area",
        options: [
          { name: "surrounding", type: "checkbox", value: false },
          { name: "session", type: "checkbox", value: false },
          { name: "notes", type: "checkbox", value: false }
        ]
      }
    ]
  },
  {
    name: "work",
    options: [
      {
        name: "options",
        options: [
          { name: "action", type: "input", value: "" }
        ]
      }
    ]
  },
  {
    name: "play",
    options: [
      {
        name: "options",
        options: [
          { name: "action", type: "input", value: "" }
        ]
      }
    ]
  },
  {
    name: "bath-time",
    options: null
  },
  {
    name: "meditate",
    options: [
      {
        name: "actions",
        options: [
          { name: "plan", type: "input", value: "" },
          { name: "reflect", type: "input", value: "" },
          { name: "create", type: "input", value: "" }
        ]
      }
    ]
  }
];

function App() {
  const dispatch = useDispatch();
  const message = useSelector((state) => state.message.value);
  const status = useSelector((state) => state.message.status);

  const [taskAssignments, setTaskAssignments] = useState({});
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [tasks, setTasks] = useState(taskStructure); // Set taskStructure as default value
  const [task, setTask] = useState(null);

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
    dispatch(fetchMessage());
  }, [dispatch]);

  const handleDrawerToggle = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const TaskCard = ({ task }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [taskState, setTaskState] = useState(task);

    const [{ isDragging }, drag] = useDrag(() => ({
      type: ItemTypes.TASK,
      item: { task: taskState.name, details: taskState.options },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }));

    const handleCaretClick = () => setIsOpen(!isOpen);

    const handleTaskDetailChange = (category, option, value) => {
      setTaskState((prev) => {
        const updatedTask = { ...prev };
        const categoryIndex = updatedTask.options.findIndex((cat) => cat.name === category);
        if (categoryIndex !== -1) {
          const optionIndex = updatedTask.options[categoryIndex].options.findIndex((opt) => opt.name === option);
          if (optionIndex !== -1) {
            updatedTask.options[categoryIndex].options[optionIndex].value = value;
          }
        }
        return updatedTask;
      });
    };

    useEffect(() => {
      if (isDragging) {
        console.log('Dragging task:', taskState);
      }
    }, [isDragging, taskState]);

    const dragStyle = {
      cursor: isDragging ? "grabbing" : "grab",
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <Card ref={drag} elevation={Elevation.FOUR} style={dragStyle}>
        <div className="task-header">
          {taskState.options ? (
            <Button icon={isOpen ? "caret-down" : "caret-right"} onClick={handleCaretClick} />
          ) : (
            <Icon icon="dot" />
          )}
          <div className="task-name">{taskState.name}</div>
          <Icon icon="horizontal-inbetween" />
        </div>

        {taskState.options && (
          <Collapse isOpen={isOpen} keepChildrenMounted>
            <div className="task-column-container">
              {taskState.options.map((category) => (
                <div className="task-column" key={category.name}>
                  <strong className="column-name">{category.name}</strong>
                  {category.options.map((field) =>
                    field.type === "checkbox" ? (
                      <Checkbox
                        key={field.name}
                        label={<span className="option-name">{field.name}</span>}
                        checked={field.value || false}
                        onChange={(e) => handleTaskDetailChange(category.name, field.name, e.target.checked)}
                      />
                    ) : (
                      <InputGroup
                        key={field.name}
                        placeholder={`Enter ${field.name}`}
                        value={field.value || ""}
                        onChange={(e) => handleTaskDetailChange(category.name, field.name, e.target.value)}
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

  const ScheduleCard = ({ timeSlot, taskAssignments, setTaskAssignments, index, tasks, setTasks }) => {
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
      accept: ItemTypes.TASK,
      drop: (item) => {
        console.log(item);
        const clonedTask = { ...item, details: JSON.parse(JSON.stringify(item.details)) };

        setTaskAssignments((prevAssignments) => ({
          ...prevAssignments,
          [timeSlot]: {
            task: clonedTask.task,
            details: clonedTask.details
          },
        }));

        console.log(`Dropped Task: ${clonedTask.task}`);
        console.log("Options: ", clonedTask.details);

        // Reset the values of the original task
        const resetTask = tasks.map(task => {
          if (task.name === item.task) {
            return {
              ...task,
              options: task.options.map(category => ({
                ...category,
                options: category.options.map(option => ({
                  ...option,
                  value: option.type === "checkbox" ? false : "", // Reset checkbox to false or input to an empty string
                }))
              }))
            };
          }
          return task;
        });

        setTasks(resetTask); // Update the task list with the reset task
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }));
    const cardStyle = {
      border: isOver ? "2px dashed #4caf50" : "2px solid #ccc",
      backgroundColor: isOver ? "#e0f7e0" : (index % 2 ? "white" : "aliceblue"),
      transition: "background-color 0.2s, border 0.2s",
    };

    return (
      <Card ref={drop} className="droppable-card" elevation={Elevation.FOUR} interactive={true} style={cardStyle}>
        {taskAssignments[timeSlot] ? (
          <div className="assigned-task">
            <div className="task-content">
              <Button icon="cross" minimal={true} onClick={() => setTaskAssignments((prev) => {
                const newAssignments = { ...prev };
                delete newAssignments[timeSlot];
                return newAssignments;
              })} className="remove-task-btn" />
              <div>{taskAssignments[timeSlot].task}</div>
              <div>{timeSlot}</div>
            </div>
          </div>
        ) : (
          <div className="timeslot">{timeSlot}</div>
        )}
      </Card>
    );
  };

  const TaskDisplay = ({ taskAssignments }) => {
    console.log(taskAssignments);
    return (
      <CardList className="display">
        {timeSlots.map((timeSlot, index) => {
          const assignment = taskAssignments[timeSlot];
          if (!assignment) return null;

          const { task, details } = assignment;

          const selectedDetails = [];
          details.forEach((category) => {
            const selectedOptions = category.options
              .filter((option) => (option.type === "checkbox" && option.value) || (option.type === "input" && option.value.trim()))
              .map((option) => ({
                name: option.name,
                value: option.type === "checkbox" ? "✔" : option.value,
              }));

            if (selectedOptions.length > 0) {
              selectedDetails.push({
                category: category.name,
                options: selectedOptions,
              });
            }
          });

          return (
            <Card key={timeSlot} elevation={Elevation.FOUR} style={{ backgroundColor: index % 2 ? "white" : "aliceblue" }} className="display-card">
              <div className="timeslot"><strong>{timeSlot}</strong></div>
              <div className="task-name"><strong>{task}</strong></div>
              <div className="task-details">
                {selectedDetails.length > 0 ? (
                  selectedDetails.map((category, i) => (
                    <div key={i} className="task-category">
                      <strong>{category.category}</strong>
                      <div className="task-options">
                        {category.options.map((option, j) => (
                          <div key={j} className="task-option">
                            • {option.name}: {option.value}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-options">No details selected</div>
                )}
              </div>
            </Card>
          );
        })}
      </CardList>
    );
  };


  const handleSave = (newTask) => {
    setTasks((prevTasks) => [...prevTasks, newTask]);
    setIsDrawerOpen(false);
  };

  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <div className="container">
        <Navbar className="tool-bar">
          <Navbar.Group align={Alignment.LEFT} className="navbar-group">
            <Button icon="plus" intent="primary" minimal onClick={handleDrawerToggle} />
          </Navbar.Group>
        </Navbar>

        <Drawer
          isOpen={isDrawerOpen}
          onClose={handleDrawerToggle}
          size={DrawerSize.SMALL}
          position={Position.LEFT}
          title="Create a New Task"
        >
          <NewTaskForm taskData={task} onSave={handleSave} />
        </Drawer>

        <div className="left-side">
          <CardList className="card-column task-bank">
            {tasks.map((taskItem) => (
              <TaskCard key={taskItem.name} task={taskItem} />
            ))}
          </CardList>

          <div className="schedule">
            <Card className="boundary-card" elevation={Elevation.FOUR} interactive={false}>
              <div className="timeslot">Wakeup</div>
            </Card>
            <CardList className="card-column">
              {timeSlots.map((timeSlot, index) => (
                <ScheduleCard
                  key={index}
                  timeSlot={timeSlot}
                  taskAssignments={taskAssignments}
                  setTaskAssignments={setTaskAssignments}
                  tasks={tasks}  // Pass tasks
                  setTasks={setTasks}  // Pass setTasks
                />
              ))}
            </CardList>
            <Card className="boundary-card" elevation={Elevation.FOUR} interactive={false}>
              <div className="timeslot">Sleep</div>
            </Card>
          </div>
        </div>

        <div className="right-side">
          <TaskDisplay taskAssignments={taskAssignments} />
        </div>
      </div>
    </DndProvider>
  );
}

export default App;
