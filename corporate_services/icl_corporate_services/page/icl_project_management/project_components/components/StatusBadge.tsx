import React from "react";

const STATUS_INDICATOR: Record<string, string> = {
  Open: "blue",
  Completed: "green",
  Cancelled: "red",
};

export function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-muted">-</span>;
  const color = STATUS_INDICATOR[status] ?? "gray";
  return (
    <span className={`indicator-pill ${color}`} style={{ fontSize: 12 }}>
      <span>{status}</span>
    </span>
  );
}
