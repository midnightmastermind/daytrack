import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TaskCard from "./TaskCard";
import { Icon } from "@blueprintjs/core";

export default function SortableTaskCard({ task, ...props }) {
  const id = (task._id || task.tempId).toString();

  const { setNodeRef, attributes, listeners, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragHandle = (
    <Icon
      icon="horizontal-inbetween"
      className="drag-icon"
      {...listeners}     // ⭐ Touch + pointer drag events
      {...attributes}    // ⭐ Accessibility + sorting info
    />
  );

  return (
    <div         // ⭐ MUST be a DOM element
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="cloned-task"
    >
      <TaskCard
        {...props}
        task={task}
        dragHandle={dragHandle}
      />
    </div>
  );
}
