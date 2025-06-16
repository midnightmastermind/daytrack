import React, { useState, useEffect, useCallback } from "react";
import { Button, Popover, InputGroup, HTMLSelect, Intent } from "@blueprintjs/core";

const PlanTemplateManager = ({
  assignments,
  setAssignments,
  allDayPlans,
  savePlanTemplate,
  updatePlanTemplate,
  deletePlanTemplate,
  currentTemplate,
  setCurrentTemplate,
}) => {
  const [nameInput, setNameInput] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Sync nameInput when a new template is selected
  useEffect(() => {
    if (currentTemplate?.name) {
      setNameInput(currentTemplate.name);
    } else {
      setNameInput("");
    }
  }, [currentTemplate]);

  const handleSave = async () => {
    if (currentTemplate) {
      await updatePlanTemplate(currentTemplate._id, assignments);
    } else {
      await savePlanTemplate(nameInput, assignments);
    }
    setIsPopoverOpen(false); // ✅ Close here
  };

  const handleLoad = (id) => {
    const selected = allDayPlans.find((plan) => plan._id === id);
    if (!selected) return;

    const updated = {};
    (selected.plan || []).forEach((entry) => {
      updated[entry.timeSlot] = entry.assignedTasks || [];
    });

    setAssignments(updated);
    setCurrentTemplate(selected); // triggers useEffect to sync input
  };

  const handleDelete = async () => {
    if (!currentTemplate) return;
    await deletePlanTemplate(currentTemplate._id);
    setCurrentTemplate(null);
    setAssignments({});
  };

  // 👇 Define this outside the main JSX return
  const SavePopoverContent = useCallback(() => (
    <div className="template-popover" style={{ display: "flex", gap: "0.5rem", padding: "0.5rem" }}>
      <InputGroup
        autoFocus
        value={nameInput}
        onChange={(e) => setNameInput(e.target.value)}
        placeholder="Plan name"
      />
      <Button
        icon="floppy-disk"
        text={currentTemplate ? "Update" : "Save"}
        onClick={handleSave}
        intent={Intent.PRIMARY}
        disabled={!nameInput.trim()}
      />
    </div>
  ), [nameInput, currentTemplate]);

  return (
    <div className="plan-template-header" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <HTMLSelect
        value={currentTemplate?._id || ""}
        onChange={(e) => handleLoad(e.target.value)}
      >
        <option value="">Select Plan Template</option>
        {allDayPlans.map((plan) => (
          <option key={plan._id} value={plan._id}>
            {plan.name}
          </option>
        ))}
      </HTMLSelect>

      <Popover
        content={<SavePopoverContent />}
        isOpen={isPopoverOpen}
        onClose={() => setIsPopoverOpen(false)}
        interactionKind="click"
        minimal
        enforceFocus={false} // ✅ this helps avoid focus flicker
      >
        <Button
          icon="floppy-disk"
          minimal
          onClick={() => setIsPopoverOpen(true)}
        />
      </Popover>

      <Button
        icon="trash"
        minimal
        intent={Intent.DANGER}
        disabled={!currentTemplate}
        onClick={handleDelete}
      />
    </div>
  );
};

export default PlanTemplateManager;
