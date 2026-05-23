import React from "react";
import { useProjects } from "./hooks/useProjects";
import { ProjectChartCard } from "./ProjectCharts";
import { ProjectsTable } from "./Tables/Projects";

const TONE_LABELS: Record<"green" | "amber" | "red", string> = {
  green: "Completed",
  amber: "Open",
  red: "Cancelled",
};

const STATUSES = ["Open", "Completed", "Cancelled"];

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

export function Project({ onOpen }: ProjectTableProps) {
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
      </div>

      <ProjectsTable
        projects={projects}
        loading={loading}
        search={search}
        statusFilter={statusFilter}
        page={page}
        totalPages={totalPages}
        onOpen={onOpen}
        onSearchChange={handleSearch}
        onPageChange={setPage}
      />
    </div>
  );
}
