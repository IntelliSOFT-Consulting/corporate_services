import React from "react";
import type { ProjectDetail as ProjectDetailDoc } from "../types";

interface Props {
  doc: ProjectDetailDoc;
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  const isEmpty = value == null || value === "";
  return (
    <div>
      <div className="pm-field-label">{label}</div>
      <div className={`pm-field-value${isEmpty ? " empty" : ""}`}>
        {isEmpty ? "-" : String(value)}
      </div>
    </div>
  );
}

function formatCurrency(amount?: number) {
  if (amount == null) return null;
  return Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(date?: string) {
  if (!date) return null;
  return new Date(date).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const QuickActions: React.FC<Props> = ({ doc }) => {
  return (
    <div className="pm-charts-grid">
      <div className="frappe-card" style={{ padding: "16px 20px" }}>
        <h6 className="pm-section-title">Quick Actions</h6>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <a href="/app/project/new-project-1" className="btn btn-sm btn-default">
            + New Project
          </a>
          <a
            href="/app/project-status-report/new-project-status-report-1"
            className="btn btn-sm btn-default"
          >
            + New Status Report
          </a>
          <a
            href="/app/project-milestone/new-project-milestone-1"
            className="btn btn-sm btn-default"
          >
            + Add Milestone
          </a>
          <a
            href="/app/project-update/new-project-update-1"
            className="btn btn-sm btn-default"
          >
            + Add Team Event
          </a>
          <a href="/app/file/new-file-1" className="btn btn-sm btn-default">
            + Upload Document
          </a>
        </div>
      </div>

      <div className="frappe-card" style={{ padding: "16px 20px" }}>
        <h6 className="pm-section-title">Project Setup Status</h6>
        <div className="pm-empty-inline">
          Setup completion tracking based on HIS setup items - coming soon.
        </div>
      </div>

      <div className="frappe-card" style={{ padding: "16px 20px" }}>
        <h6 className="pm-section-title">Financial</h6>
        <div className="pm-field-grid" style={{ gridTemplateColumns: "1fr" }}>
          <Field
            label="Estimated Costing"
            value={formatCurrency(doc.estimated_costing)}
          />
          <Field
            label="Total Costing Amount"
            value={formatCurrency(doc.total_costing_amount)}
          />
          <Field
            label="Total Purchase Cost"
            value={formatCurrency(doc.total_purchase_cost)}
          />
          <Field label="Gross Margin" value={formatCurrency(doc.gross_margin)} />
          <Field
            label="Gross Margin (%)"
            value={
              doc.per_gross_margin != null ? `${doc.per_gross_margin}%` : null
            }
          />
        </div>
      </div>

      <div className="frappe-card" style={{ padding: "16px 20px" }}>
        <h6 className="pm-section-title">Assignment</h6>
        <div className="pm-field-grid" style={{ gridTemplateColumns: "1fr" }}>
          <Field label="Owner" value={doc.owner} />
          <Field label="Created On" value={formatDate(doc.creation)} />
          <Field label="Last Modified" value={formatDate(doc.modified)} />
          <Field label="Cost Center" value={doc.cost_center} />
        </div>
      </div>
    </div>
  );
};
export default QuickActions;
