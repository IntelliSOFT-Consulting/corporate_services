import React from "react";
import type { ProjectDetail } from "../types";
import { Field } from "../components/Field";
import { StatusBadge } from "../components/StatusBadge";
import { ProgressBar } from "../components/ProgressBar";
import { formatCurrency, formatDate } from "../utils/format";

interface Props {
  doc: ProjectDetail;
  projectId: string;
}

export function OverviewTab({ doc, projectId }: Props) {
  return (
    <div>
      <div className="pm-detail-cols">
        <div className="frappe-card" style={{ padding: "16px 20px" }}>
          <h6 className="pm-section-title">Overview</h6>
          <div className="pm-field-grid">
            <Field label="Project Name" value={doc.project_name} />
            <div>
              <div className="pm-field-label">Status</div>
              <div className="pm-field-value">
                <StatusBadge status={doc.status} />
              </div>
            </div>
            <Field label="Customer" value={doc.customer} />
            <Field label="Department" value={doc.department} />
            <Field label="Company" value={doc.company} />
            <Field label="Priority" value={doc.priority} />
            <div>
              <div className="pm-field-label">Opportunity Bid</div>
              <div className="pm-field-value">
                {doc.custom_bid ? (
                  <a
                    href="#"
                    style={{
                      color: "var(--primary, #5e64ff)",
                      textDecoration: "none",
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      (globalThis as any).frappe?.set_route(
                        "icl-opportunity-module",
                        doc.custom_bid,
                      );
                    }}
                  >
                    {doc.custom_bid}
                  </a>
                ) : (
                  <span className="empty">-</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="frappe-card" style={{ padding: "16px 20px" }}>
          <h6 className="pm-section-title">Progress</h6>
          <div style={{ marginBottom: 16 }}>
            <div className="pm-field-label">Percent Complete</div>
            <ProgressBar value={doc.percent_complete} />
          </div>
          <div className="pm-field-grid">
            <Field
              label="Actual Start Date"
              value={formatDate(doc.actual_start_date)}
            />
            <Field
              label="Actual End Date"
              value={formatDate(doc.actual_end_date)}
            />
            <Field
              label="Actual Time (hrs)"
              value={doc.actual_time != null ? String(doc.actual_time) : null}
            />
          </div>
        </div>
      </div>

      <div className="pm-detail-cols">
        <div className="frappe-card" style={{ padding: "16px 20px" }}>
          <h6 className="pm-section-title">Financial</h6>
          <div className="pm-field-grid">
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
            <Field
              label="Gross Margin"
              value={formatCurrency(doc.gross_margin)}
            />
            <Field
              label="Gross Margin (%)"
              value={
                doc.per_gross_margin != null ? `${doc.per_gross_margin}%` : null
              }
            />
            <Field label="Cost Center" value={doc.cost_center} />
          </div>
        </div>

        <div className="frappe-card" style={{ padding: "16px 20px" }}>
          <h6 className="pm-section-title">Assignment</h6>
          <div className="pm-field-grid">
            <Field label="Owner" value={doc.owner} />
            <Field label="Created On" value={formatDate(doc.creation)} />
            <Field label="Last Modified" value={formatDate(doc.modified)} />
          </div>
        </div>
      </div>
    </div>
  );
}
