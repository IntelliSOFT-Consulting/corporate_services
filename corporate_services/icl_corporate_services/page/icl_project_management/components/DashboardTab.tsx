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
  const riskSummary = data.risk_summary || { on_track: 0, needs_attention: 0, at_risk: 0, not_started: 0 };
  const overdueReports = data.overdue_reports || [];
  const milestonesDueSoon = data.milestones_due_soon || [];
  const paymentSchedule = data.payment_schedule || [];
  const paymentsApproaching = data.payments_approaching || [];

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
          {overdueReports.length > 0 && (
            <div className="ipm-report-alert">
              <div className="ipm-report-alert-text">
                <strong>⚠ {overdueReports.length}</strong> progress report{overdueReports.length !== 1 ? "s" : ""} overdue
                {" - "}
                {overdueReports.map((r) => r.project).join(" · ")}
              </div>
              <button
                className="ipm-report-alert-btn"
                onClick={() => globalThis.frappe.new_doc("Project Update")}
              >
                Create Report Now →
              </button>
            </div>
          )}

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
            <div className="col-md-4 mb-3">
              <div className="ipm-risk-tile ipm-risk-tile-green h-100">
                <div className="ipm-risk-tile-val">{riskSummary.on_track || 0}</div>
                <div className="ipm-risk-tile-label">On Track</div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="ipm-risk-tile ipm-risk-tile-amber h-100">
                <div className="ipm-risk-tile-val">{riskSummary.needs_attention || 0}</div>
                <div className="ipm-risk-tile-label">Needs Attention</div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="ipm-risk-tile ipm-risk-tile-red h-100">
                <div className="ipm-risk-tile-val">{riskSummary.at_risk || 0}</div>
                <div className="ipm-risk-tile-label">At Risk</div>
              </div>
            </div>
          </div>

          <div className="ipm-quickstat-row">
            <div className="ipm-quickstat-card">
              <div className="ipm-quickstat-val">{overdueReports.length}</div>
              <div className="ipm-quickstat-label">Progress reports overdue</div>
              <button className="ipm-quickstat-link" onClick={() => setSubTab("portfolio")}>
                View overdue items →
              </button>
            </div>
            <div className="ipm-quickstat-card">
              <div className="ipm-quickstat-val">{milestonesDueSoon.length}</div>
              <div className="ipm-quickstat-label">Milestones due in 7 days</div>
              <button className="ipm-quickstat-link" onClick={() => setSubTab("portfolio")}>
                View overdue items →
              </button>
            </div>
            <div className="ipm-quickstat-card">
              <div className="ipm-quickstat-val">{paymentsApproaching.length}</div>
              <div className="ipm-quickstat-label">Payments approaching</div>
              <button
                className="ipm-quickstat-link"
                onClick={() =>
                  document.getElementById("icl-payment-schedule")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                View overdue items →
              </button>
            </div>
          </div>

          <div id="icl-payment-schedule" className="card border mb-3">
            <div className="card-header bg-light">
              <strong style={{ fontSize: 13 }}>Payment Schedule Overview - All Active Projects</strong>
            </div>
            <div className="table-responsive">
              <table className="table table-sm mb-0" style={{ fontSize: 12 }}>
                <thead className="thead-light">
                  <tr>
                    <th>Project</th>
                    <th>Client</th>
                    <th>Deliverable</th>
                    <th style={{ textAlign: "right" }}>%</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentSchedule.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-muted text-center py-3">No payment schedule data found.</td>
                    </tr>
                  ) : (
                    paymentSchedule.map((row, i) => (
                      <tr key={i} className="ipm-pipeline-row" onClick={() => onOpenProject(row.project)}>
                        <td>{row.project}</td>
                        <td>{row.client ?? "-"}</td>
                        <td>{row.deliverable ?? "-"}</td>
                        <td style={{ textAlign: "right" }}>{row.percentage}%</td>
                        <td>{row.due_date ?? "-"}</td>
                        <td>
                          <span
                            className="ipm-badge-pill"
                            style={
                              row.status === "Sent"
                                ? { background: "#eaf7ef", color: "#2e9e5b" }
                                : { background: "#fff8e6", color: "#b8860b" }
                            }
                          >
                            {row.status}
                          </span>
                        </td>
                        <td>{row.payment_status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
