import React, { useEffect, useState } from "react";
import { Button, InputGroup } from "@blueprintjs/core";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./Notebook.css";

function Notebook({ selectedDate, initialText = "", onSave, onDelete }) {
  const [text, setText] = useState(initialText);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setText(initialText);
  }, [initialText, selectedDate]);

  const handleSave = () => {
    onSave(text);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm("Delete this notebook entry?")) {
      onDelete();
      setText("");
      setIsEditing(true);
    }
  };

  return (
    <div className="notebook-container">
      <div className="notebook-toolbar">
        <div className="notebook-title">
          Notebook — {selectedDate.toDateString()}
        </div>
        <div>
          <Button icon="floppy-disk" onClick={handleSave} minimal title="Save" />
          <Button icon="trash" onClick={handleDelete} minimal title="Delete" intent="danger" />
          <Button
            icon={isEditing ? "eye-open" : "edit"}
            onClick={() => setIsEditing((prev) => !prev)}
            minimal
            title={isEditing ? "Preview" : "Edit"}
          />
        </div>
      </div>

      <div className="notebook-body">
        {isEditing ? (
          <textarea
            className="notebook-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="# Start typing..."
          />
        ) : (
          <div className="notebook-preview">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default Notebook;