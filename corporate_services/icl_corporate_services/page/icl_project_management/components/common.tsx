import React, { useState } from "react";

export function Metric({
  label,
  value,
  onClick,
  active,
}: {
  label: string;
  value: string | number;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <div className="col-md-3 mb-3">
      <div
        className="card border h-100"
        onClick={onClick}
        style={{
          cursor: onClick ? "pointer" : undefined,
          borderColor: active ? "var(--primary, #5e64ff)" : undefined,
          boxShadow: active ? "0 0 0 1px var(--primary, #5e64ff)" : undefined,
        }}
      >
        <div className="card-body">
          <div className="text-muted" style={{ fontSize: 12 }}>
            {label}
          </div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{value}</div>
        </div>
      </div>
    </div>
  );
}

export function LoadingBox() {
  return <div className="ipm-dash-loading">Loading...</div>;
}
export function ErrorBox({ msg }: { msg: string }) {
  return <div className="alert alert-danger mb-0">{msg}</div>;
}

export const PRIORITY_COLOR: Record<string, string> = { High: "#dc3545", Medium: "#fd7e14", Low: "#28a745", "Not set": "#adb5bd" };
export const STATE_COLOR: Record<string, string> = {
  Approved: "#28a745", Rejected: "#dc3545",
  "Submitted to Supervisor": "#fd7e14", "Needs Clarification": "#ffc107", Draft: "#adb5bd",
};

const PAGE_SIZE = 25;

export function FilterableTable<T extends Record<string, any>>({
  title,
  rows,
  columns,
  filterKeys,
}: {
  title: string;
  rows: T[];
  columns: { label: string; key: keyof T; render?: (v: any, row: T) => React.ReactNode }[];
  filterKeys: (keyof T)[];
}) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filtered = query.trim()
    ? rows.filter((r) =>
        filterKeys.some((k) =>
          String(r[k] ?? "").toLowerCase().includes(query.toLowerCase())
        )
      )
    : rows;

  const visible = showAll ? filtered : filtered.slice(0, PAGE_SIZE);
  const hidden = filtered.length - visible.length;

  return (
    <div className="card border mb-3">
      <div className="card-header bg-light d-flex justify-content-between align-items-center flex-wrap" style={{ gap: 8 }}>
        <strong style={{ fontSize: 13 }}>{title} ({filtered.length}{filtered.length !== rows.length ? ` of ${rows.length}` : ""})</strong>
        <input
          className="form-control form-control-sm"
          style={{ maxWidth: 220 }}
          placeholder="Filter..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowAll(false); }}
        />
      </div>
      <div className="table-responsive">
        <table className="table table-sm mb-0" style={{ fontSize: 12 }}>
          <thead className="thead-light">
            <tr>
              {columns.map((c) => <th key={String(c.key)}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={columns.length} className="text-muted text-center py-3">No matching records.</td></tr>
            ) : visible.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={String(c.key)}>
                    {c.render ? c.render(row[c.key], row) : (row[c.key] ?? <span className="text-muted">-</span>)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(hidden > 0 || showAll) && (
        <div className="card-footer bg-white text-center" style={{ fontSize: 12 }}>
          {showAll ? (
            <button className="btn btn-link btn-sm p-0" onClick={() => setShowAll(false)}>
              Show fewer
            </button>
          ) : (
            <button className="btn btn-link btn-sm p-0" onClick={() => setShowAll(true)}>
              Show {hidden} more row{hidden !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
