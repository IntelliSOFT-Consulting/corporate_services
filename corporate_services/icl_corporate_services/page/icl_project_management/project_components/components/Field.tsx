import React from "react";

export function Field({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  const isEmpty = value == null || value === "";
  return (
    <div>
      <div className="pm-field-label">{label}</div>
      <div className={`pm-field-value${isEmpty ? " empty" : ""}`}>
        {isEmpty ? "-" : value}
      </div>
    </div>
  );
}
