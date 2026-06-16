import React from "react";

export function RecruitmentReportTab() {
  const frappe = (globalThis as any).frappe;
  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body">
        <h6 className="mb-1">Recruitment Report</h6>
        <p className="text-muted mb-3" style={{ fontSize: 12 }}>
          Open the recruitment analytics and pipeline dashboard.
        </p>
        <div className="d-flex" style={{ gap: 8 }}>
          <button
            className="btn btn-default btn-sm"
            onClick={() => frappe?.set_route("recruitment_report")}
          >
            Open Page
          </button>
        </div>
      </div>
    </div>
  );
}

