import React, { useEffect, useState } from "react";
import { useOpportunityStats } from "./hooks/useOpportunityStats";
import { WorkflowStat } from "./hooks/useOpportunityStats";

// Match the same semantic colors used in WorkflowStatus stepper
const STATE_COLORS: Record<string, string> = {
  draft:           "#adb5bd",
  submitted:       "#ff8f07",
  approved:        "#28a745",
  rejected:        "#e74c3c",
  cancelled:       "#e74c3c",
  pending:         "#ff8f07",
  open:            "#5e64ff",
};

const FALLBACK_COLORS = [
  "#5e64ff", "#36b37e", "#ff8b00", "#e74c3c",
  "#6554c0", "#00b8d9", "#b2bec3",
];

function resolveColor(state: string, index: number): string {
  const lower = state.toLowerCase();
  const match = Object.entries(STATE_COLORS).find(([k]) => lower.includes(k));
  return match ? match[1] : FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

interface Props {
  onStateClick: (state: string) => void;
}

export function WorkflowStateChart({ onStateClick }: Props) {
  const { stats, loading } = useOpportunityStats();
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (!stats) return;
    const raf = requestAnimationFrame(() => {
      setTimeout(() => setAnimated(true), 40);
    });
    return () => cancelAnimationFrame(raf);
  }, [stats]);

  if (loading) {
    return (
      <div className="frappe-card om-chart-card">
        <div className="om-chart-loading text-muted">Loading chart…</div>
      </div>
    );
  }

  const rows = stats?.by_workflow_state ?? [];
  if (rows.length === 0) return null;

  const total = rows.reduce((s: number, r: WorkflowStat) => s + r.count, 0);
  const maxCount = Math.max(...rows.map((r: WorkflowStat) => r.count), 1);

  return (
    <div className="frappe-card om-chart-card om-fade-in">
      <div className="om-chart-header">
        <span className="om-section-title" style={{ marginBottom: 0 }}>
          Opportunities by Workflow State
        </span>
      </div>

      <div className="om-wf-bar-list">
        {rows.map((r: WorkflowStat, i: number) => {
          const color = resolveColor(r.workflow_state, i);
          const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
          const relPct = Math.round((r.count / maxCount) * 100);
          const label = r.workflow_state || "Unknown";

          return (
            <div
              key={label}
              className="om-wf-bar-row"
              onClick={() => onStateClick(r.workflow_state)}
              title={`Filter by: ${label}`}
            >
              {/* Label + count */}
              <div className="om-wf-bar-meta">
                <span className="om-wf-bar-label">{label}</span>
                <span className="om-wf-bar-count">
                  {r.count}
                  <span className="om-wf-bar-pct"> ({pct}%)</span>
                </span>
              </div>

              {/* Bar track + value label inside */}
              <div className="om-wf-bar-track">
                <div
                  className="om-wf-bar-fill"
                  style={{
                    width: animated ? `${relPct}%` : "0%",
                    background: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
