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
      {...listeners}
      {...attributes}
    />
  );

  return (
    <TaskCard
      {...props}
      task={task}
      ref={setNodeRef}
      style={style}
      dragHandle={dragHandle}
    />
  );
}