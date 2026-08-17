import React from "react";
import type { ProjectDetail } from "../types";
import { openForm } from "../utils/frappe";
import { formatDate } from "../utils/format";

interface Props {
  projectId: string;
  doc: ProjectDetail | null;
  loading: boolean;
  onBack: () => void;
  onGoToDashboard: () => void;
}

const RAG_COLOR: Record<string, string> = {
  Red: "#dc3545",
  Amber: "#e2a336",
  Green: "#2e9e5b",
  NotStarted: "#3b6fd1",
};
const RAG_LABEL: Record<string, string> = {
  Red: "At Risk",
  Amber: "Needs Attention",
  Green: "On Track",
  NotStarted: "Not Started",
};

const NEW_ACTIONS = [
  { label: "Project Meeting minutes", href: "/app/project-meeting-minutes" },
];

function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export function ProjectDetailHeader({ projectId, doc, loading, onBack, onGoToDashboard }: Props) {
  const pct = Math.min(100, Math.max(0, doc?.percent_complete ?? 0));
  const endDate = doc?.expected_end_date ? new Date(doc.expected_end_date) : null;
  const daysRemaining = endDate ? daysBetween(new Date(), endDate) : null;

  const openNewStatusReport = () => {
    openForm("Project Status Report", "new-project-status-report-1");
    setTimeout(() => {
      const f = (globalThis as any).cur_frm;
      if (f && f.doctype === "Project Status Report") {
        f.set_value("project", projectId);
      }
    }, 800);
  };

  return (
    <div style={{ borderBottom: "1px solid var(--border-color, #e2e6ea)", marginBottom: 12, paddingBottom: 12 }}>
      <div className="pm-breadcrumb">
        <a onClick={onGoToDashboard}>ICL Project Management</a>
        <span className="pm-breadcrumb-sep">›</span>
        <a onClick={onBack}>Projects</a>
        <span className="pm-breadcrumb-sep">›</span>
        <span>{projectId}</span>
      </div>

      <div className="pm-header-top-row">
        <h4 className="pm-header-title">{loading ? "Loading…" : doc?.project_name || projectId}</h4>

        {!loading && doc && (
          <div className="pm-header-dates">
            <div>
              {formatDate(doc.expected_start_date) ?? "-"} → {formatDate(doc.expected_end_date) ?? "-"}
            </div>
            {daysRemaining != null && (
              <div
                className="pm-header-days-remaining"
                style={{ color: daysRemaining < 0 ? "#dc3545" : "#e07b1a" }}
              >
                {daysRemaining >= 0
                  ? `${daysRemaining} days remaining`
                  : `${Math.abs(daysRemaining)} days overdue`}
              </div>
            )}
            <div className="pm-header-progress">
              <div className="pm-progress-bar-track">
                <div className="pm-progress-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span>{pct}%</span>
            </div>
          </div>
        )}
      </div>

      {!loading && doc && (
        <div className="pm-header-meta-row">
          <div className="pm-header-meta-left">
            <span className="pm-header-id-chip">{projectId}</span>
            {doc.rag && (
              <span
                className="pm-header-rag-pill"
                style={{ background: `${RAG_COLOR[doc.rag]}1a`, color: RAG_COLOR[doc.rag] }}
              >
                <span className="pm-header-rag-pill-dot" style={{ background: RAG_COLOR[doc.rag] }} />
                {RAG_LABEL[doc.rag]}
              </span>
            )}
            {doc.phase && <span className="pm-header-phase">{doc.phase}</span>}
          </div>

          <div className="pm-header-actions">
            <button type="button" className="btn btn-sm btn-primary" onClick={openNewStatusReport}>
              New Status Report
            </button>
            <details className="pm-action-menu">
              <summary className="btn btn-default btn-sm">Actions ▾</summary>
              <div className="pm-action-menu-list">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    openForm("Project", projectId);
                  }}
                >
                  Edit in Form
                </a>
                {NEW_ACTIONS.map((a) => (
                  <a key={a.href} href={a.href}>
                    {a.label}
                  </a>
                ))}
              </div>
            </details>
          </div>
        </div>
      )}

      {!loading && doc && (doc.customer || doc.pm_names) && (
        <div className="pm-header-sub-line">
          {doc.customer}
          {doc.pm_names ? ` - PM: ${doc.pm_names}` : ""}
        </div>
      )}

      <button type="button" className="pm-back-to-dashboard" onClick={onGoToDashboard}>
        ← Back to Dashboard
      </button>
    </div>
  );
}
