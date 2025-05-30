// components/TaskIcon.jsx
import { Icon } from "@blueprintjs/core";

export default function TaskIcon({ icon }) {
  if (!icon || !icon.type || !icon.value) return null;

  if (icon.type === "emoji") {
    return <span style={{ fontSize: "1rem" }}>{icon.value}</span>;
  }

  if (icon.type === "icon") {
    return <Icon icon={icon.value} iconSize={18} />;
  }

  return null;
}
