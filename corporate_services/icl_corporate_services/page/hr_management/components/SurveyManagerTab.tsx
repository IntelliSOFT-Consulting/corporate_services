import React from "react";

export function SurveyManagerTab() {
  const frappe = (globalThis as any).frappe;
  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body">
        <h6 className="mb-1">Survey Manager</h6>
        <p className="text-muted mb-3" style={{ fontSize: 12 }}>
          Manage surveys, questions, and response analytics.
        </p>
        <div className="d-flex" style={{ gap: 8 }}>
          <button
            className="btn btn-default btn-sm"
            onClick={() => frappe?.set_route("survey_manager")}
          >
            Open Page
          </button>
        </div>
      </div>
    </div>
  );
}

