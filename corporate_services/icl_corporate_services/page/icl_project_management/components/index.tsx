import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

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

function ProjectManagementApp({ page }: { page: any }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    page.set_primary_action("Create New Project", () => {
      globalThis.frappe?.new_doc("Project");
    });
    page.add_menu_item("HIS Project Lifecycle Guide", () => {
      globalThis.frappe?.set_route("health-information-system-project-lifecycle");
    });
    page.add_menu_item("Project Requirements Templates", () => {
      globalThis.frappe?.set_route("project-requirements-templates");
    });
  }, [page]);

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
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              globalThis.frappe?.set_route("health-information-system-project-lifecycle");
            }}
          >
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
                            globalThis.frappe?.set_route("icl-project-detail", row.name);
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

function mount(page: any) {
  const el = document.getElementById("project-management-root");
  if (!el) return;
  createRoot(el).render(<ProjectManagementApp page={page} />);
}

(globalThis as any).initProjectManagement = function initProjectManagement(page: any) {
  mount(page);
};
