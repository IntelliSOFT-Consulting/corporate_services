import React from "react";
import { useTurnoverStats } from "./hooks/useTurnoverStats";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface Props {
  year: number;
}

export function TurnoverChart({ year }: Props) {
  const { stats, loading } = useTurnoverStats(year);

  if (loading || !stats) return null;

  const data = MONTH_LABELS.map((label, idx) => {
    const entry = stats.monthly_breakdown.find((m) => m.month === idx + 1);
    return { label, cnt: entry?.cnt || 0 };
  });

  const maxVal = Math.max(...data.map((d) => d.cnt), 1);
  const totalExits = data.reduce((s, d) => s + d.cnt, 0);

  if (totalExits === 0) return null;

  return (
    <div className="frappe-card et-chart-card et-fade-in">
      <h6 className="et-section-title">Monthly Exits - {year}</h6>
      <div className="et-month-chart">
        {data.map(({ label, cnt }) => {
          const heightPct = Math.round((cnt / maxVal) * 100);
          return (
            <div key={label} className="et-month-col" title={`${label}: ${cnt} exit${cnt !== 1 ? "s" : ""}`}>
              <div className="et-month-bar-wrap">
                <div
                  className="et-month-bar"
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <div className="et-month-label">{label}</div>
              {cnt > 0 && <div className="et-month-cnt">{cnt}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
