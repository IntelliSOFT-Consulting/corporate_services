import React from "react";

const LL_DOCTYPE = "Project Management Lessons Learned";

const WHEN_TO_USE = [
  "At project closure, or after a major milestone, phase, or significant incident.",
  "When the team wants to capture what worked, what did not, and what to repeat or avoid next time.",
  "Before handover, so knowledge stays with the organization and not just individuals.",
];

const STEPS = [
  "Click \"Start Lessons Learned Report\" - the project title and client are pre-filled for you.",
  "Answer the narrative questions. These come from the active Lessons Learned Template (managed by HR/System Admin) and may change over time.",
  "Fill the Root Cause Analysis table: list each issue, its underlying root cause, and the area affected.",
  "Add Recommendations with a priority (High/Medium/Low) so improvements can be ranked.",
  "Define Next Steps as concrete action items with a responsible person, deadline, and status.",
  "Attach supporting documentation, then route to the supervisor for sign-off and submit.",
];

interface Props {
  doc: { project_name?: string; customer?: string } | null;
  projectId: string;
}

export function LessonsLearnedGuide({ doc, projectId }: Props) {
  const frappe = (globalThis as any).frappe;

  const startReport = () => {
    frappe.route_options = {
      project_title: doc?.project_name || projectId,
      client: doc?.customer || "",
    };
    frappe.new_doc(LL_DOCTYPE);
  };

  const viewReports = () => {
    frappe.set_route("List", LL_DOCTYPE, {
      project_title: doc?.project_name || projectId,
    });
  };

  return (
    <div
      className="frappe-card"
      style={{ padding: "16px 20px", marginBottom: 16 }}
    >
      <div className="pm-list-section-header">
        <h6 className="pm-section-title" style={{ marginBottom: 0 }}>
          Lessons Learned - How to Use
        </h6>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={startReport}
          >
            Start Lessons Learned Report
          </button>
          <button
            type="button"
            className="btn btn-sm btn-default"
            onClick={viewReports}
          >
            View Reports
          </button>
        </div>
      </div>

      <p className="text-muted" style={{ fontSize: 13, marginTop: 12 }}>
        A Lessons Learned Report captures the experience of this project so the
        team can repeat what worked and avoid what did not. The questions are
        driven by the active template, so they stay consistent across all
        projects.
      </p>

      <div className="pm-charts-grid" style={{ gap: 16 }}>
        <div>
          <div className="text-muted small text-uppercase mb-1">
            When to capture lessons
          </div>
          <ul style={{ fontSize: 13, paddingLeft: 18, marginBottom: 0 }}>
            {WHEN_TO_USE.map((item) => (
              <li key={item} style={{ marginBottom: 6 }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-muted small text-uppercase mb-1">
            How to complete the report
          </div>
          <ol style={{ fontSize: 13, paddingLeft: 18, marginBottom: 0 }}>
            {STEPS.map((step) => (
              <li key={step} style={{ marginBottom: 6 }}>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

export default LessonsLearnedGuide;
