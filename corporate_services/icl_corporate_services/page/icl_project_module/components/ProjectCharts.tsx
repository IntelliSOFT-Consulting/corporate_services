import React, { useEffect, useState } from "react";

type ChartItem = {
  label: string;
  value: number;
};

type ProjectChartCardProps = {
  title: string;
  items: ChartItem[];
  emptyText: string;
  onItemClick?: (label: string) => void;
  valueFormatter?: (value: number) => string;
};

const COLORS = ["#5e64ff", "#36b37e", "#ff8b00", "#e74c3c", "#00b8d9", "#6554c0", "#6c757d"];

export function ProjectChartCard({
  title,
  items,
  emptyText,
  onItemClick,
  valueFormatter = (value) => String(value),
}: ProjectChartCardProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    const frame = requestAnimationFrame(() => {
      setTimeout(() => setAnimated(true), 40);
    });

    return () => cancelAnimationFrame(frame);
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="frappe-card pm-chart-card">
        <div className="pm-chart-header">
          <span className="pm-section-title" style={{ marginBottom: 0 }}>
            {title}
          </span>
        </div>
        <div className="pm-chart-empty">{emptyText}</div>
      </div>
    );
  }

  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="frappe-card pm-chart-card pm-fade-in">
      <div className="pm-chart-header">
        <span className="pm-section-title" style={{ marginBottom: 0 }}>
          {title}
        </span>
      </div>

      <div className="pm-chart-list">
        {items.map((item, index) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          const relPct = Math.round((item.value / maxValue) * 100);
          const clickable = Boolean(onItemClick);

          return (
            <div
              key={item.label}
              className={`pm-chart-row${clickable ? " clickable" : ""}`}
              onClick={clickable ? () => onItemClick?.(item.label) : undefined}
              title={clickable ? `Open ${item.label}` : item.label}
            >
              <div className="pm-chart-label-row">
                <div className="pm-chart-label-main">
                  <span
                    className="pm-chart-dot"
                    style={{ background: COLORS[index % COLORS.length] }}
                  />
                  <span className="pm-chart-label">{item.label}</span>
                </div>
                <span className="pm-chart-value">
                  {valueFormatter(item.value)}
                  <span className="pm-chart-pct"> ({pct}%)</span>
                </span>
              </div>

              <div className="pm-chart-track">
                <div
                  className="pm-chart-fill"
                  style={{
                    width: animated ? `${relPct}%` : "0%",
                    background: COLORS[index % COLORS.length],
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
