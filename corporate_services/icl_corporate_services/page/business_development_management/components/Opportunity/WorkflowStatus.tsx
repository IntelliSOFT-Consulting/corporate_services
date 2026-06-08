import React from "react";
import type { WorkflowStateInfo } from "./types";

// Maps the color key from the API to Frappe indicator + hex values
const COLOR_MAP: Record<string, { indicator: string; hex: string; light: string }> = {
  green:  { indicator: "green",  hex: "#28a745", light: "#d4edda" },
  red:    { indicator: "red",    hex: "#e74c3c", light: "#f8d7da" },
  orange: { indicator: "orange", hex: "#ff8f07", light: "#fff3cd" },
  blue:   { indicator: "blue",   hex: "#5e64ff", light: "#e8eaff" },
  gray:   { indicator: "gray",   hex: "#adb5bd", light: "#f4f5f7" },
  dark:   { indicator: "dark",   hex: "#495057", light: "#e9ecef" },
};

function getColors(color: string) {
  return COLOR_MAP[color] ?? COLOR_MAP.gray;
}

interface Props {
  states: WorkflowStateInfo[];
  currentState?: string;
}

export function WorkflowStatus({ states, currentState }: Props) {
  if (!states || states.length === 0) return null;

  const activeIndex = states.findIndex((s) => s.state === currentState);

  return (
    <div className="frappe-card om-card om-workflow-card">
      <div className="om-section-title">WORKFLOW STATUS</div>

      {/* Current state pill - mirrors Frappe form's workflow badge */}
      {currentState && activeIndex >= 0 && (
        <div className="om-workflow-current">
          <span
            className={`indicator-pill ${states[activeIndex].color}`}
            style={{ fontSize: 13, padding: "4px 12px" }}
          >
            <span>{currentState}</span>
          </span>
        </div>
      )}

      {/* Stepper track */}
      <div className="om-workflow-stepper">
        {states.map((s, i) => {
          const c = getColors(s.color);
          const isDone = activeIndex >= 0 && i < activeIndex;
          const isActive = s.state === currentState;
          const isFuture = activeIndex >= 0 && i > activeIndex;

          return (
            <div key={s.state} className="om-workflow-step">
              {/* Connector line before this step */}
              {i > 0 && (
                <div
                  className="om-workflow-line"
                  style={{
                    background: isDone || isActive ? c.hex : "var(--border-color, #dee2e6)",
                  }}
                />
              )}

              {/* Circle node */}
              <div
                className={`om-workflow-node${isActive ? " active" : ""}${isDone ? " done" : ""}`}
                style={{
                  background: isActive ? c.hex : isDone ? c.hex : "var(--bg-color,#fff)",
                  borderColor: isFuture ? "var(--border-color,#dee2e6)" : c.hex,
                  color: isActive || isDone ? "#fff" : "var(--text-muted,#6c757d)",
                }}
                title={s.state}
              >
                {isDone ? (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                ) : (
                  <span className="om-workflow-node-num">{i + 1}</span>
                )}
              </div>

              {/* Label below */}
              <div
                className="om-workflow-label"
                style={{
                  color: isFuture
                    ? "var(--text-muted, #adb5bd)"
                    : isActive
                    ? c.hex
                    : "var(--text-color, #333)",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {s.state}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
