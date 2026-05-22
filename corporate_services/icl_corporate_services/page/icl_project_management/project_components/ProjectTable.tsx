import React from "react";
import { ProjectRow } from "./types";
import { useProjects } from "./hooks/useProjects";
import { ProjectChartCard } from "./ProjectCharts";

const STATUS_INDICATOR: Record<string, string> = {
  Open: "blue",
  Completed: "green",
  Cancelled: "red",
};
const TONE_LABELS: Record<"green" | "amber" | "red", string> = {
  green: "Completed",
  amber: "Open",
  red: "Cancelled",
};

const STATUSES = ["Open", "Completed", "Cancelled"];

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-muted">-</span>;
  const color = STATUS_INDICATOR[status] ?? "gray";
  return (
    <span className={`indicator-pill ${color}`} style={{ fontSize: 12 }}>
      <span>{status}</span>
    </span>
  );
}

function ProgressBar({ value }: { value?: number }) {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 80 }}>
      <div className="pm-progress-bar-track" style={{ flex: 1 }}>
        <div className="pm-progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span style={{ fontSize: 11, color: "var(--text-muted, #6c757d)", flexShrink: 0 }}>
        {pct}%
      </span>
    </div>
  );
}

function formatDate(date?: string) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatHours(hours?: number) {
  if (hours == null) return "-";
  return Number(hours).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function toneBadgeClass(tone?: string) {
  if (tone === "green") return "green";
  if (tone === "red") return "red";
  return "orange";
}

interface ProjectTableProps {
  onOpen: (id: string) => void;
}

export function ProjectTable({ onOpen }: ProjectTableProps) {
  const {
    projects,
    rawProjects,
    total,
    charts,
    statusCounter,
    thisWeek,
    loading,
    error,
    page,
    totalPages,
    search,
    statusFilter,
    setPage,
    handleSearch,
    handleStatusFilter,
    toneFilter,
    setToneFilter,
    refresh,
  } = useProjects();

  return (
    <div className="pm-fade-in">
      {/* -- Toolbar -- */}
      <div className="pm-toolbar">
        <div className="pm-search-wrap">
          <span className="pm-search-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <select
          className="form-control form-control-sm"
          style={{ width: "auto", minWidth: 140 }}
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <button
          type="button"
          className="btn btn-default btn-sm"
          onClick={refresh}
          disabled={loading}
          title="Refresh"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>

        <span className="text-muted" style={{ fontSize: 12, marginLeft: "auto" }}>
          {loading ? "Loading…" : `${projects.length} of ${rawProjects.length} record${rawProjects.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* -- Error -- */}
      {error && (
        <div className="alert alert-danger" style={{ fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10, marginBottom: 12 }}>
        {(["green", "amber", "red"] as const).map((tone) => {
          const active = toneFilter === tone;
          return (
            <button
              key={tone}
              type="button"
              className="frappe-card"
              onClick={() => setToneFilter(active ? "" : tone)}
              style={{
                padding: "12px 14px",
                textAlign: "left",
                border: active ? "1px solid var(--primary)" : "1px solid var(--border-color)",
                background: active ? "var(--control-bg)" : "var(--card-bg)",
              }}
            >
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{TONE_LABELS[tone]} Projects</div>
              <div style={{ fontSize: 26, fontWeight: 700, marginTop: 2 }}>{statusCounter?.[tone] ?? 0}</div>
            </button>
          );
        })}
      </div>

      <div className="frappe-card" style={{ padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>This Week at a Glance</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Status Reports Due This Week</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{thisWeek?.status_reports_due_this_week ?? 0}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Milestones Due Next 7 Days</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{thisWeek?.milestones_due_next_7_days ?? 0}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10, marginBottom: 14 }}>
        {projects
          .filter((p) => (p.status || "").toLowerCase() !== "completed")
          .map((p) => (
            <div
              key={`card-${p.name}`}
              className="frappe-card"
              onClick={() => onOpen(p.name)}
              style={{ padding: "12px 14px", cursor: "pointer", border: "1px solid var(--border-color)" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 600 }}>{p.project_name || p.name}</div>
                <span className={`indicator-pill ${toneBadgeClass(p.status_tone)}`} style={{ fontSize: 11 }}>
                  <span>{p.status || p.status_tone_label || "Open"}</span>
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                Client: {p.customer || "-"}
              </div>
              <div style={{ fontSize: 12, marginTop: 8 }}>Phase: {p.lifecycle_phase || "-"}</div>
              <div style={{ fontSize: 12 }}>Complete: {p.percent_complete ?? 0}%</div>
              <div style={{ fontSize: 12 }}>
                Next Milestone: {p.next_milestone_name || "-"}
                {p.next_milestone_due_date ? ` (${formatDate(p.next_milestone_due_date)})` : ""}
              </div>
              <div style={{ fontSize: 12 }}>
                Days to Contract End: {p.days_to_contract_end == null ? "-" : p.days_to_contract_end}
              </div>
            </div>
          ))}
      </div>

      <div className="pm-charts-grid">
        <ProjectChartCard
          title="Timesheet Hours by Project"
          items={(charts?.timesheet_hours_by_project ?? []).map((item) => ({
            label: item.project,
            value: Number(item.total_hours || 0),
          }))}
          emptyText="No linked timesheets found for the current project selection."
          onItemClick={onOpen}
          valueFormatter={(value) => `${formatHours(value)} hrs`}
        />

        <ProjectChartCard
          title="Travel Requests by Project"
          items={(charts?.travel_requests_by_project ?? []).map((item) => ({
            label: item.project,
            value: Number(item.count || 0),
          }))}
          emptyText="No linked travel requests found for the current project selection."
          onItemClick={onOpen}
        />
      </div>

      {/* -- Table -- */}
      <div className="pm-table-wrap">
        <table className="table table-hover pm-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Project Name</th>
              <th>Status</th>
              <th>% Complete</th>
              <th>Customer</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Priority</th>
              <th>Timesheets</th>
              <th>Hours</th>
              <th>Travel Requests</th>
              <th>Opportunity Bid</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12} className="text-center text-muted" style={{ padding: "32px 0" }}>
                  <div className="spinner-border spinner-border-sm text-muted" role="status" />
                  <span className="ml-2">Loading…</span>
                </td>
              </tr>
            ) : projects.length === 0 ? (
              <tr>
                <td colSpan={12}>
                  <div className="pm-empty">
                    <div className="pm-empty-icon">📋</div>
                    <div style={{ fontWeight: 500 }}>No projects found</div>
                    <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {search || statusFilter
                        ? "Try adjusting your search or filter"
                        : "Create a new project to get started"}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              projects.map((proj: ProjectRow) => (
                <tr key={proj.name} onClick={() => onOpen(proj.name)}>
                  <td>
                    <a
                      className="pm-proj-link"
                      onClick={(e) => { e.stopPropagation(); onOpen(proj.name); }}
                      href="#"
                    >
                      {proj.name}
                    </a>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, lineHeight: 1.3 }}>
                      {proj.project_name || proj.name}
                    </div>
                  </td>
                  <td><StatusBadge status={proj.status} /></td>
                  <td><ProgressBar value={proj.percent_complete} /></td>
                  <td>{proj.customer || <span className="text-muted">-</span>}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDate(proj.expected_start_date)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDate(proj.expected_end_date)}</td>
                  <td>{proj.priority || <span className="text-muted">-</span>}</td>
                  <td>{proj.timesheet_count ?? 0}</td>
                  <td>{formatHours(proj.total_timesheet_hours ?? 0)}</td>
                  <td>{proj.travel_request_count ?? 0}</td>
                  <td>
                    {proj.custom_bid ? (
                      <a
                        className="pm-proj-link"
                        href="#"
                        onClick={(e) => {
                          e.stopPropagation();
                          (globalThis as any).frappe?.set_route(
                            "icl-opportunity-module",
                            proj.custom_bid
                          );
                        }}
                      >
                        {proj.custom_bid}
                      </a>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* -- Pagination -- */}
      {totalPages > 1 && (
        <div className="pm-pagination">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="pm-pagination-btns">
            <button
              type="button"
              className="btn btn-default btn-xs"
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              ‹ Prev
            </button>
            <button
              type="button"
              className="btn btn-default btn-xs"
              disabled={page >= totalPages || loading}
              onClick={() => setPage(page + 1)}
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
