"use client";

import { useState } from "react";

export default function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="tooltip-wrap">
      <span
        className="tooltip-icon"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        role="button"
        aria-label="用語解説"
      >
        ?
      </span>
      {open && <span className="tooltip-bubble">{text}</span>}
    </span>
  );
}
