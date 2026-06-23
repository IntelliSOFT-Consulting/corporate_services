import React from "react";

interface Props {
  title: string;
  count?: number;
  countLabel?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function SectionCard({
  title,
  count,
  countLabel = "record",
  right,
  children,
  style,
}: Props) {
  return (
    <div
      className="frappe-card"
      style={{ padding: "16px 20px", marginBottom: 16, ...style }}
    >
      <div className="pm-list-section-header">
        <h6 className="pm-section-title" style={{ marginBottom: 0 }}>
          {title}
        </h6>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {count != null && (
            <span className="text-muted" style={{ fontSize: 12 }}>
              {count} {countLabel}
              {count === 1 ? "" : "s"}
            </span>
          )}
          {right}
        </div>
      </div>
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}
