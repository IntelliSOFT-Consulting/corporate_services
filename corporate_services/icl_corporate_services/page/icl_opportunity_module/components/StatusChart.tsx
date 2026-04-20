import React, { useEffect, useState } from "react";
import { useOpportunityStats } from "./hooks/useOpportunityStats";
import { StatusStat } from "./hooks/useOpportunityStats";

const STATUS_COLORS: Record<string, string> = {
  Open: "#5e64ff",
  Replied: "#ff8f07",
  Quotation: "#f5a623",
  "Lost Quotation": "#e74c3c",
  Interested: "#28a745",
  Converted: "#00b894",
  "Do Not Contact": "#b2bec3",
};

const FALLBACK_COLORS = [
  "#5e64ff", "#36b37e", "#ff8b00", "#0065ff",
  "#ff5630", "#6554c0", "#00b8d9", "#b2bec3",
];

function getColor(status: string, index: number) {
  return STATUS_COLORS[status] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

// ── Donut SVG ────────────────────────────────────────────────────────────────

interface DonutProps {
  slices: { value: number; color: string }[];
  total: number;
  animated: boolean;
}

function DonutChart({ slices, total, animated }: DonutProps) {
  const R = 54;
  const CX = 64;
  const CY = 64;
  const circumference = 2 * Math.PI * R;

  let offset = 0;
  const paths = slices.map((s, i) => {
    const fraction = total > 0 ? s.value / total : 0;
    const dash = fraction * circumference;
    const gap = circumference - dash;
    const rotation = (offset / total) * 360 - 90;
    offset += s.value;

    return (
      <circle
        key={i}
        cx={CX}
        cy={CY}
        r={R}
        fill="none"
        stroke={s.color}
        strokeWidth={18}
        strokeDasharray={`${animated ? dash : 0} ${gap}`}
        strokeDashoffset={0}
        transform={`rotate(${rotation} ${CX} ${CY})`}
        style={{ transition: animated ? "stroke-dasharray 0.6s ease" : "none" }}
      />
    );
  });

  return (
    <svg viewBox="0 0 128 128" className="om-donut-svg">
      {/* Track */}
      <circle
        cx={CX} cy={CY} r={R}
        fill="none"
        stroke="var(--border-color, #e9ecef)"
        strokeWidth={18}
      />
      {paths}
      {/* Centre label */}
      <text x={CX} y={CY - 6} textAnchor="middle" className="om-donut-total-num">
        {total}
      </text>
      <text x={CX} y={CY + 12} textAnchor="middle" className="om-donut-total-label">
        Total
      </text>
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  onStatusClick: (status: string) => void;
}

export function StatusChart({ onStatusClick }: Props) {
  const { stats, loading, error } = useOpportunityStats();
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

  if (error || !stats || stats.by_status.length === 0) return null;

  const slices = stats.by_status.map((s: StatusStat, i: number) => ({
    value: s.count,
    color: getColor(s.status, i),
  }));

  return (
    <div className="frappe-card om-chart-card om-fade-in">
      <div className="om-chart-header">
        <span className="om-section-title" style={{ marginBottom: 0 }}>
          Opportunities by Status
        </span>
      </div>

      <div className="om-chart-body">
        {/* Donut */}
        <div className="om-donut-wrap">
          <DonutChart slices={slices} total={stats.total} animated={animated} />
        </div>

        {/* Breakdown bars */}
        <div className="om-chart-bars">
          {stats.by_status.map((s: StatusStat, i: number) => {
            const color = getColor(s.status, i);
            const pct = stats.total > 0 ? Math.round((s.count / stats.total) * 100) : 0;
            const relPct = Math.round(
              (s.count / Math.max(...stats.by_status.map((x) => x.count), 1)) * 100
            );

            return (
              <div
                key={s.status}
                className="om-chart-bar-row"
                onClick={() => onStatusClick(s.status)}
                title={`Filter by: ${s.status}`}
              >
                <div className="om-chart-bar-label-row">
                  <span className="om-chart-bar-dot" style={{ background: color }} />
                  <span className="om-chart-bar-name">{s.status}</span>
                  <span className="om-chart-bar-count">
                    {s.count}
                    <span className="om-chart-bar-pct"> ({pct}%)</span>
                  </span>
                </div>
                <div className="om-chart-bar-track">
                  <div
                    className="om-chart-bar-fill"
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
    </div>
  );
}
