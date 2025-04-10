// === TaskDisplay.jsx ===
import React from "react";
import { Card, CardList, Elevation, Tag } from "@blueprintjs/core";
import { useSelector } from "react-redux";

const extractChains = (task) => {
  const ancestry = task.assignmentAncestry;
  if (Array.isArray(ancestry) && ancestry.length > 0) {
    const chain = ancestry.map((node, index, arr) => {
      const isInput = node.properties?.input && node.values?.input?.trim() !== "";
      const label = isInput ? `${node.name}: ${node.values.input.trim()}` : node.name || "(unnamed)";

      return {
        key: node._id || node.id || label,
        name: label,
        intent: index === arr.length - 1 ? "primary" : "none",
        minimal: index !== arr.length - 1,
      };
    });
    return chain.length > 0 ? [chain] : [];
  }

  const isInput = task.properties?.input && task.values?.input?.trim() !== "";
  const isCheckbox = task.properties?.checkbox && task.values?.checkbox;
  const isCard = task.properties?.card;
  const isSelected = isInput || isCheckbox || isCard;

  if (!isSelected) return [];

  const label = isInput ? `${task.name}: ${task.values.input.trim()}` : task.name || "(unnamed)";

  return [[{
    key: task._id || task.id || label,
    name: label,
    intent: "primary",
    minimal: false,
  }]];
};

const groupChains = (chains) => {
  const grouped = {};
  for (const chain of chains) {
    const ancestorKey = chain.slice(0, -1).map((n) => n.key).join(">");
    if (!grouped[ancestorKey]) {
      grouped[ancestorKey] = {
        ancestors: chain.slice(0, -1),
        leaves: [],
      };
    }
    grouped[ancestorKey].leaves.push(chain[chain.length - 1]);
  }
  return Object.values(grouped);
};

const TaskDisplay = ({ timeSlots = [], assignments = {} }) => {
  return (
    <div className="display-container">
      <div className="display-header">Completed Tasks</div>
      <CardList className="display">
        {timeSlots.map((timeSlot) => {
          const tasksForSlot = assignments[timeSlot] || [];
          const flatChains = tasksForSlot.flatMap(extractChains).filter((chain) => chain.length > 0);
          if (flatChains.length === 0) return null;

          const grouped = groupChains(flatChains);

          return (
            <Card key={timeSlot} elevation={Elevation.FOUR} className="display-card">
              <div className="timeslot">
                <strong>{timeSlot}</strong>
              </div>
              <div className="task-tags-completed">
                {grouped.map(({ ancestors, leaves }, index) => (
                  <div key={index} className="tag-chain">
                    {ancestors.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", marginBottom: "2px" }}>
                        {ancestors.map((tag) => (
                          <Tag
                            key={`${tag.key}-${index}`}
                            minimal
                            intent={tag.intent}
                            style={{ marginRight: "5px", marginBottom: "5px" }}
                          >
                            {tag.name}
                          </Tag>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", flexWrap: "wrap" }}>
                      {leaves.map((leaf) => (
                        <Tag
                          key={`${leaf.key}-${timeSlot}-${index}`}
                          intent={leaf.intent}
                          minimal={false}
                          style={{ marginRight: "5px", marginBottom: "8px" }}
                        >
                          {leaf.name}
                        </Tag>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </CardList>
    </div>
  );
};

export default TaskDisplay;
