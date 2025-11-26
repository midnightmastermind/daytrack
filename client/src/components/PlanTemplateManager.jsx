import React, { useState, useEffect, useCallback } from "react";
import { Button, Popover, InputGroup, HTMLSelect, Intent } from "@blueprintjs/core";

const PlanTemplateManager = ({
  assignments,
  setAssignments,
  saveAssignments,
  allDayPlans,
  savePlanTemplate,
  updatePlanTemplate,
  deletePlanTemplate,
  currentTemplate,
  setCurrentTemplate,
}) => {
  const [nameInput, setNameInput] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  useEffect(() => {
    if (currentTemplate?.name) {
      setNameInput(currentTemplate.name);
      setSelectedTemplateId(currentTemplate._id);
    } else {
      setNameInput("");
      setSelectedTemplateId("");
    }
  }, [currentTemplate]);

  const handleSaveTemplate = async () => {
    const nonTempAssignments = {};
    for (const slot in assignments) {
      nonTempAssignments[slot] = assignments[slot].filter(
        (task) => !(task.properties?.temp)
      );
    }

    if (currentTemplate) {
      await updatePlanTemplate(currentTemplate._id, nonTempAssignments);
    } else {
      await savePlanTemplate(nameInput, nonTempAssignments);
    }

    setIsPopoverOpen(false);
  };

  const handleLoadTemplate = (id) => {
    setSelectedTemplateId(id);
    const selected = allDayPlans.find((plan) => plan._id === id);
    if (!selected) return;

    setCurrentTemplate(selected);

    const updated = { ...assignments };
    (selected.plan || []).forEach((entry) => {
      const existing = updated[entry.timeSlot] || [];
      const existingIds = new Set(existing.map((t) => t.assignmentId));

      const newTempTasks = (entry.assignedTasks || [])
        .filter((t) => !existingIds.has(t.assignmentId))
        .map((t) => ({
          ...t,
          properties: {
            ...(t.properties || {}),
            temp: true,
          },
        }));

      updated[entry.timeSlot] = [...existing, ...newTempTasks];
    });

    setAssignments(updated);
  };

  const handleConfirmTemplateTasks = async () => {
    const confirmed = {};
    for (const slot in assignments) {
      confirmed[slot] = assignments[slot].map((task) => ({
        ...task,
        properties: {
          ...(task.properties || {}),
          temp: false,
        },
      }));
    }

    setAssignments(confirmed);
    await saveAssignments(confirmed);
    setSelectedTemplateId("");
    setCurrentTemplate(null);
  };

  const handleDeleteTemplate = async () => {
    if (!currentTemplate) return;
    await deletePlanTemplate(currentTemplate._id);
    setCurrentTemplate(null);
    setAssignments({});
    setSelectedTemplateId("");
    setIsPopoverOpen(false);
  };

  const assignmentsMatchTemplate = () => {
    if (!currentTemplate?.plan) return false;

    const current = {};
    for (const slot in assignments) {
      current[slot] = assignments[slot]
        .filter((t) => !t.properties?.temp)
        .map((t) => t.assignmentId)
        .sort()
        .join(",");
    }

    const template = {};
    currentTemplate.plan.forEach((entry) => {
      template[entry.timeSlot] = (entry.assignedTasks || [])
        .map((t) => t.assignmentId)
        .sort()
        .join(",");
    });

    const allKeys = new Set([...Object.keys(current), ...Object.keys(template)]);
    for (const key of allKeys) {
      if ((current[key] || "") !== (template[key] || "")) return false;
    }

    return true;
  };

  const SavePopoverContent = useCallback(() => (
    <div className="template-popover" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0.5rem" }}>
      <InputGroup
        autoFocus
        value={nameInput}
        onChange={(e) => setNameInput(e.target.value)}
        placeholder="Plan name"
      />
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        <Button
          icon="trash"
          intent={Intent.DANGER}
          minimal
          disabled={!currentTemplate}
          onClick={handleDeleteTemplate}
        />
        <Button
          icon="floppy-disk"
          text={currentTemplate ? "Update" : "Save"}
          onClick={handleSaveTemplate}
          intent={Intent.PRIMARY}
          disabled={!nameInput.trim() || (currentTemplate && assignmentsMatchTemplate())}
        />
      </div>
    </div>
  ), [nameInput, currentTemplate, assignments]);

  return (
    <div className="plan-template-header" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <HTMLSelect
        value={selectedTemplateId}
        onChange={(e) => handleLoadTemplate(e.target.value)}
      >
        <option value="">Select Plan Template</option>
        {allDayPlans.map((plan) => (
          <option key={plan._id} value={plan._id}>
            {plan.name}
          </option>
        ))}
      </HTMLSelect>

      <Button
        icon="plus"
        minimal
        disabled={!selectedTemplateId}
        onClick={handleConfirmTemplateTasks}
        title="Confirm template tasks (save to plan)"
      />

      <Popover
        content={<SavePopoverContent />}
        isOpen={isPopoverOpen}
        onClose={() => setIsPopoverOpen(false)}
        interactionKind="click"
        minimal
        enforceFocus={false}
      >
        <Button
          icon="cog"
          minimal
          onClick={() => setIsPopoverOpen(true)}
          title="Template settings"
        />
      </Popover>
    </div>
  );
};

export default PlanTemplateManager;
