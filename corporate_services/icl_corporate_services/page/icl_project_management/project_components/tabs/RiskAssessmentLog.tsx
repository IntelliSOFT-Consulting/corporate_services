import React, { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../components/SectionCard";
import { RelatedTable, Column } from "../components/RelatedTable";
import { frappeCall, openForm, showAlert } from "../utils/frappe";
import { formatDateOrDash } from "../utils/format";

type RaidRow = Record<string, any> & { name: string; assessment: string };

type CategoryKey = "risks" | "assumptions" | "issues" | "dependencies";

type CategoryCounts = { total: number; open: number; escalated: number };

type RiskLogData = {
  assessment: string | null;
  risks: RaidRow[];
  assumptions: RaidRow[];
  issues: RaidRow[];
  dependencies: RaidRow[];
  counts: Record<CategoryKey, CategoryCounts>;
};

const EMPTY_COUNTS: CategoryCounts = { total: 0, open: 0, escalated: 0 };

const EMPTY_DATA: RiskLogData = {
  assessment: null,
  risks: [],
  assumptions: [],
  issues: [],
  dependencies: [],
  counts: {
    risks: EMPTY_COUNTS,
    assumptions: EMPTY_COUNTS,
    issues: EMPTY_COUNTS,
    dependencies: EMPTY_COUNTS,
  },
};

const CATEGORIES: { key: CategoryKey; label: string; ownerField: string; statusOptions: string[] }[] = [
  { key: "risks", label: "Risks", ownerField: "risk_owner", statusOptions: ["Open", "Mitigated", "Escalated", "Closed"] },
  { key: "assumptions", label: "Assumptions", ownerField: "assumption_owner", statusOptions: ["Valid", "Invalidated", "Confirmed"] },
  { key: "issues", label: "Issues", ownerField: "issue_owner", statusOptions: ["Open", "In Progress", "Resolved", "Escalated"] },
  { key: "dependencies", label: "Dependencies", ownerField: "dependency_owner", statusOptions: ["Pending", "On Track", "At Risk", "Blocked", "Completed", "Escalated"] },
];

const STATUS_INDICATOR: Record<string, string> = {
  Open: "orange",
  Pending: "orange",
  "In Progress": "blue",
  "On Track": "blue",
  Valid: "blue",
  Escalated: "red",
  "At Risk": "red",
  Blocked: "red",
  Mitigated: "green",
  Resolved: "green",
  Completed: "green",
  Closed: "gray",
  Invalidated: "gray",
  Confirmed: "green",
};

function StatusPill({ value }: { value?: string }) {
  if (!value) return <span className="text-muted">-</span>;
  const color = STATUS_INDICATOR[value] ?? "gray";
  return (
    <span className={`indicator-pill ${color}`} style={{ fontSize: 12 }}>
      <span>{value}</span>
    </span>
  );
}

function ScoreBadge({ score }: { score?: number }) {
  if (score == null) return <span className="text-muted">-</span>;
  const color = score <= 2 ? "green" : score <= 4 ? "orange" : "red";
  return (
    <span className={`indicator-pill ${color}`} style={{ fontSize: 12 }}>
      <span>{score}</span>
    </span>
  );
}

function EditableOwner({
  value,
  onSave,
}: {
  value?: string;
  onSave: (next: string) => void;
}) {
  const [draft, setDraft] = useState(value || "");
  useEffect(() => setDraft(value || ""), [value]);
  return (
    <input
      type="text"
      className="form-control input-xs"
      style={{ fontSize: 12, minWidth: 140 }}
      placeholder="user@example.com"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft.trim() !== (value || "")) onSave(draft.trim());
      }}
    />
  );
}

function EditableStatus({
  value,
  options,
  onSave,
}: {
  value?: string;
  options: string[];
  onSave: (next: string) => void;
}) {
  return (
    <select
      className="form-control input-xs"
      style={{ fontSize: 12 }}
      value={value || options[0]}
      onChange={(e) => onSave(e.target.value)}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function RiskAssessmentLog({ projectId }: { projectId: string }) {
  const [data, setData] = useState<RiskLogData>(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("risks");

  const refresh = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const r = await frappeCall(
        "corporate_services.api.project.risk_log.get_project_risk_log",
        { project_name: projectId },
      );
      setData(r?.message ?? EMPTY_DATA);
    } catch {
      setData(EMPTY_DATA);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [projectId]);

  const category = useMemo(
    () => CATEGORIES.find((c) => c.key === activeCategory)!,
    [activeCategory],
  );

  const saveRow = async (row: RaidRow, patch: Record<string, any>) => {
    try {
      const r = await frappeCall(
        "corporate_services.api.project.risk_log.save_risk_log_row",
        {
          project_name: projectId,
          category: activeCategory,
          row: { name: row.name, ...patch },
        },
      );
      const saved = r?.message;
      setData((prev) => ({
        ...prev,
        assessment: saved?.assessment ?? prev.assessment,
        [activeCategory]: (prev[activeCategory] as RaidRow[]).map((existing) =>
          existing.name === row.name ? { ...existing, ...saved } : existing,
        ),
      }));
      showAlert("Saved.", "green", 3);
    } catch (e: any) {
      showAlert(e?.message || "Failed to save.", "red", 5);
    }
  };

  const handleExport = async (format: "excel" | "pdf") => {
    setExporting(format);
    try {
      const method =
        format === "excel"
          ? "corporate_services.api.project.risk_log.export_risk_log_excel"
          : "corporate_services.api.project.risk_log.export_risk_log_pdf";
      const r = await frappeCall(method, { project_name: projectId });
      const fileUrl = r?.message;
      if (fileUrl) window.open(fileUrl, "_blank", "noreferrer");
    } catch (e: any) {
      showAlert(e?.message || "Export failed.", "red", 5);
    } finally {
      setExporting(null);
    }
  };

  const openAssessmentForm = () => {
    if (data.assessment) {
      openForm("Project Risk Assessment", data.assessment);
      return;
    }
    openForm("Project Risk Assessment", "new-project-risk-assessment-1");
    setTimeout(() => {
      const f = (globalThis as any).cur_frm;
      if (f && f.doctype === "Project Risk Assessment") {
        f.set_value("project", projectId);
      }
    }, 800);
  };

  const columns: Column<RaidRow>[] = useMemo(() => {
    const ownerCol: Column<RaidRow> = {
      header: "Owner",
      render: (row) => (
        <EditableOwner
          value={row[category.ownerField]}
          onSave={(next) => saveRow(row, { [category.ownerField]: next })}
        />
      ),
    };
    const statusCol: Column<RaidRow> = {
      header: "Status",
      align: "center",
      render: (row) => (
        <EditableStatus
          value={row.status}
          options={category.statusOptions}
          onSave={(next) => saveRow(row, { status: next })}
        />
      ),
    };

    if (activeCategory === "risks") {
      return [
        { header: "Risk", render: (r) => r.risk || "-" },
        { header: "Areas Affected", render: (r) => r.areas_affected || "-" },
        { header: "Severity", render: (r) => r.severity || "-" },
        { header: "Likelihood", render: (r) => r.likelihood || "-" },
        { header: "Score", align: "center", render: (r) => <ScoreBadge score={r.risk_score} /> },
        ownerCol,
        statusCol,
        { header: "Recommended Action(s)", render: (r) => r.recommended_actions || "-" },
      ];
    }
    if (activeCategory === "assumptions") {
      return [
        { header: "Assumption", render: (r) => r.assumption || "-" },
        { header: "Areas Affected", render: (r) => r.areas_affected || "-" },
        ownerCol,
        statusCol,
        { header: "Impact if Invalid", render: (r) => r.impact_if_invalid || "-" },
        { header: "Recommended Action(s)", render: (r) => r.recommended_actions || "-" },
      ];
    }
    if (activeCategory === "issues") {
      return [
        { header: "Issue", render: (r) => r.issue || "-" },
        { header: "Areas Affected", render: (r) => r.areas_affected || "-" },
        { header: "Severity", render: (r) => r.severity || "-" },
        ownerCol,
        statusCol,
        { header: "Raised Date", render: (r) => formatDateOrDash(r.raised_date) },
        { header: "Resolution", render: (r) => r.resolution || "-" },
      ];
    }
    return [
      { header: "Dependency", render: (r) => r.dependency || "-" },
      { header: "Depends On", render: (r) => r.depends_on || "-" },
      ownerCol,
      { header: "Due Date", render: (r) => formatDateOrDash(r.due_date) },
      statusCol,
      { header: "Impact if Delayed", render: (r) => r.impact_if_delayed || "-" },
    ];
  }, [activeCategory, category, data]);

  const rows = data[activeCategory] as RaidRow[];

  return (
    <div className="pm-fade-in">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {CATEGORIES.map((c) => {
          const counts = data.counts[c.key] ?? EMPTY_COUNTS;
          return (
            <div
              key={c.key}
              className={`frappe-card pm-raid-summary-card ${activeCategory === c.key ? "active" : ""}`}
              style={{
                padding: "12px 16px",
                cursor: "pointer",
                border: activeCategory === c.key ? "1px solid #5c7cfa" : undefined,
              }}
              onClick={() => setActiveCategory(c.key)}
            >
              <div className="text-muted" style={{ fontSize: 12 }}>
                {c.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{counts.total}</div>
              <div style={{ fontSize: 11 }}>
                <span className="text-muted">{counts.open} open</span>
                {counts.escalated > 0 && (
                  <span style={{ color: "#e03131", marginLeft: 6 }}>
                    {counts.escalated} escalated
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pm-detail-tabs" style={{ marginBottom: 12 }}>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`pm-detail-tab ${activeCategory === c.key ? "active" : ""}`}
            onClick={() => setActiveCategory(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <SectionCard
        title={category.label}
        count={rows.length}
        countLabel={category.label.toLowerCase().replace(/s$/, "")}
        right={
          <>
            <button
              type="button"
              className="btn btn-sm btn-default"
              onClick={() => void refresh()}
              disabled={loading}
            >
              Refresh
            </button>
            <button
              type="button"
              className="btn btn-sm btn-default"
              onClick={() => void handleExport("excel")}
              disabled={exporting !== null}
            >
              {exporting === "excel" ? "Exporting…" : "Export Excel"}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-default"
              onClick={() => void handleExport("pdf")}
              disabled={exporting !== null}
            >
              {exporting === "pdf" ? "Exporting…" : "Export PDF"}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={openAssessmentForm}
            >
              Add / Edit Rows
            </button>
          </>
        }
      >
        {loading ? (
          <div className="text-muted">Loading risk log…</div>
        ) : (
          <RelatedTable
            columns={columns}
            rows={rows}
            getKey={(row) => row.name}
            emptyText={`No ${category.label.toLowerCase()} have been logged for this project yet.`}
          />
        )}
      </SectionCard>
    </div>
  );
}
