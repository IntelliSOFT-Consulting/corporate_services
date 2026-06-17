import React, { useEffect, useState } from "react";

interface Props {
  projectId?: string;
}

const ROWS_PER_PAGE = 10;

const STATUS_COLOR: Record<string, string> = {
  completed: "green",
  done: "green",
  "in progress": "blue",
  ongoing: "blue",
  "not started": "gray",
  pending: "orange",
  "on hold": "orange",
  delayed: "red",
  overdue: "red",
  cancelled: "red",
};

function WorkStatusBadge({ status }: { status?: string }) {
  const text = (status || "").trim();
  if (!text) return <span className="text-muted">-</span>;
  const color = STATUS_COLOR[text.toLowerCase()] ?? "gray";
  return (
    <span
      className={`indicator-pill ${color}`}
      style={{ fontSize: 12, whiteSpace: "nowrap" }}
    >
      <span>{text}</span>
    </span>
  );
}

const WorkPlanPage: React.FC<Props> = ({ projectId: propProjectId }) => {
  const projectId =
    propProjectId ||
    (typeof document !== "undefined"
      ? document.querySelector(".pm-detail-id")?.textContent?.trim() || ""
      : "");

  const [loading, setLoading] = useState(false);
  const [highPlan, setHighPlan] = useState<any | null>(null);
  const [highPlanRows, setHighPlanRows] = useState<any[]>([]);
  const [detailedPlan, setDetailedPlan] = useState<any | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [highPlanRows]);

  const totalPages = Math.max(1, Math.ceil(highPlanRows.length / ROWS_PER_PAGE));
  const pagedRows = highPlanRows.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE,
  );

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);

    const fetchPlans = async () => {
      try {
        const resp = await (globalThis as any).frappe.call({
          method:
            "corporate_services.icl_corporate_services.doctype.high_level_work_plan.high_level_work_plan.get_plans_for_project",
          args: { project: projectId },
        });

        setHighPlan(resp?.message?.high ?? null);
        setDetailedPlan(resp?.message?.detailed ?? null);
        setHighPlanRows(resp?.message?.high_rows ?? []);
      } catch (e) {
        setHighPlan(null);
        setDetailedPlan(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchPlans();
  }, [projectId]);

  const openForm = (doctype: string, name: string) => {
    (globalThis as any).frappe?.set_route("Form", doctype, name);
  };

  const downloadHighLevelTemplate = async () => {
    if (!projectId) {
      (globalThis as any).frappe?.msgprint({
        title: "Project Required",
        message: "Project ID is required to download the template.",
        indicator: "orange",
      });
      return;
    }

    // First, check Project Toolkit Document Templates for a template targeting this doctype
    try {
      const resp = await (globalThis as any).frappe.call({
        method: "frappe.client.get_list",
        args: {
          doctype: "Project Toolkit Document Templates",
          filters: [
            ["target_doctype", "=", "High Level Work Plan"],
            ["attach_doctype", "=", 1],
            ["is_active", "=", 1],
          ],
          fields: ["name", "attachment"],
          limit_page_length: 1,
        },
      });
      const tpl = (resp?.message ?? [])[0] ?? null;
      if (tpl && tpl.attachment) {
        const url = tpl.attachment.startsWith("/")
          ? tpl.attachment
          : "/files/" + tpl.attachment;
        window.open(url, "_blank", "noreferrer");
        return;
      }
    } catch (e) {
      // continue to static asset / api fallback
    }

    // Static asset fallback
    const assetUrl = `/assets/corporate_services/js/work_plan.js`;

    try {
      const res = await fetch(assetUrl, { credentials: "same-origin" });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "high_level_work_plan_template.js";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        (globalThis as any).frappe?.show_alert({
          message: "Template downloaded",
          indicator: "green",
        });
        return;
      }
    } catch (e) {
      // fall through to API fallback
    }

    // Fallback to backend API
    try {
      const apiUrl = `/api/project/project_work_plan/high_level?project=${encodeURIComponent(projectId)}`;
      const r = await fetch(apiUrl, { credentials: "same-origin" });
      if (!r.ok) throw new Error("Template not available from API");

      const ct = r.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const j = await r.json();
        if (j?.file_url) {
          window.open(j.file_url, "_blank", "noreferrer");
          return;
        }
        if (j?.file) {
          const blob = new Blob([j.file], { type: "application/octet-stream" });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = j.filename || "high_level_work_plan_template";
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
          return;
        }
      } else {
        const blob = await r.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "high_level_work_plan_template";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        return;
      }

      (globalThis as any).frappe?.msgprint({
        title: "Download Failed",
        message: "Template could not be downloaded.",
        indicator: "red",
      });
    } catch (e: any) {
      (globalThis as any).frappe?.msgprint({
        title: "Download Failed",
        message: e?.message || "Could not download template.",
        indicator: "red",
      });
    }
  };

  return (
    <div className="work-plan-page" style={{ paddingBottom: 32 }}>
      <header className="work-plan-page__header">
        <h4>Project Work Plan</h4>
        <p>
          This section shows links to any existing High Level or Detailed Work
          Plans for the current project. If none exist, a reminder is displayed
          so users can upload/create them in the system.
        </p>
      </header>

      <section className="work-plan-page__content">
        <div style={{ marginTop: 8 }}>
          <h6>High Level Work Plan</h6>
          {loading ? (
            <div className="text-muted">Checking for existing plans…</div>
          ) : highPlan ? (
            <div>
              <div className="card">
                <div className="card-body">
                  <div className="row" style={{ marginBottom: 12 }}>
                    <div className="col-md-6">
                      <strong>Project Lead:</strong>{" "}
                      {highPlan.project_lead || "N/A"}
                    </div>
                    <div className="col-md-6">
                      <strong>Project Start Date:</strong>{" "}
                      {highPlan.project_start_date || "N/A"}
                    </div>
                  </div>
                  <div className="row" style={{ marginBottom: 12 }}>
                    <div className="col-md-6">
                      <strong>Project End Date:</strong>{" "}
                      {highPlan.project_end_date || "N/A"}
                    </div>
                    <div className="col-md-6">
                      <strong>Project Duration:</strong>{" "}
                      {highPlan.project_duration || "N/A"}
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          openForm("High Level Work Plan", highPlan.name);
                        }}
                        className="btn btn-sm btn-primary"
                      >
                        Open High Level Work Plan
                      </a>
                      {highPlan?.entry_type === "Template Import" ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-default"
                          style={{ marginLeft: 8 }}
                          onClick={(e) => {
                            e.preventDefault();
                            void downloadHighLevelTemplate();
                          }}
                        >
                          Download Template
                        </button>
                      ) : null}
                    </div>
                    <div className="col-md-6"></div>
                  </div>
                </div>
              </div>

              {/* High level workplan rows table */}
              <div style={{ marginTop: 12 }}>
                <h6>High Level Work Plan Items</h6>
                {highPlanRows.length === 0 ? (
                  <div className="text-muted">No workplan rows found.</div>
                ) : (
                  <div className="table-responsive" style={{ marginTop: 8 }}>
                    <table className="table table-sm table-bordered">
                      <thead>
                        <tr>
                          <th>Line Item</th>
                          <th>Key Deliverable</th>
                          <th>Start Date</th>
                          <th>End Date</th>
                          <th>Expected Outcome</th>
                          <th style={{ minWidth: 130 }}>Status</th>
                          <th>Resources</th>
                          <th>Comments</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedRows.map((r: any, idx: number) => (
                          <tr key={(page - 1) * ROWS_PER_PAGE + idx}>
                            <td>{r.line_item || ""}</td>
                            <td>{r.key_deliverable || ""}</td>
                            <td>{r.start_date || ""}</td>
                            <td>{r.end_date || ""}</td>
                            <td>{r.expected_outcome || ""}</td>
                            <td>
                              <WorkStatusBadge status={r.status} />
                            </td>
                            <td style={{ whiteSpace: "pre-wrap" }}>
                              {r.resources || ""}
                            </td>
                            <td style={{ whiteSpace: "pre-wrap" }}>
                              {r.comments || ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {totalPages > 1 && (
                      <div className="pm-pagination">
                        <span>
                          Showing {(page - 1) * ROWS_PER_PAGE + 1}–
                          {Math.min(page * ROWS_PER_PAGE, highPlanRows.length)} of{" "}
                          {highPlanRows.length}
                        </span>
                        <div className="pm-pagination-btns">
                          <button
                            type="button"
                            className="btn btn-xs btn-default"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                          >
                            Previous
                          </button>
                          <span style={{ padding: "0 8px" }}>
                            Page {page} of {totalPages}
                          </span>
                          <button
                            type="button"
                            className="btn btn-xs btn-default"
                            disabled={page >= totalPages}
                            onClick={() =>
                              setPage((p) => Math.min(totalPages, p + 1))
                            }
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="alert alert-warning" style={{ padding: 8 }}>
              No High Level Work Plan found for this project. Please upload or
              create one (Form &rarr; New &rarr; High Level Work Plan).
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-sm btn-default"
                  onClick={(e) => {
                    e.preventDefault();
                    void downloadHighLevelTemplate();
                  }}
                >
                  Download Template
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <h6>Detailed Work Plan</h6>
          {loading ? (
            <div className="text-muted">Checking for existing plans…</div>
          ) : detailedPlan ? (
            <div>
              <div className="row">
                <div className="col-md-6">{detailedPlan.name}</div>
                <div className="col-md-6">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      openForm("Detailed Work Plan", detailedPlan.name);
                    }}
                    className="btn btn-sm btn-primary"
                  >
                    Open Detailed Work Plan
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="alert alert-warning" style={{ padding: 8 }}>
              No Detailed Work Plan found for this project. Please upload or
              create one (Form &rarr; New &rarr; Detailed Work Plan).
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default WorkPlanPage;
