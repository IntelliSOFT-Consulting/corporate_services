import React, { useEffect, useState } from "react";
import { ProjectsTable } from "../project_components/Tables/Projects";
import { Metric } from "./common";
import { ProjectHoursDash } from "./ProjectHoursDash";
import { PortfolioHealthDash } from "./PortfolioHealthDash";
import { DeliveryPipelineDash } from "./DeliveryPipelineDash";
import { OverdueDeliverablesDash } from "./OverdueDeliverablesDash";
import { PmWorkloadDash } from "./PmWorkloadDash";
import { LessonsLearnedTrendsDash } from "./LessonsLearnedTrendsDash";
import { KnowledgeBaseDash } from "./KnowledgeBaseDash";
import { DashboardData } from "./types";

type DashSubTab = "overview" | "portfolio" | "pipeline" | "overdue" | "workload" | "trends" | "kb";

const DASH_SUB_TABS: { key: DashSubTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "portfolio", label: "Portfolio Health" },
  { key: "pipeline", label: "Delivery Pipeline" },
  { key: "overdue", label: "Overdue Deliverables" },
  { key: "workload", label: "PM Workload" },
  { key: "trends", label: "Lessons Learned" },
  { key: "kb", label: "Knowledge Base" },
];

function DashSubNav({
  active,
  onChange,
}: {
  active: DashSubTab;
  onChange: (t: DashSubTab) => void;
}) {
  return (
    <div className="ipm-dash-subnav">
      {DASH_SUB_TABS.map((t) => (
        <button
          key={t.key}
          className={`ipm-dash-subnav-btn${active === t.key ? " active" : ""}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function DashboardTab({
  onOpenProject,
}: {
  onOpenLifecycle: () => void;
  onOpenProject: (id: string) => void;
}) {
  const [subTab, setSubTab] = useState<DashSubTab>("overview");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({});
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    globalThis.frappe
      .call({
        method:
          "corporate_services.icl_corporate_services.page.icl_project_management.icl_project_management.get_dashboard_data",
      })
      .then((r: any) => {
        setData((r && r.message) || {});
        setLoading(false);
      })
      .catch((e: any) => {
        setError(e?.message || "Failed to load project dashboard.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (loading) return;
    const rows = data.status_breakdown || [];
    if (!rows.length) return;
    const target = document.getElementById("icl-project-status-chart");
    if (!target) return;
    target.innerHTML = "";
    new globalThis.frappe.Chart("#icl-project-status-chart", {
      data: {
        labels: rows.map((row) => row.status),
        datasets: [{ values: rows.map((row) => row.count) }],
      },
      type: "donut",
      height: 280,
    });
  }, [loading, data.status_breakdown]);

  const summary = data.summary || {};
  const statusBreakdown = data.status_breakdown || [];

  if (loading) {
    return (
      <div className="container-fluid p-3 text-muted">
        Loading project dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid p-3">
        <div className="alert alert-danger mb-0">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <DashSubNav active={subTab} onChange={setSubTab} />

      {subTab === "overview" && (
        <div className="container-fluid p-3">
          <div className="ipm-section-label">Portfolio Snapshot</div>
          <div className="row mb-2">
            <Metric
              label="Total Projects"
              value={summary.total_projects || 0}
              active={statusFilter === ""}
              onClick={() => setStatusFilter("")}
            />
            <Metric
              label="Active Projects"
              value={summary.active_projects || 0}
              active={statusFilter === "Open"}
              onClick={() => setStatusFilter((f) => (f === "Open" ? "" : "Open"))}
            />
            <Metric
              label="Completed Projects"
              value={summary.completed_projects || 0}
              active={statusFilter === "Completed"}
              onClick={() => setStatusFilter((f) => (f === "Completed" ? "" : "Completed"))}
            />
            <Metric label="Avg Progress" value={`${Math.round(summary.average_progress || 0)}%`} />
          </div>

          <div className="ipm-section-label">Charts</div>
          <div className="card border mb-3">
            <div className="card-header bg-light">
              <strong style={{ fontSize: 13 }}>Projects by Status</strong>
              <span className="text-muted" style={{ fontSize: 12, marginLeft: 8 }}>
                Click a Portfolio Snapshot card above to filter the table below.
              </span>
            </div>
            <div className="card-body">
              {statusBreakdown.length ? (
                <div id="icl-project-status-chart" />
              ) : (
                <div className="text-muted" style={{ fontSize: 13 }}>No project status data found.</div>
              )}
            </div>
          </div>
          <ProjectHoursDash onOpenProject={onOpenProject} />

          <div className="ipm-section-label">All Projects</div>
          <ProjectsTable
            onOpen={onOpenProject}
            title={statusFilter ? `All Projects - ${statusFilter}` : "All Projects"}
            statusFilter={statusFilter}
          />
        </div>
      )}

      {subTab === "portfolio" && <PortfolioHealthDash onOpenProject={(id) => { onOpenProject(id); }} />}
      {subTab === "pipeline" && <DeliveryPipelineDash onOpenProject={(id) => { onOpenProject(id); }} />}
      {subTab === "overdue" && <OverdueDeliverablesDash onOpenProject={(id) => { onOpenProject(id); }} />}
      {subTab === "workload" && <PmWorkloadDash />}
      {subTab === "trends" && <LessonsLearnedTrendsDash />}
      {subTab === "kb" && <KnowledgeBaseDash />}
    </div>
  );
}
