import React from "react";
import { StatusBadge } from "./StatusBadge";
import { openForm } from "../utils/frappe";

interface Props {
  projectId: string;
  title: string;
  status?: string;
  loading: boolean;
  onBack: () => void;
}

const NEW_ACTIONS = [
  { label: "+ New Status Report", href: "/app/project-status-report/new-project-status-report-1" },
  { label: "+ Add Milestone", href: "/app/project-milestone/new-project-milestone-1" },
  { label: "+ Create New Meeting", href: "/app/project-update/new-project-update-1" },
  { label: "+ Upload Document", href: "/app/file/new-file-1" },
];

export function ProjectHeader({
  projectId,
  title,
  status,
  loading,
  onBack,
}: Props) {
  return (
    <div className="pm-detail-header">
      <button
        type="button"
        className="pm-detail-back"
        onClick={onBack}
        title="Back to list"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span style={{ marginLeft: 4, fontSize: 13 }}>Back</span>
      </button>

      <h5 className="pm-detail-title">
        {loading ? "Loading…" : title}
        <span className="pm-detail-id">{projectId}</span>
      </h5>

      {!loading && <StatusBadge status={status} />}

      <div className="pm-detail-actions" style={{ display: "flex", gap: 8 }}>
        <details className="pm-action-menu">
          <summary className="btn btn-default btn-sm">+ New</summary>
          <div className="pm-action-menu-list">
            {NEW_ACTIONS.map((a) => (
              <a key={a.href} href={a.href}>
                {a.label}
              </a>
            ))}
          </div>
        </details>
        <button
          type="button"
          className="btn btn-default btn-sm"
          onClick={() => openForm("Project", projectId)}
        >
          Edit in Form
        </button>
      </div>
    </div>
  );
}
