import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";

import { GlobalStyles } from "../project_components/ui/GlobalStyles";
import { ProjectTable } from "../project_components/ProjectTable";
import { ProjectDetail } from "../project_components/ProjectDetail";

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
  return value === "dashboard" || value === "projects" || value === "lifecycle" || value === "templates";
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
    globalThis.history.replaceState(globalThis.history.state, "", url.toString());
  } catch {
    // no-op
  }
}

const LOCAL_STYLES = `
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
          <div className="text-muted" style={{ fontSize: 12 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{value}</div>
        </div>
      </div>
    </div>
  );
}

function DashboardTab({ onOpenLifecycle }: { onOpenLifecycle: () => void }) {
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
  const projects = data.projects || [];
  const statusBreakdown = data.status_breakdown || [];

  if (loading) {
    return <div className="container-fluid p-3 text-muted">Loading project dashboard...</div>;
  }

  if (error) {
    return <div className="container-fluid p-3"><div className="alert alert-danger mb-0">{error}</div></div>;
  }

  return (
    <div className="container-fluid p-3">
      <div className="alert alert-info mb-3" role="alert">
        Welcome to the ICL Project Management dashboard.
      </div>

      <div className="card border mb-3">
        <div className="card-body">
          <h6 className="mb-2">HIS Project Quick Guide</h6>
          <p className="text-muted mb-2">
            For every new Health Information System (HIS) project, follow the lifecycle stages:
            <strong> Prepare</strong> -&gt; <strong>Plan</strong> -&gt; <strong>Design</strong> -&gt;
            <strong> Development</strong> -&gt; <strong>Implementation</strong> -&gt; <strong>Maintenance</strong>.
          </p>
          <ul className="mb-2">
            <li>Start by creating the project record and project charter.</li>
            <li>Capture all required lifecycle deliverables as the project progresses.</li>
            <li>Track completion using the <strong>HIS PM Project LifeCycle</strong> checklist.</li>
          </ul>
          <a href="#" onClick={(e) => { e.preventDefault(); onOpenLifecycle(); }}>
            Open HIS Lifecycle Guide
          </a>
        </div>
      </div>

      <div className="row">
        <Metric label="Total Projects" value={summary.total_projects || 0} />
        <Metric label="Active Projects" value={summary.active_projects || 0} />
        <Metric label="Completed Projects" value={summary.completed_projects || 0} />
        <Metric label="Avg Progress" value={`${Math.round(summary.average_progress || 0)}%`} />
      </div>

      <div className="card border mb-3">
        <div className="card-body">
          <h6 className="mb-3">Projects by Status</h6>
          {statusBreakdown.length ? (
            <div id="icl-project-status-chart" />
          ) : (
            <div className="text-muted">No project status data found.</div>
          )}
        </div>
      </div>

      <div className="card border">
        <div className="card-body">
          <h6 className="mb-3">All Projects</h6>
          <div className="table-responsive">
            <table className="table table-sm table-bordered align-middle">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Priority</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                </tr>
              </thead>
              <tbody>
                {projects.length ? (
                  projects.map((row) => (
                    <tr key={row.name}>
                      <td>
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            globalThis.frappe?.set_route("icl-project-management", row.name);
                          }}
                        >
                          {row.name}
                        </a>
                      </td>
                      <td>{row.project_name || ""}</td>
                      <td>{row.status || ""}</td>
                      <td>{row.percent_complete || 0}%</td>
                      <td>{row.priority || ""}</td>
                      <td>{row.expected_start_date || ""}</td>
                      <td>{row.expected_end_date || ""}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center text-muted">
                      No projects found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
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
    return <div className="container-fluid p-3 text-muted">Loading lifecycle guide...</div>;
  }

  if (error) {
    return <div className="container-fluid p-3"><div className="alert alert-danger mb-0">{error}</div></div>;
  }

  const introTitle = data.intro_title || "Project Start-to-End Guide";
  const introDescription = data.intro_description || "";
  const stages = data.stages || [];

  return (
    <div className="container-fluid p-3">
      <div className="card border mb-3" style={{ background: "#f7fbff", borderColor: "#d9ebfb" }}>
        <div className="card-body">
          <h6 className="mb-1">{introTitle}</h6>
          <p className="text-muted mb-0">{introDescription}</p>
        </div>
      </div>

      {!stages.length ? (
        <div className="alert alert-info mb-0">
          No lifecycle stages configured yet. Create records in HIS Project Lifecycle Config.
        </div>
      ) : (
        <div className="row">
          {stages.map((stage, idx) => (
            <div className="col-lg-6 mb-3" key={`${stage.stage_name || "stage"}-${idx}`}>
              <div className="card border h-100">
                <div className="card-header bg-light d-flex justify-content-between align-items-start">
                  <h6 className="mb-0">{stage.stage_name || ""}</h6>
                  <div>
                    {(stage.steps || []).map((step, sidx) => (
                      <span key={`${step}-${sidx}`} className="badge bg-info text-dark mr-1 mb-1">
                        {step}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="card-body">
                  <div className="text-muted small text-uppercase mb-1">Requirements</div>
                  <ul className="mb-3">
                    {(stage.requirements || []).map((item, ridx) => <li key={`${item}-${ridx}`}>{item}</li>)}
                  </ul>
                  <div className="text-muted small text-uppercase mb-1">Deliverables / Templates</div>
                  <ul className="mb-0">
                    {(stage.deliverables || []).map((item, didx) => <li key={`${item}-${didx}`}>{item}</li>)}
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
            globalThis.frappe.show_alert({ message: "Template saved", indicator: "green" });
            loadLibrary();
          },
        });
      },
    });
  }

  if (loading) {
    return <div className="container-fluid p-3 text-muted">Loading project requirements templates...</div>;
  }

  if (error) {
    return <div className="container-fluid p-3"><div className="alert alert-danger mb-0">{error}</div></div>;
  }

  return (
    <div className="container-fluid p-3">
      <div className="alert alert-info mb-3" role="alert">
        Upload one default Word template per requirement. Users can download, edit offline, and upload the
        completed file to the target project document.
      </div>
      <div className="row">
        {resources.map((item, idx) => (
          <div className="col-lg-6 mb-3" key={`${item.requirement || "resource"}-${idx}`}>
            <div className="card border h-100">
              <div className="card-body">
                <h6 className="mb-2">{item.requirement || ""}</h6>
                <p className="text-muted mb-2">{item.description || ""}</p>
                <div className="small text-muted mb-2">Target: {item.doctype || ""}</div>
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
                    onClick={() => globalThis.frappe?.set_route("List", item.doctype)}
                  >
                    View List
                  </button>
                  <button
                    className="btn btn-sm btn-default"
                    onClick={() => item.requirement && openUploadDialog(item.requirement)}
                  >
                    Upload/Replace Template
                  </button>
                  <button
                    className="btn btn-sm btn-default"
                    onClick={() => {
                      if (!item.template_file) {
                        globalThis.frappe.show_alert({ message: "No template uploaded yet", indicator: "orange" });
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

function ProjectsTab({ initialProjectId }: { initialProjectId: string | null }) {
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
          <ProjectTable onOpen={openProject} />
        </>
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
          Project Requirement Templates
        </div>
      </div>
    </div>
  );
}

function ProjectManagementApp({ page }: { page: any }) {
  const initialRouteProject = (((globalThis as any).frappe?.get_route?.() ?? [])[1] as string) || null;

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
      globalThis.frappe?.set_route("Form", "Project Management Settings", "Project Management Settings");
    });
  }, [page]);

  useEffect(() => {
    globalThis?.localStorage?.setItem(TAB_KEY, tab);
    writeTabToUrl(tab);
  }, [tab]);

  const sidebarRoot = document.getElementById("project-management-sidebar-root");

  return (
    <>
      <GlobalStyles />
      <style>{LOCAL_STYLES}</style>
      {sidebarRoot && createPortal(<SidebarTabs tab={tab} onChange={setTab} />, sidebarRoot)}
      <div className="ipm-content">
        {tab === "dashboard" && <DashboardTab onOpenLifecycle={() => setTab("lifecycle")} />}
        {tab === "projects" && <ProjectsTab initialProjectId={initialRouteProject} />}
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

(globalThis as any).initProjectManagement = function initProjectManagement(page: any) {
  mount(page);
};
