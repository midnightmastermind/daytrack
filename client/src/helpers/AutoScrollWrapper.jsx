import React, { useEffect, useRef } from "react";

const AutoScrollWrapper = ({ children, speed = 0.5, className = "" }) => {
  const containerRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scroll = () => {
      container.scrollLeft += speed;

      // When fully scrolled, go back to start
      if (container.scrollLeft >= container.scrollWidth - container.clientWidth) {
        container.scrollLeft = 0;
      }

      rafRef.current = requestAnimationFrame(scroll);
    };

    rafRef.current = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(rafRef.current);
  }, [speed]);

  return (
    <div
      ref={containerRef}
      className={`scroll-parent ${className}`}
    >
      <div
        className="scroll-inner"
        style={{
          display: "flex",
          flexWrap: "nowrap",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default AutoScrollWrapper;
