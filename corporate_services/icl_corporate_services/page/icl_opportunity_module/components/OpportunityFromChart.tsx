import React, { useEffect, useState } from "react";
import { useOpportunityStats } from "./hooks/useOpportunityStats";
import { FromStat } from "./hooks/useOpportunityStats";

const BAR_COLORS = [
  "#0065ff",
  "#36b37e",
  "#ff8b00",
  "#6554c0",
  "#00b8d9",
  "#ff5630",
  "#b2bec3",
];

// ── Donut SVG (shared shape, same as StatusChart) ────────────────────────────

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
        cx={CX} cy={CY} r={R}
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
      <circle cx={CX} cy={CY} r={R} fill="none"
        stroke="var(--border-color, #e9ecef)" strokeWidth={18} />
      {paths}
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
  onFromClick: (from: string) => void;
}

export function OpportunityFromChart({ onFromClick }: Props) {
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

  const rows = stats?.by_opportunity_from ?? [];
  if (rows.length === 0) return null;

  const total = rows.reduce((s: number, r: FromStat) => s + r.count, 0);
  const slices = rows.map((r: FromStat, i: number) => ({
    value: r.count,
    color: BAR_COLORS[i % BAR_COLORS.length],
  }));
  const maxCount = Math.max(...rows.map((r: FromStat) => r.count), 1);

  return (
    <div className="frappe-card om-chart-card om-fade-in">
      <div className="om-chart-header">
        <span className="om-section-title" style={{ marginBottom: 0 }}>
          Opportunities by Source Type
        </span>
      </div>

      <div className="om-chart-body">
        <div className="om-donut-wrap">
          <DonutChart slices={slices} total={total} animated={animated} />
        </div>

        <div className="om-chart-bars">
          {rows.map((r: FromStat, i: number) => {
            const color = BAR_COLORS[i % BAR_COLORS.length];
            const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
            const relPct = Math.round((r.count / maxCount) * 100);
            const label = r.opportunity_from || "Unknown";

            return (
              <div
                key={label}
                className="om-chart-bar-row"
                onClick={() => onFromClick(r.opportunity_from)}
                title={`Filter by: ${label}`}
              >
                <div className="om-chart-bar-label-row">
                  <span className="om-chart-bar-dot" style={{ background: color }} />
                  <span className="om-chart-bar-name">{label}</span>
                  <span className="om-chart-bar-count">
                    {r.count}
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
