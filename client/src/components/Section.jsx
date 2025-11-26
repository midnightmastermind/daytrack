import React from "react";

const Section = ({ className = "", label, labelSize = "small", children, flexDirection = "row" }) => {
  return (
    <div className={`form-section ${className}`}>
      {label && <div className={`form-section-header ${labelSize}`}>{label}</div>}
      <div className="form-section-body" style={{flexDirection: flexDirection}}>{children}</div>
    </div>
  );
};

export default Section;
