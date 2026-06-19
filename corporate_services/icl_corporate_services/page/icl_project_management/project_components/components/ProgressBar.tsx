import React from "react";

export function ProgressBar({ value }: { value?: number }) {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  return (
    <div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: "var(--text-color, #333)",
        }}
      >
        {pct}%
      </div>
      <div className="pm-progress-bar-track" style={{ marginTop: 8 }}>
        <div className="pm-progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
