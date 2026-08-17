import React, { useEffect, useState } from "react";
import { SectionCard } from "../components/SectionCard";
import { RelatedTable, Column } from "../components/RelatedTable";
import { frappeCall, openForm } from "../utils/frappe";
import { formatDateOrDash } from "../utils/format";

type StatusReport = {
  name: string;
  from_date?: string;
  to_date?: string;
  report_type?: string;
  report_date?: string;
  workflow_state?: string;
  docstatus: number;
};

const STATE_COLOR: Record<string, string> = {
  Draft: "gray",
  "Submitted to SMT": "blue",
  "Needs Clarification": "orange",
  Reviewed: "blue",
  Approved: "green",
  Rejected: "red",
};

function StatePill({ state }: { state?: string }) {
  const label = state || "Draft";
  const color = STATE_COLOR[label] ?? "gray";
  return (
    <span className={`indicator-pill ${color}`} style={{ fontSize: 12 }}>
      <span>{label}{label === "Approved" ? " ✓" : ""}</span>
    </span>
  );
}

function pdfUrl(name: string) {
  return `/api/method/frappe.utils.print_format.download_pdf?doctype=${encodeURIComponent(
    "Project Status Report"
  )}&name=${encodeURIComponent(name)}&no_letterhead=0`;
}

export function StatusReportsTab({ projectId }: { projectId: string }) {
  const [reports, setReports] = useState<StatusReport[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const r = await frappeCall(
        "corporate_services.api.project.get_project_status_reports",
        { project_name: projectId }
      );
      setReports(r?.message ?? []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [projectId]);

  const openNewReport = () => {
    openForm("Project Status Report", "new-project-status-report-1");
    setTimeout(() => {
      const f = (globalThis as any).cur_frm;
      if (f && f.doctype === "Project Status Report") {
        f.set_value("project", projectId);
      }
    }, 800);
  };

  const columns: Column<StatusReport>[] = [
    {
      header: "Report #",
      render: (r) => (
        <a
          className="pm-proj-link"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            openForm("Project Status Report", r.name);
          }}
        >
          {r.name}
        </a>
      ),
    },
    {
      header: "Period",
      render: (r) =>
        r.from_date || r.to_date
          ? `${formatDateOrDash(r.from_date)} - ${formatDateOrDash(r.to_date)}`
          : "-",
    },
    { header: "Type", render: (r) => r.report_type || "-" },
    { header: "Date", render: (r) => formatDateOrDash(r.report_date) },
    { header: "Status", render: (r) => <StatePill state={r.workflow_state} /> },
    {
      header: "Action",
      render: (r) => (
        <a className="btn btn-sm btn-primary" href={pdfUrl(r.name)} target="_blank" rel="noreferrer">
          View PDF
        </a>
      ),
    },
  ];

  return (
    <div className="pm-fade-in">
      <SectionCard
        title="Status Reports"
        right={
          <button type="button" className="btn btn-sm btn-primary" onClick={openNewReport}>
            + New Status Report
          </button>
        }
      >
        {loading ? (
          <div className="text-muted">Loading status reports…</div>
        ) : (
          <RelatedTable
            columns={columns}
            rows={reports}
            getKey={(r) => r.name}
            emptyText="No status reports have been submitted for this project yet."
          />
        )}
      </SectionCard>
    </div>
  );
}
