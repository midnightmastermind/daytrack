// GoalDisplay.jsx (DnD-enabled)
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Button } from "@blueprintjs/core";
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import GoalCard from "./GoalCard";
import { reorderGoalsOptimistic, bulkReorderGoals } from "../store/goalSlice";
const SortableGoal = ({ goal, onEditGoal }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: goal._id || goal.tempId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="goal-item-container">
      <GoalCard
        goal={goal}
        onEdit={onEditGoal}
        dragAttributes={attributes}
        dragListeners={listeners}
      />
    </div>
  );
};

const GoalDisplay = ({ goals, onEditGoal }) => {
  const dispatch = useDispatch();
  
  const [goalOrder, setGoalOrder] = useState(goals.map((g) => g._id || g.tempId));

  useEffect(() => {
    setGoalOrder(goals.map((g) => g._id || g.tempId));
  }, [goals]);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;

    const oldIndex = goalOrder.indexOf(active.id);
    const newIndex = goalOrder.indexOf(over.id);


    const newOrder = arrayMove(goalOrder, oldIndex, newIndex);
    setGoalOrder(newOrder);
    
    // Map with new .order fields
    const reorderedGoals = newOrder.map((id, index) => {
      const goal = goals.find(g => (g._id || g.tempId) === id);
      return { ...goal, order: index };
    });
    
    dispatch(reorderGoalsOptimistic(reorderedGoals));
    dispatch(bulkReorderGoals(reorderedGoals));  };

  return (
    <div className="goal-display-container">
      <div className="goal-display-header">
        <div className="section-header">Goals / Habits</div>
        <Button icon="plus" text="New Goal" minimal onClick={() => onEditGoal(null)} />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={goalOrder} strategy={rectSortingStrategy}>
          <div className="goals-container">
            {goalOrder.map((goalId) => {
              const goal = goals.find((g) => (g._id || g.tempId) === goalId);
              return goal ? (
                <SortableGoal key={goalId} goal={goal} onEditGoal={onEditGoal} />
              ) : null;
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default GoalDisplay;