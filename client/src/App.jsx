import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchMessage } from "./store/messageSlice";
import { Button, Card, CardList, Collapse, Elevation, Checkbox, InputGroup } from "@blueprintjs/core"; // Import BlueprintJS components
import { useDrag, useDrop } from "react-dnd"; // Import react-dnd hooks
import { DndProvider } from "react-dnd"; // Import DndProvider
import { DateTime } from "luxon";
import { Icon } from "@blueprintjs/core";
import { HTML5Backend } from "react-dnd-html5-backend"; // Import backend for drag and drop
import "./App.css";

// Define type constants for drag and drop
const ItemTypes = {
  TASK: "task"
};

function App() {
  const dispatch = useDispatch();
  const message = useSelector((state) => state.message.value);
  const status = useSelector((state) => state.message.status);

  // Track dropped tasks (task assignments to time slots)
  const [taskAssignments, setTaskAssignments] = useState({});
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

  const TaskCard = ({ task }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [taskState, setTaskState] = useState(task);  // Use the entire task object as state
  
    const [{ isDragging }, drag] = useDrag(() => ({
      type: ItemTypes.TASK,
      item: taskState, // Pass the entire task object
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

    // Log the item as it's being dragged
    useEffect(() => {
      if (isDragging) {
        console.log('Dragging task:', taskState);
      }
    }, [isDragging, taskState]); // This will run every time the dragging state or task changes

  
    // Apply cursor style dynamically based on the isDragging state
    const dragStyle = {
      cursor: isDragging ? "grabbing" : "grab", // Change cursor to grabbing/fist when dragging
      opacity: isDragging ? 0.5 : 1, // Optionally change opacity during dragging
    };
  
    return (
      <Card ref={drag} elevation={Elevation.FOUR} style={dragStyle}>
        <div className="task-header">
          {/* Only display the caret button if there are options to expand */}
          {taskState.options ? (
            <Button icon={isOpen ? "caret-down" : "caret-right"} onClick={handleCaretClick} />
          ) : (
            <Icon icon="dot" />
          )}
          <div className="task-name">{taskState.name}</div>
          <Icon icon="horizontal-inbetween" />
        </div>
  
        {/* If the task has options, show a collapsible section with checkboxes and/or inputs */}
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
  



  // ScheduleCard component (Droppable)
  const ScheduleCard = ({ timeSlot, taskAssignments, setTaskAssignments, index }) => {
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
      accept: ItemTypes.TASK,
      drop: (item) => {
        console.log(item);
        // Add the dropped task and its details to the taskAssignments for the timeSlot
        setTaskAssignments((prevAssignments) => ({
          ...prevAssignments,
          [timeSlot]: {
            task: item.task,  // Store the task name
            details: item.details // Store the task details (checkboxes or input)
          },
        }));

        // Print the dropped task and its options (checkboxes or input)
        console.log(`Dropped Task: ${item.task}`);
        console.log("Options: ", item.details);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }));

    const cardStyle = {
      border: isOver ? "2px dashed #4caf50" : "2px solid #ccc",
      backgroundColor: isOver ? "#e0f7e0" : (index % 2 ? "white" : "aliceblue"), // Set background color to aliceblue
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
              <div>Details: {JSON.stringify(taskAssignments[timeSlot].details)}</div>
            </div>
          </div>
        ) : (
          <div className="timeslot">{timeSlot}</div>
        )}
      </Card>
    );
  };

  // TaskDisplay component (Displays task info)
  const TaskDisplay = ({ taskAssignments }) => {
    return (
      <CardList className="display">
        {Object.keys(taskAssignments).map((timeSlot, index) => (
          <Card key={timeSlot} elevation={Elevation.FOUR} style={{ backgroundColor: (index % 2 ? "white" : "aliceblue") }} className="display-card">
            <div className="task-details">
              <div className="timeslot">{timeSlot}</div> {/* Display the timeslot */}
              <div className="task-name">{taskAssignments[timeSlot].task}</div> {/* Display the task */}
              <div>Details: {JSON.stringify(taskAssignments[timeSlot].details)}</div> {/* Display task details */}
            </div>
          </Card>
        ))}
      </CardList>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}> {/* Wrap app in DndProvider */}
      <div className="container">
        <CardList className="card-column task-bank">
          {taskStructure.map((taskItem) => (
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
                setTaskAssignments={setTaskAssignments} // Pass setTaskAssignments to ScheduleCard
              />
            ))}
          </CardList>
          <Card className="boundary-card" elevation={Elevation.FOUR} interactive={false}>
            <div className="timeslot">Sleep</div>
          </Card>
        </div>
        <TaskDisplay taskAssignments={taskAssignments} /> {/* Display Task Cards */}
      </div>
    </DndProvider>
  );
}

export default App;
