import React, { useEffect, useState } from "react";

interface Props {
  projectId?: string;
}

const WorkPlanPage: React.FC<Props> = ({ projectId: propProjectId }) => {
  const projectId =
    propProjectId ||
    (typeof document !== "undefined"
      ? document.querySelector(".pm-detail-id")?.textContent?.trim() || ""
      : "");

  const [loading, setLoading] = useState(false);
  const [highPlan, setHighPlan] = useState<any | null>(null);
  const [detailedPlan, setDetailedPlan] = useState<any | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);

    const fetchPlans = async () => {
      try {
        const [highRes, detRes] = await Promise.all([
          (globalThis as any).frappe.call({
            method: "frappe.client.get_list",
            args: {
              doctype: "High Level Work Plan",
              filters: [["project_name", "=", projectId]],
              fields: [
                "name",
                "entry_type",
                "template_import",
                "project_lead",
                "project_start_date",
                "project_end_date",
                "project_duration",
              ],
              limit_page_length: 1,
            },
          }),
          (globalThis as any).frappe.call({
            method: "frappe.client.get_list",
            args: {
              doctype: "Detailed Work Plan",
              filters: [["project_name", "=", projectId]],
              fields: ["name"],
              limit_page_length: 1,
            },
          }),
        ]);

        setHighPlan((highRes?.message ?? [])[0] ?? null);
        setDetailedPlan((detRes?.message ?? [])[0] ?? null);
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
        const url = tpl.attachment.startsWith("/") ? tpl.attachment : "/files/" + tpl.attachment;
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
        (globalThis as any).frappe?.show_alert({ message: "Template downloaded", indicator: "green" });
        return;
      }
    } catch (e) {
      // fall through to API fallback
    }

    // Fallback to backend API
    try {
      const apiUrl = `/api/project/project_work_plan/high_level?project_name=${encodeURIComponent(projectId)}`;
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

      (globalThis as any).frappe?.msgprint({ title: "Download Failed", message: "Template could not be downloaded.", indicator: "red" });
    } catch (e: any) {
      (globalThis as any).frappe?.msgprint({ title: "Download Failed", message: e?.message || "Could not download template.", indicator: "red" });
    }
  };

  return (
    <div className="work-plan-page">
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
