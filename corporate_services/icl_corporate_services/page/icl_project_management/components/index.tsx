import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";

import { GlobalStyles } from "../project_components/ui/GlobalStyles";
import { Project } from "../project_components/Index";
import { ProjectDetail } from "../project_components/ProjectDetail";
import { ProjectsTable } from "../project_components/Tables/Projects";
import Guide from "./Guide";
import WorkPlanPage from "../work_plan";

declare global {
  interface Window {
    frappe: any;
    initProjectManagement?: (page?: any) => void;
  }
}

type Summary = {
  total_projects?: number;
  completed_projects?: number;
  active_projects?: number;
  average_progress?: number;
};

type StatusRow = { status: string; count: number };

type ProjectRow = {
  name: string;
  project_name?: string;
  status?: string;
  percent_complete?: number;
  priority?: string;
  expected_start_date?: string;
  expected_end_date?: string;
};

type DashboardData = {
  summary?: Summary;
  status_breakdown?: StatusRow[];
  projects?: ProjectRow[];
};

type LifecycleStage = {
  stage_name?: string;
  steps?: string[];
  requirements?: string[];
  deliverables?: string[];
};

type LifecycleData = {
  intro_title?: string;
  intro_description?: string;
  stages?: LifecycleStage[];
};

type TemplateResource = {
  requirement?: string;
  description?: string;
  doctype?: string;
  template_file?: string;
};

type Tab = "dashboard" | "projects" | "lifecycle" | "templates";
const TAB_KEY = "icl_project_management_tab";

function isTab(value: string | null): value is Tab {
  return (
    value === "dashboard" ||
    value === "projects" ||
    value === "lifecycle" ||
    value === "templates"
  );
}

function getTabFromUrl(): Tab | null {
  try {
    const params = new URLSearchParams(globalThis.location.search || "");
    const tab = params.get("tab");
    return isTab(tab) ? tab : null;
  } catch {
    return null;
  }
}

function writeTabToUrl(tab: Tab) {
  try {
    const url = new URL(globalThis.location.href);
    url.searchParams.set("tab", tab);
    globalThis.history.replaceState(
      globalThis.history.state,
      "",
      url.toString(),
    );
  } catch {
    // no-op
  }
}

const LOCAL_STYLES = `
.ipm-dash-subnav {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 10px 12px 0;
  border-bottom: 1px solid var(--border-color, #dee2e6);
  background: var(--fg-color, #fff);
}
.ipm-dash-subnav-btn {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 6px 14px 8px;
  font-size: 13px;
  cursor: pointer;
  color: var(--text-muted, #6c757d);
  white-space: nowrap;
}
.ipm-dash-subnav-btn:hover {
  color: var(--text-color, #333);
}
.ipm-dash-subnav-btn.active {
  color: var(--primary, #5e64ff);
  border-bottom-color: var(--primary, #5e64ff);
  font-weight: 600;
}
.ipm-portfolio-card {
  cursor: pointer;
  transition: box-shadow 0.15s;
}
.ipm-portfolio-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}
.ipm-pipeline-row {
  cursor: pointer;
}
.ipm-pipeline-row:hover td {
  background: var(--fg-hover-color, #f8f9fa);
}
.ipm-dash-loading {
  padding: 40px;
  text-align: center;
  color: #888;
}
.ipm-sidebar-header {
  padding: 12px 10px 10px;
  border-bottom: 1px solid var(--border-color, #e2e6ea);
}
.ipm-sidebar-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted, #6c757d);
  margin: 0;
}
.ipm-sidebar-list {
  padding: 6px 0;
}
.ipm-sidebar-item {
  padding: 8px 10px;
  cursor: pointer;
  font-size: 13px;
  border-left: 3px solid transparent;
}
.ipm-sidebar-item:hover {
  background: var(--fg-hover-color, #f8f9fa);
}
.ipm-sidebar-item.active {
  background: var(--control-bg, #e8eaf0);
  border-left-color: var(--primary, #5e64ff);
  font-weight: 600;
}
.ipm-content {
  padding: 0 10px;
}
`;

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="col-md-3 mb-3">
      <div className="card border h-100">
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

function DashboardTab({
  onOpenProject,
}: {
  onOpenLifecycle: () => void;
  onOpenProject: (id: string) => void;
}) {
  const [subTab, setSubTab] = useState<DashSubTab>("overview");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({});
  const [error, setError] = useState<string | null>(null);

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
          <div className="row mb-3">
            <div className="col-12">
              <Guide />
            </div>
          </div>
          <div className="row mb-2">
            <Metric label="Total Projects" value={summary.total_projects || 0} />
            <Metric label="Active Projects" value={summary.active_projects || 0} />
            <Metric label="Completed Projects" value={summary.completed_projects || 0} />
            <Metric label="Avg Progress" value={`${Math.round(summary.average_progress || 0)}%`} />
          </div>
          <div className="card border mb-3">
            <div className="card-header bg-light">
              <strong style={{ fontSize: 13 }}>Projects by Status</strong>
            </div>
            <div className="card-body">
              {statusBreakdown.length ? (
                <div id="icl-project-status-chart" />
              ) : (
                <div className="text-muted" style={{ fontSize: 13 }}>No project status data found.</div>
              )}
            </div>
          </div>
          <ProjectsTable onOpen={onOpenProject} title="All Projects" />
          <WorkPlanPage />
        </div>
      )}

      {subTab === "portfolio" && <PortfolioHealthDash onOpenProject={(id) => { onOpenProject(id); }} />}
      {subTab === "pipeline" && <DeliveryPipelineDash onOpenProject={(id) => { onOpenProject(id); }} />}
      {subTab === "overdue" && <OverdueDeliverablesDash onOpenProject={(id) => { onOpenProject(id); }} />}
      {subTab === "workload" && <PmWorkloadDash />}
      {subTab === "trends" && <LessonsLearnedTrendsDash />}
    </div>
  );
}

function LifecycleTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LifecycleData>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    globalThis.frappe
      .call({
        method:
          "corporate_services.icl_corporate_services.page.icl_project_management.icl_project_management.get_lifecycle_config",
      })
      .then((r: any) => {
        setData((r && r.message) || {});
        setLoading(false);
      })
      .catch((e: any) => {
        setError(e?.message || "Could not load lifecycle configuration.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="container-fluid p-3 text-muted">
        Loading lifecycle guide...
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

  const introTitle = data.intro_title || "Project Start-to-End Guide";
  const introDescription = data.intro_description || "";
  const stages = data.stages || [];
  const toolkitUseSteps = [
    "Start with the stage cards to understand what the PM must prepare, plan, design, implement, and close out.",
    "Create or open the Project record, then use the manual folder actions to generate the File Manager folder tree or Google Drive folder when you need them.",
    "Go to the Project Requirements Templates area to review each toolkit item, confirm its target document, and upload or replace the template file if needed.",
    "Use the toolkit items as the checklist for deliverables, evidence, and templates for each stage; update them as the project progresses instead of creating separate one-off documents.",
    "Keep the folder structure aligned to the stages and toolkit items so the PM team can quickly find what is pending, in progress, or completed.",
  ];

  return (
    <div className="container-fluid p-3">
      <div
        className="card border mb-3"
        style={{ background: "#f7fbff", borderColor: "#d9ebfb" }}
      >
        <div className="card-body">
          <h6 className="mb-1">{introTitle}</h6>
          <p className="text-muted mb-0">{introDescription}</p>
        </div>
      </div>

      <div
        className="card border mb-3"
        style={{ background: "#fffaf2", borderColor: "#f1dfb8" }}
      >
        <div className="card-body">
          <h6 className="mb-2">How PMs should use this toolkit</h6>
          <p className="text-muted mb-2">
            The toolkit is now the working guide for the project manager. It
            combines the lifecycle stages, deliverables, templates, and folder
            structure so the project stays organized in one place.
          </p>
          <ol className="mb-0 pl-3">
            {toolkitUseSteps.map((step) => (
              <li key={step} className="mb-2">
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {!stages.length ? (
        <div className="alert alert-info mb-0">
          No lifecycle stages configured yet. Create records in HIS Project
          Lifecycle Config.
        </div>
      ) : (
        <div className="row">
          {stages.map((stage, idx) => (
            <div
              className="col-lg-6 mb-3"
              key={`${stage.stage_name || "stage"}-${idx}`}
            >
              <div className="card border h-100">
                <div className="card-header bg-light d-flex justify-content-between align-items-start">
                  <h6 className="mb-0">{stage.stage_name || ""}</h6>
                  <div>
                    {(stage.steps || []).map((step, sidx) => (
                      <span
                        key={`${step}-${sidx}`}
                        className="badge bg-info text-dark mr-1 mb-1"
                      >
                        {step}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="card-body">
                  <div className="text-muted small text-uppercase mb-1">
                    Requirements
                  </div>
                  <ul className="mb-3">
                    {(stage.requirements || []).map((item, ridx) => (
                      <li key={`${item}-${ridx}`}>{item}</li>
                    ))}
                  </ul>
                  <div className="text-muted small text-uppercase mb-1">
                    Deliverables / Templates
                  </div>
                  <ul className="mb-0">
                    {(stage.deliverables || []).map((item, didx) => (
                      <li key={`${item}-${didx}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TemplatesTab() {
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<TemplateResource[]>([]);
  const [error, setError] = useState<string | null>(null);

  function loadLibrary() {
    setLoading(true);
    setError(null);
    globalThis.frappe
      .call({
        method:
          "corporate_services.icl_corporate_services.page.icl_project_management.icl_project_management.get_template_library",
      })
      .then((r: any) => {
        setResources((r && r.message) || []);
        setLoading(false);
      })
      .catch((e: any) => {
        setError(e?.message || "Could not load template library.");
        setLoading(false);
      });
  }

  useEffect(() => {
    loadLibrary();
  }, []);

  function openUploadDialog(requirement: string) {
    new globalThis.frappe.ui.FileUploader({
      allow_multiple: false,
      restrictions: {
        allowed_file_types: [".doc", ".docx", ".pdf"],
      },
      on_success: (file: any) => {
        globalThis.frappe.call({
          method:
            "corporate_services.icl_corporate_services.page.icl_project_management.icl_project_management.link_template_file",
          args: {
            requirement,
            file_url: file.file_url,
          },
          callback: () => {
            globalThis.frappe.show_alert({
              message: "Template saved",
              indicator: "green",
            });
            loadLibrary();
          },
        });
      },
    });
  }

  if (loading) {
    return (
      <div className="container-fluid p-3 text-muted">
        Loading project requirements templates...
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
    <div className="container-fluid p-3">
      <div className="alert alert-info mb-3" role="alert">
        Upload one default Word template per requirement. Users can download,
        edit offline, and upload the completed file to the target project
        document.
      </div>
      <div className="row">
        {resources.map((item, idx) => (
          <div
            className="col-lg-6 mb-3"
            key={`${item.requirement || "resource"}-${idx}`}
          >
            <div className="card border h-100">
              <div className="card-body">
                <h6 className="mb-2">{item.requirement || ""}</h6>
                <p className="text-muted mb-2">{item.description || ""}</p>
                <div className="small text-muted mb-2">
                  Target: {item.doctype || ""}
                </div>
                <div className="small mb-3">
                  {item.template_file ? (
                    <span className="text-success">Template uploaded</span>
                  ) : (
                    <span className="text-warning">No template uploaded</span>
                  )}
                </div>
                <div className="d-flex flex-wrap" style={{ gap: 8 }}>
                  <button
                    className="btn btn-sm btn-default"
                    onClick={() =>
                      globalThis.frappe?.set_route("List", item.doctype)
                    }
                  >
                    View List
                  </button>
                  <button
                    className="btn btn-sm btn-default"
                    onClick={() =>
                      item.requirement && openUploadDialog(item.requirement)
                    }
                  >
                    Upload/Replace Template
                  </button>
                  <button
                    className="btn btn-sm btn-default"
                    onClick={() => {
                      if (!item.template_file) {
                        globalThis.frappe.show_alert({
                          message: "No template uploaded yet",
                          indicator: "orange",
                        });
                        return;
                      }
                      globalThis.open(item.template_file, "_blank");
                    }}
                  >
                    Download Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectsTab({
  initialProjectId,
}: {
  initialProjectId: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(initialProjectId);

  useEffect(() => {
    setSelectedId(initialProjectId);
  }, [initialProjectId]);

  function openProject(id: string) {
    (globalThis as any).frappe?.set_route("icl-project-management", id);
    setSelectedId(id);
  }

  function handleBack() {
    (globalThis as any).frappe?.set_route("icl-project-management");
    setSelectedId(null);
  }

  return (
    <div className="pm-app-wrap">
      {selectedId ? (
        <ProjectDetail projectId={selectedId} onBack={handleBack} />
      ) : (
        <>
          <Project onOpen={openProject} />
        </>
      )}
    </div>
  );
}

// ── Management dashboards ────────────────────────────────────────────────────

type DashSubTab = "overview" | "portfolio" | "pipeline" | "overdue" | "workload" | "trends";

const DASH_SUB_TABS: { key: DashSubTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "portfolio", label: "Portfolio Health" },
  { key: "pipeline", label: "Delivery Pipeline" },
  { key: "overdue", label: "Overdue Deliverables" },
  { key: "workload", label: "PM Workload" },
  { key: "trends", label: "Lessons Learned" },
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

function useApiData<T>(method: string, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setLoading(true);
    setError(null);
    globalThis.frappe
      .call({ method })
      .then((r: any) => { setData(r?.message ?? null); setLoading(false); })
      .catch((e: any) => { setError(e?.message || "Failed to load."); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading, error };
}

function LoadingBox() {
  return <div className="ipm-dash-loading">Loading...</div>;
}
function ErrorBox({ msg }: { msg: string }) {
  return <div className="alert alert-danger mb-0">{msg}</div>;
}

// Portfolio Health
type PortfolioProject = {
  name: string; project_name: string; status: string; percent_complete: number;
  expected_end_date: string | null; customer: string | null; pm_names: string | null; rag: "Red" | "Amber" | "Green";
};
const RAG_COLOR: Record<string, string> = { Red: "#dc3545", Amber: "#fd7e14", Green: "#28a745" };

function PortfolioHealthDash({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const { data, loading, error } = useApiData<{ projects: PortfolioProject[]; summary: Record<string, number> }>(
    "corporate_services.icl_corporate_services.page.icl_project_management.icl_project_management.get_portfolio_health"
  );
  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox msg={error} />;
  const projects = data?.projects ?? [];
  const summary = data?.summary ?? {};
  return (
    <div className="container-fluid p-3">
      <div className="row mb-3">
        {(["Red", "Amber", "Green"] as const).map((rag) => (
          <div className="col-md-4 mb-2" key={rag}>
            <div className="card border text-white h-100" style={{ background: RAG_COLOR[rag] }}>
              <div className="card-body text-center">
                <div style={{ fontSize: 32, fontWeight: 700 }}>{summary[rag.toLowerCase()] ?? 0}</div>
                <div style={{ fontSize: 13 }}>{rag === "Red" ? "At Risk / Overdue" : rag === "Amber" ? "Needs Attention" : "On Track"}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {projects.length === 0 ? (
        <div className="alert alert-info">No active projects found.</div>
      ) : (
        <div className="row">
          {projects.map((p) => (
            <div className="col-lg-4 col-md-6 mb-3" key={p.name}>
              <div
                className="card border h-100 ipm-portfolio-card"
                style={{ borderLeft: `4px solid ${RAG_COLOR[p.rag]}` }}
                onClick={() => onOpenProject(p.name)}
              >
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <h6 className="mb-0" style={{ fontSize: 13 }}>{p.project_name}</h6>
                    <span className="badge" style={{ background: RAG_COLOR[p.rag], color: "#fff", fontSize: 10 }}>
                      {p.rag === "Red" ? "At Risk" : p.rag === "Amber" ? "Needs Attention" : "On Track"}
                    </span>
                  </div>
                  {p.customer && <div className="text-muted" style={{ fontSize: 11 }}>{p.customer}</div>}
                  {p.pm_names && <div className="text-muted" style={{ fontSize: 11 }}>PM: {p.pm_names}</div>}
                  <div className="mt-2">
                    <div className="d-flex justify-content-between" style={{ fontSize: 11 }}>
                      <span>{p.percent_complete.toFixed(0)}% complete</span>
                      {p.expected_end_date && <span>Due {p.expected_end_date}</span>}
                    </div>
                    <div className="progress mt-1" style={{ height: 5 }}>
                      <div
                        className="progress-bar"
                        style={{ width: `${p.percent_complete}%`, background: RAG_COLOR[p.rag] }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Delivery Pipeline
type PipelineProject = {
  name: string; project_name: string; status: string; percent_complete: number;
  expected_end_date: string | null; customer: string | null; pm_names: string | null;
  stage_progress: Array<"complete" | "current" | "pending">;
};

function DeliveryPipelineDash({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const { data, loading, error } = useApiData<{ projects: PipelineProject[]; stages: string[] }>(
    "corporate_services.icl_corporate_services.page.icl_project_management.icl_project_management.get_delivery_pipeline"
  );
  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox msg={error} />;
  const projects = data?.projects ?? [];
  const stages = data?.stages ?? [];
  if (projects.length === 0) return <div className="p-3 alert alert-info">No projects found.</div>;
  return (
    <div className="container-fluid p-3">
      <div className="table-responsive">
        <table className="table table-sm table-hover" style={{ fontSize: 12 }}>
          <thead className="thead-light">
            <tr>
              <th style={{ minWidth: 160 }}>Project</th>
              <th>Client</th>
              <th>PM</th>
              <th>Due</th>
              {stages.map((s) => <th key={s} style={{ textAlign: "center", minWidth: 80 }}>{s}</th>)}
              <th style={{ minWidth: 80 }}>Progress</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.name} className="ipm-pipeline-row" onClick={() => onOpenProject(p.name)}>
                <td style={{ fontWeight: 600 }}>{p.project_name}</td>
                <td>{p.customer ?? "-"}</td>
                <td>{p.pm_names ?? "-"}</td>
                <td>{p.expected_end_date ?? "-"}</td>
                {(p.stage_progress ?? []).map((state, i) => (
                  <td key={i} style={{ textAlign: "center" }}>
                    {state === "complete" ? (
                      <span style={{ color: "#28a745", fontWeight: 700 }}>✓</span>
                    ) : state === "current" ? (
                      <span style={{ color: "#fd7e14" }}>●</span>
                    ) : (
                      <span style={{ color: "#dee2e6" }}>○</span>
                    )}
                  </td>
                ))}
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div className="progress flex-grow-1" style={{ height: 6 }}>
                      <div className="progress-bar bg-primary" style={{ width: `${p.percent_complete}%` }} />
                    </div>
                    <span style={{ fontSize: 10, whiteSpace: "nowrap" }}>{p.percent_complete.toFixed(0)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Overdue Deliverables
type OverdueTask = {
  name: string; subject: string; project: string; project_name: string;
  exp_end_date: string | null; days_overdue: number; status: string;
  customer: string | null; pm_names: string | null;
};

function OverdueDeliverablesDash({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const { data, loading, error } = useApiData<{ tasks: OverdueTask[]; total: number }>(
    "corporate_services.icl_corporate_services.page.icl_project_management.icl_project_management.get_overdue_deliverables"
  );
  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox msg={error} />;
  const tasks = data?.tasks ?? [];
  if (tasks.length === 0) return <div className="p-3 alert alert-success">No overdue deliverables. All tasks are on track.</div>;
  return (
    <div className="container-fluid p-3">
      <div className="alert alert-warning mb-3" style={{ fontSize: 13 }}>
        <strong>{tasks.length}</strong> overdue task{tasks.length !== 1 ? "s" : ""} across active projects.
      </div>
      <div className="table-responsive">
        <table className="table table-sm table-hover" style={{ fontSize: 12 }}>
          <thead className="thead-light">
            <tr>
              <th style={{ minWidth: 200 }}>Task</th>
              <th style={{ minWidth: 140 }}>Project</th>
              <th>Client</th>
              <th>PM</th>
              <th style={{ textAlign: "right" }}>Due Date</th>
              <th style={{ textAlign: "right" }}>Days Overdue</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.name} className="ipm-pipeline-row" onClick={() => onOpenProject(t.project)}>
                <td>{t.subject}</td>
                <td style={{ fontWeight: 600 }}>{t.project_name}</td>
                <td>{t.customer ?? "-"}</td>
                <td>{t.pm_names ?? "-"}</td>
                <td style={{ textAlign: "right" }}>{t.exp_end_date ?? "-"}</td>
                <td style={{ textAlign: "right" }}>
                  <span className="badge badge-danger" style={{ background: "#dc3545", color: "#fff" }}>
                    {t.days_overdue}d
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// PM Workload
type PmRow = {
  employee: string; employee_name: string; active_projects: number;
  open_tasks: number; overdue_tasks: number;
};

function PmWorkloadDash() {
  const { data, loading, error } = useApiData<{ pms: PmRow[] }>(
    "corporate_services.icl_corporate_services.page.icl_project_management.icl_project_management.get_pm_workload"
  );
  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox msg={error} />;
  const pms = data?.pms ?? [];
  if (pms.length === 0) return <div className="p-3 alert alert-info">No Project Managers with active projects found.</div>;
  const maxProjects = Math.max(...pms.map((p) => p.active_projects), 1);
  return (
    <div className="container-fluid p-3">
      <div className="table-responsive">
        <table className="table table-sm" style={{ fontSize: 12 }}>
          <thead className="thead-light">
            <tr>
              <th style={{ minWidth: 160 }}>Project Manager</th>
              <th style={{ textAlign: "center" }}>Active Projects</th>
              <th style={{ minWidth: 200 }}>Load</th>
              <th style={{ textAlign: "center" }}>Open Tasks</th>
              <th style={{ textAlign: "center" }}>Overdue Tasks</th>
            </tr>
          </thead>
          <tbody>
            {pms.map((pm) => (
              <tr key={pm.employee}>
                <td style={{ fontWeight: 600 }}>{pm.employee_name || pm.employee}</td>
                <td style={{ textAlign: "center" }}>{pm.active_projects}</td>
                <td>
                  <div className="progress" style={{ height: 8 }}>
                    <div
                      className="progress-bar"
                      style={{
                        width: `${(pm.active_projects / maxProjects) * 100}%`,
                        background: pm.active_projects > maxProjects * 0.8 ? "#dc3545" : pm.active_projects > maxProjects * 0.5 ? "#fd7e14" : "#28a745",
                      }}
                    />
                  </div>
                </td>
                <td style={{ textAlign: "center" }}>{pm.open_tasks}</td>
                <td style={{ textAlign: "center" }}>
                  {pm.overdue_tasks > 0 ? (
                    <span className="badge" style={{ background: "#dc3545", color: "#fff" }}>{pm.overdue_tasks}</span>
                  ) : (
                    <span style={{ color: "#28a745" }}>0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Lessons Learned Trends
type WorkflowStateRow = { state: string; count: number };
type PriorityRow = { priority: string; count: number };
type StatusRow2 = { status: string; count: number };
type CoverageRow = { with_root_causes: number; with_recommendations: number; with_next_steps: number; total: number };
type RootCauseItem = { issue: string; root_cause: string; area_affected: string | null; report_name: string; project_title: string; reporter_name: string };
type RecommendationItem = { recommendation: string; priority: string; area: string | null; report_name: string; project_title: string; reporter_name: string };
type NextStepItem = { action_item: string; responsible_person: string | null; deadline: string | null; status: string | null; report_name: string; project_title: string };

const PAGE_SIZE = 25;

function FilterableTable<T extends Record<string, any>>({
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

const PRIORITY_COLOR: Record<string, string> = { High: "#dc3545", Medium: "#fd7e14", Low: "#28a745", "Not set": "#adb5bd" };
const STATE_COLOR: Record<string, string> = {
  Approved: "#28a745", Rejected: "#dc3545",
  "Submitted to Supervisor": "#fd7e14", "Needs Clarification": "#ffc107", Draft: "#adb5bd",
};

function TrendBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  return (
    <div className="mb-2">
      <div className="d-flex justify-content-between mb-1" style={{ fontSize: 12 }}>
        <span>{label}</span>
        <strong>{count}</strong>
      </div>
      <div className="progress" style={{ height: 10, borderRadius: 4 }}>
        <div className="progress-bar" style={{ width: `${(count / max) * 100}%`, background: color, borderRadius: 4 }} />
      </div>
    </div>
  );
}

function LessonsLearnedTrendsDash() {
  const { data, loading, error } = useApiData<{
    workflow_states: WorkflowStateRow[];
    recommendation_priorities: PriorityRow[];
    next_step_statuses: StatusRow2[];
    coverage: CoverageRow;
    root_causes: RootCauseItem[];
    recommendations: RecommendationItem[];
    next_steps: NextStepItem[];
  }>(
    "corporate_services.icl_corporate_services.page.icl_project_management.icl_project_management.get_lessons_learned_trends"
  );
  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox msg={error} />;

  const states = data?.workflow_states ?? [];
  const priorities = data?.recommendation_priorities ?? [];
  const nextSteps = data?.next_step_statuses ?? [];
  const cov = data?.coverage ?? ({} as CoverageRow);
  const total = cov.total ?? 0;
  const rootCauses = data?.root_causes ?? [];
  const recommendations = data?.recommendations ?? [];
  const nextStepList = data?.next_steps ?? [];

  const maxState = Math.max(...states.map((s) => s.count), 1);
  const maxPri = Math.max(...priorities.map((p) => p.count), 1);
  const maxNs = Math.max(...nextSteps.map((n) => n.count), 1);

  return (
    <div className="container-fluid p-3">
      {/* Coverage summary */}
      <div className="row mb-3">
        {[
          { label: "Approved Reports", value: total },
          { label: "With Root Causes", value: cov.with_root_causes ?? 0 },
          { label: "With Recommendations", value: cov.with_recommendations ?? 0 },
          { label: "With Next Steps", value: cov.with_next_steps ?? 0 },
        ].map((m) => (
          <div className="col-md-3 col-6 mb-2" key={m.label}>
            <div className="card border text-center">
              <div className="card-body p-2">
                <div style={{ fontSize: 26, fontWeight: 700 }}>{m.value}</div>
                <div className="text-muted" style={{ fontSize: 11 }}>{m.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row">
        {/* Report status breakdown */}
        <div className="col-md-4 mb-3">
          <div className="card border h-100">
            <div className="card-body">
              <h6 className="mb-3" style={{ fontSize: 13 }}>Reports by Status</h6>
              {states.length === 0
                ? <div className="text-muted" style={{ fontSize: 12 }}>No reports found.</div>
                : states.map((s) => (
                  <TrendBar key={s.state} label={s.state} count={s.count} max={maxState}
                    color={STATE_COLOR[s.state] ?? "#5e64ff"} />
                ))}
            </div>
          </div>
        </div>

        {/* Recommendation priorities */}
        <div className="col-md-4 mb-3">
          <div className="card border h-100">
            <div className="card-body">
              <h6 className="mb-3" style={{ fontSize: 13 }}>Recommendation Priorities</h6>
              {priorities.length === 0
                ? <div className="text-muted" style={{ fontSize: 12 }}>No recommendations in approved reports.</div>
                : priorities.map((p) => (
                  <TrendBar key={p.priority} label={p.priority} count={p.count} max={maxPri}
                    color={PRIORITY_COLOR[p.priority] ?? "#5e64ff"} />
                ))}
            </div>
          </div>
        </div>

        {/* Next step statuses */}
        <div className="col-md-4 mb-3">
          <div className="card border h-100">
            <div className="card-body">
              <h6 className="mb-3" style={{ fontSize: 13 }}>Next Step Status</h6>
              {nextSteps.length === 0
                ? <div className="text-muted" style={{ fontSize: 12 }}>No next steps in approved reports.</div>
                : nextSteps.map((n) => (
                  <TrendBar key={n.status} label={n.status} count={n.count} max={maxNs} color="#5e64ff" />
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Detail lists ── */}
      {rootCauses.length > 0 && (
        <FilterableTable
          title="Root Causes"
          rows={rootCauses}
          filterKeys={["project_title", "reporter_name", "issue", "root_cause", "area_affected"]}
          columns={[
            { label: "Project", key: "project_title" },
            { label: "Reporter", key: "reporter_name" },
            { label: "Issue", key: "issue" },
            { label: "Root Cause", key: "root_cause" },
            { label: "Area Affected", key: "area_affected" },
          ]}
        />
      )}

      {recommendations.length > 0 && (
        <FilterableTable
          title="Recommendations"
          rows={recommendations}
          filterKeys={["project_title", "recommendation", "area", "priority"]}
          columns={[
            { label: "Project", key: "project_title" },
            {
              label: "Priority",
              key: "priority",
              render: (v: string) => (
                <span className="badge" style={{ background: PRIORITY_COLOR[v] ?? "#adb5bd", color: "#fff" }}>
                  {v || "-"}
                </span>
              ),
            },
            { label: "Recommendation", key: "recommendation" },
            { label: "Area", key: "area" },
          ]}
        />
      )}

      {nextStepList.length > 0 && (
        <FilterableTable
          title="Next Steps / Follow-up"
          rows={nextStepList}
          filterKeys={["project_title", "action_item", "responsible_person", "status"]}
          columns={[
            { label: "Project", key: "project_title" },
            { label: "Action Item", key: "action_item" },
            { label: "Responsible", key: "responsible_person" },
            { label: "Deadline", key: "deadline" },
            { label: "Status", key: "status" },
          ]}
        />
      )}
    </div>
  );
}

function SidebarTabs({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (tab: Tab) => void;
}) {
  return (
    <div>
      <div className="ipm-sidebar-header">
        <p className="ipm-sidebar-title">Project Management</p>
      </div>
      <div className="ipm-sidebar-list">
        <div
          className={`ipm-sidebar-item${tab === "dashboard" ? " active" : ""}`}
          onClick={() => onChange("dashboard")}
        >
          Dashboard
        </div>
        <div
          className={`ipm-sidebar-item${tab === "projects" ? " active" : ""}`}
          onClick={() => onChange("projects")}
        >
          Projects
        </div>
        <div
          className={`ipm-sidebar-item${tab === "lifecycle" ? " active" : ""}`}
          onClick={() => onChange("lifecycle")}
        >
          HIS Lifecycle Guide
        </div>
        <div
          className={`ipm-sidebar-item${tab === "templates" ? " active" : ""}`}
          onClick={() => onChange("templates")}
        >
          Project Requirements Templates
        </div>
        <div
          className="ipm-sidebar-item"
          onClick={() =>
            globalThis.frappe?.set_route(
              "List",
              "Project Management Lessons Learned",
            )
          }
        >
          Lessons Learned
        </div>
      </div>
    </div>
  );
}

function ProjectManagementApp({ page }: { page: any }) {
  const initialRouteProject =
    (((globalThis as any).frappe?.get_route?.() ?? [])[1] as string) || null;

  const [tab, setTab] = useState<Tab>(() => {
    if (initialRouteProject) return "projects";
    const fromUrl = getTabFromUrl();
    if (fromUrl) return fromUrl;
    const saved = globalThis?.localStorage?.getItem(TAB_KEY) || null;
    return isTab(saved) ? saved : "dashboard";
  });

  useEffect(() => {
    page.set_primary_action("Create New Project", () => {
      globalThis.frappe?.new_doc("Project");
    });
    page.add_menu_item("HIS Project Lifecycle Guide", () => {
      setTab("lifecycle");
    });
    page.add_menu_item("Project Requirements Templates", () => {
      setTab("templates");
    });
    page.add_menu_item("View All Projects", () => {
      setTab("projects");
    });
    page.add_menu_item("Project Management Settings", () => {
      globalThis.frappe?.set_route(
        "Form",
        "Project Management Settings",
        "Project Management Settings",
      );
    });
  }, [page]);

  useEffect(() => {
    globalThis?.localStorage?.setItem(TAB_KEY, tab);
    writeTabToUrl(tab);
  }, [tab]);

  const sidebarRoot = document.getElementById(
    "project-management-sidebar-root",
  );

  return (
    <>
      <GlobalStyles />
      <style>{LOCAL_STYLES}</style>
      {sidebarRoot &&
        createPortal(<SidebarTabs tab={tab} onChange={setTab} />, sidebarRoot)}
      <div className="ipm-content">
        {tab === "dashboard" && (
          <DashboardTab
            onOpenLifecycle={() => setTab("lifecycle")}
            onOpenProject={(id: string) => {
              globalThis.frappe?.set_route("icl-project-management", id);
              setTab("projects");
            }}
          />
        )}
        {tab === "projects" && (
          <ProjectsTab initialProjectId={initialRouteProject} />
        )}
        {tab === "lifecycle" && <LifecycleTab />}
        {tab === "templates" && <TemplatesTab />}
      </div>
    </>
  );
}

function mount(page: any) {
  const el = document.getElementById("project-management-root");
  if (!el) return;
  createRoot(el).render(<ProjectManagementApp page={page} />);
}

(globalThis as any).initProjectManagement = function initProjectManagement(
  page: any,
) {
  mount(page);
};
