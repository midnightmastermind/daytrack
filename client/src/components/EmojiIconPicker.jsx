import React, { useState } from "react";
import {
  Button,
  Popover,
  Menu,
  Tab,
  Tabs,
  Icon,
  Card,
} from "@blueprintjs/core";
import { emojiCategories, blueprintIconCategories } from "./emojiIconData";

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(36px, 1fr))",
  gap: "6px",
  maxHeight: "200px",
  overflowY: "auto",
  padding: "0.5rem",
};

const EmojiGrid = ({ onSelect }) => (
  <div style={gridStyle}>
    {Object.values(emojiCategories).flat().map((emoji) => (
      <Button
        key={emoji}
        minimal
        large
        style={{ fontSize: "1.2rem" }}
        onClick={() => onSelect({ type: "emoji", value: emoji })}
      >
        {emoji}
      </Button>
    ))}
  </div>
);

const IconGrid = ({ onSelect }) => (
  <div style={gridStyle}>
    {Object.values(blueprintIconCategories).flat().map((iconName, index) => (
      <Button
        key={index}
        minimal
        large
        onClick={() => onSelect({ type: "icon", value: iconName })}
      >
        <Icon icon={iconName} />
      </Button>
    ))}
  </div>
);

const EmojiIconPicker = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  const renderSelected = () => {
    if (!value) return "icon";
    return value.type === "emoji" ? value.value : <Icon icon={value.value} />;
  };

  return (
    <Popover
      isOpen={open}
      onClose={() => setOpen(false)}
      position="bottom"
      minimal
      className="icon-picker-popover"
      content={
        <Card className="icon-picker-container" style={{ width: 240 }}>
          <Tabs id="picker-tabs" defaultSelectedTabId="emoji" fill>
            <Tab
              id="emoji"
              title="😊"
              panel={<EmojiGrid onSelect={handleSelect} />}
            />
            <Tab
              id="icon"
              title={<Icon icon="applications" />}
              panel={<IconGrid onSelect={handleSelect} />}
            />
          </Tabs>
        </Card>
      }
    >
      <Button
        outlined
        minimal
        onClick={() => setOpen(!open)}
        className="icon-picker-button"
        style={{ display: "flex", alignItems: "center", gap: 6 }}
      >
        {renderSelected()}
      </Button>
    </Popover>
  );
};

export default EmojiIconPicker;
