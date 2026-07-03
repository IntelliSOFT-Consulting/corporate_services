import React, { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../project_components/components/SectionCard";
import { RelatedTable, Column } from "../project_components/components/RelatedTable";
import { ProjectChartCard } from "../project_components/ProjectCharts";
import { openForm } from "../project_components/utils/frappe";
import { formatDateOrDash } from "../project_components/utils/format";

interface Props {
  projectId?: string;
}

const ROWS_PER_PAGE = 10;

const STATUS_COLOR: Record<string, string> = {
  completed: "green",
  done: "green",
  "in progress": "blue",
  ongoing: "blue",
  "not started": "gray",
  pending: "orange",
  "on hold": "orange",
  delayed: "red",
  overdue: "red",
  cancelled: "red",
};

const DONE = new Set(["completed", "done"]);

function WorkStatusBadge({ status }: { status?: string }) {
  const text = (status || "").trim();
  if (!text) return <span className="text-muted">-</span>;
  const color = STATUS_COLOR[text.toLowerCase()] ?? "gray";
  return (
    <span
      className={`indicator-pill ${color}`}
      style={{ fontSize: 12, whiteSpace: "nowrap" }}
    >
      <span>{text}</span>
    </span>
  );
}

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  const empty = value == null || value === "";
  return (
    <div className="pm-kpi">
      <div className="pm-kpi-label">{label}</div>
      <div className="pm-kpi-value">{empty ? "-" : value}</div>
    </div>
  );
}

type WorkRow = {
  line_item?: string;
  key_deliverable?: string;
  start_date?: string;
  end_date?: string;
  expected_outcome?: string;
  status?: string;
  resources?: string;
  comments?: string;
};

type DetailedRow = {
  item?: string;
  activities?: string;
  resources?: string;
  duration_loe?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
};

type LoeSummaryRow = { label: string; loe: number };

function groupLoe(rows: DetailedRow[], key: keyof DetailedRow): LoeSummaryRow[] {
  const map: Record<string, number> = {};
  for (const r of rows) {
    const k = (r[key] as string | undefined)?.trim() || "Unassigned";
    map[k] = (map[k] || 0) + (r.duration_loe || 0);
  }
  return Object.entries(map)
    .map(([label, loe]) => ({ label, loe }))
    .sort((a, b) => b.loe - a.loe);
}

function workingDaysBetween(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return null;
  let days = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days++;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function LoeSummary({ rows, plan }: { rows: DetailedRow[]; plan: any | null }) {
  const totalLoe = rows.reduce((s, r) => s + (r.duration_loe || 0), 0);
  const byPhase = groupLoe(rows, "item");
  const byResource = groupLoe(rows, "resources");
  const availDays = workingDaysBetween(plan?.project_start_date, plan?.project_end_date);

  if (!rows.length) return null;

  const pct = availDays ? Math.min(100, Math.round((totalLoe / availDays) * 100)) : null;
  const overAllocated = availDays != null && totalLoe > availDays;

  return (
    <div className="frappe-card" style={{ padding: "16px 20px", marginBottom: 16 }}>
      <h6 className="pm-section-title">LOE Summary</h6>

      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ minWidth: 120 }}>
          <div className="pm-field-label">Total Planned LOE</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: overAllocated ? "#e03131" : "#2f9e44" }}>
            {totalLoe} <span style={{ fontSize: 13, fontWeight: 400 }}>days</span>
          </div>
        </div>
        {availDays != null && (
          <div style={{ minWidth: 120 }}>
            <div className="pm-field-label">Available Working Days</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{availDays}</div>
          </div>
        )}
        {pct != null && (
          <div style={{ flex: 1, minWidth: 180, alignSelf: "flex-end" }}>
            <div className="pm-field-label" style={{ marginBottom: 4 }}>
              LOE Utilisation ({pct}%){overAllocated ? " - Over-allocated" : ""}
            </div>
            <div className="pm-progress-bar-track">
              <div
                className="pm-progress-bar-fill"
                style={{ width: `${Math.min(pct, 100)}%`, background: overAllocated ? "#e03131" : undefined }}
              />
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <div className="pm-field-label" style={{ marginBottom: 8 }}>By Phase / Item</div>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", paddingBottom: 4, color: "var(--text-muted)", fontWeight: 500 }}>Phase</th>
                <th style={{ textAlign: "right", paddingBottom: 4, color: "var(--text-muted)", fontWeight: 500 }}>LOE (days)</th>
              </tr>
            </thead>
            <tbody>
              {byPhase.map(({ label, loe }) => (
                <tr key={label} style={{ borderTop: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "4px 0" }}>{label}</td>
                  <td style={{ textAlign: "right", fontWeight: 600, padding: "4px 0" }}>{loe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <div className="pm-field-label" style={{ marginBottom: 8 }}>By Resource</div>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", paddingBottom: 4, color: "var(--text-muted)", fontWeight: 500 }}>Resource</th>
                <th style={{ textAlign: "right", paddingBottom: 4, color: "var(--text-muted)", fontWeight: 500 }}>LOE (days)</th>
              </tr>
            </thead>
            <tbody>
              {byResource.map(({ label, loe }) => (
                <tr key={label} style={{ borderTop: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "4px 0" }}>{label}</td>
                  <td style={{ textAlign: "right", fontWeight: 600, padding: "4px 0" }}>{loe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const wrap = (text?: string) => (
  <span style={{ whiteSpace: "pre-wrap" }}>{text || "-"}</span>
);

const columns: Column<WorkRow>[] = [
  { header: "Line Item", render: (r) => r.line_item || "-" },
  { header: "Key Deliverable", render: (r) => r.key_deliverable || "-" },
  { header: "Start", render: (r) => formatDateOrDash(r.start_date) },
  { header: "End", render: (r) => formatDateOrDash(r.end_date) },
  { header: "Expected Outcome", render: (r) => wrap(r.expected_outcome) },
  { header: "Status", render: (r) => <WorkStatusBadge status={r.status} /> },
  { header: "Resources", render: (r) => wrap(r.resources) },
  { header: "Comments", render: (r) => wrap(r.comments) },
];

const WorkPlanPage: React.FC<Props> = ({ projectId: propProjectId }) => {
  const projectId =
    propProjectId ||
    (typeof document !== "undefined"
      ? document.querySelector(".pm-detail-id")?.textContent?.trim() || ""
      : "");

  const [loading, setLoading] = useState(false);
  const [highPlan, setHighPlan] = useState<any | null>(null);
  const [highPlanRows, setHighPlanRows] = useState<WorkRow[]>([]);
  const [detailedPlan, setDetailedPlan] = useState<any | null>(null);
  const [detailedRows, setDetailedRows] = useState<DetailedRow[]>([]);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    const fetchPlans = async () => {
      try {
        const resp = await (globalThis as any).frappe.call({
          method:
            "corporate_services.icl_corporate_services.doctype.high_level_work_plan.high_level_work_plan.get_plans_for_project",
          args: { project: projectId },
        });
        setHighPlan(resp?.message?.high ?? null);
        setDetailedPlan(resp?.message?.detailed ?? null);
        setHighPlanRows(resp?.message?.high_rows ?? []);
        setDetailedRows(resp?.message?.detailed_rows ?? []);
      } catch (e) {
        setHighPlan(null);
        setDetailedPlan(null);
      } finally {
        setLoading(false);
      }
    };
    void fetchPlans();
  }, [projectId]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    highPlanRows.forEach((r) => r.status && set.add(r.status));
    return Array.from(set);
  }, [highPlanRows]);

  const statusBreakdown = useMemo(() => {
    const grouped: Record<string, number> = {};
    highPlanRows.forEach((r) => {
      const key = r.status || "Not Set";
      grouped[key] = (grouped[key] || 0) + 1;
    });
    return Object.entries(grouped).map(([label, value]) => ({ label, value }));
  }, [highPlanRows]);

  const completedPct = useMemo(() => {
    if (!highPlanRows.length) return 0;
    const done = highPlanRows.filter((r) =>
      DONE.has((r.status || "").toLowerCase()),
    ).length;
    return Math.round((done / highPlanRows.length) * 100);
  }, [highPlanRows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return highPlanRows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.line_item, r.key_deliverable, r.expected_outcome, r.resources, r.comments]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [highPlanRows, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * ROWS_PER_PAGE;
  const pagedRows = filtered.slice(start, start + ROWS_PER_PAGE);

  const downloadHighLevelTemplate = async () => {
    if (!projectId) {
      (globalThis as any).frappe?.msgprint({
        title: "Project Required",
        message: "Project ID is required to download the template.",
        indicator: "orange",
      });
      return;
    }
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
        const url = tpl.attachment.startsWith("/")
          ? tpl.attachment
          : "/files/" + tpl.attachment;
        window.open(url, "_blank", "noreferrer");
        return;
      }
    } catch (e) {
      // continue to api fallback
    }

    try {
      const apiUrl = `/api/project/project_work_plan/high_level?project=${encodeURIComponent(projectId)}`;
      const r = await fetch(apiUrl, { credentials: "same-origin" });
      if (!r.ok) throw new Error("Template not available from API");
      const ct = r.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const j = await r.json();
        if (j?.file_url) {
          window.open(j.file_url, "_blank", "noreferrer");
          return;
        }
      }
      const blob = await r.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "high_level_work_plan_template";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      (globalThis as any).frappe?.msgprint({
        title: "Download Failed",
        message: e?.message || "Could not download template.",
        indicator: "red",
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center text-muted" style={{ padding: "48px 0" }}>
        <div className="spinner-border spinner-border-sm" role="status" />
        <div style={{ marginTop: 10 }}>Loading work plan…</div>
      </div>
    );
  }

  return (
    <div className="pm-fade-in">
      {/* -- High Level Work Plan -- */}
      {highPlan ? (
        <>
          <div className="pm-kpi-strip">
            <Kpi label="Project Lead" value={highPlan.project_lead} />
            <Kpi
              label="Start Date"
              value={formatDateOrDash(highPlan.project_start_date)}
            />
            <Kpi
              label="End Date"
              value={formatDateOrDash(highPlan.project_end_date)}
            />
            <Kpi label="Duration" value={highPlan.project_duration} />
            <Kpi label="Items" value={highPlanRows.length} />
            <Kpi label="Completed" value={`${completedPct}%`} />
          </div>

          <SectionCard
            title="High Level Work Plan"
            right={
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => openForm("High Level Work Plan", highPlan.name)}
                >
                  Open Plan
                </button>
                {highPlan?.entry_type === "Template Import" && (
                  <button
                    type="button"
                    className="btn btn-sm btn-default"
                    onClick={() => void downloadHighLevelTemplate()}
                  >
                    Download Template
                  </button>
                )}
              </div>
            }
          >
            <div className="pm-field-label" style={{ marginBottom: 4 }}>
              Overall Completion
            </div>
            <div className="pm-progress-bar-track">
              <div
                className="pm-progress-bar-fill"
                style={{ width: `${completedPct}%` }}
              />
            </div>
          </SectionCard>

          {statusBreakdown.length > 0 && (
            <div className="pm-charts-grid" style={{ marginBottom: 16 }}>
              <ProjectChartCard
                title="Work Plan Items by Status"
                items={statusBreakdown}
                emptyText="No work plan items yet."
              />
            </div>
          )}

          <SectionCard
            title="High Level Work Plan Items"
            count={filtered.length}
            countLabel="item"
            right={
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="text"
                  className="form-control input-sm"
                  placeholder="Search items…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  style={{ width: 180, height: 28, fontSize: 13 }}
                />
                <select
                  className="form-control input-sm"
                  aria-label="Filter work plan items by status"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  style={{ width: 150, height: 28, fontSize: 13 }}
                >
                  <option value="">All statuses</option>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            }
          >
            <RelatedTable
              columns={columns}
              rows={pagedRows}
              getKey={(_, idx) => String(start + idx)}
              emptyText={
                query || statusFilter
                  ? "No items match your filters."
                  : "No work plan items found."
              }
            />

            {filtered.length > ROWS_PER_PAGE && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 12,
                }}
              >
                <span className="text-muted" style={{ fontSize: 12 }}>
                  Showing {start + 1}–
                  {Math.min(start + ROWS_PER_PAGE, filtered.length)} of{" "}
                  {filtered.length}
                </span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn btn-default btn-sm"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="text-muted" style={{ fontSize: 12 }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-default btn-sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </SectionCard>
        </>
      ) : (
        <div
          className="frappe-card"
          style={{ padding: "24px 20px", textAlign: "center", marginBottom: 16 }}
        >
          <h6 className="pm-section-title" style={{ justifyContent: "center" }}>
            No High Level Work Plan
          </h6>
          <p className="text-muted" style={{ fontSize: 13 }}>
            No High Level Work Plan exists for this project yet. Create one (New →
            High Level Work Plan) or start from the template.
          </p>
          <button
            type="button"
            className="btn btn-sm btn-default"
            onClick={() => void downloadHighLevelTemplate()}
          >
            Download Template
          </button>
        </div>
      )}

      {/* -- LOE Summary -- */}
      <LoeSummary rows={detailedRows} plan={highPlan} />

      {/* -- Detailed Work Plan -- */}
      {detailedPlan ? (
        <SectionCard
          title="Detailed Work Plan"
          right={
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => openForm("Detailed Work Plan", detailedPlan.name)}
            >
              Open Plan
            </button>
          }
        >
          <div className="pm-field-value">{detailedPlan.name}</div>
        </SectionCard>
      ) : (
        <div
          className="frappe-card"
          style={{ padding: "24px 20px", textAlign: "center" }}
        >
          <h6 className="pm-section-title" style={{ justifyContent: "center" }}>
            No Detailed Work Plan
          </h6>
          <p className="text-muted" style={{ fontSize: 13, marginBottom: 0 }}>
            No Detailed Work Plan exists for this project yet. Create one (New →
            Detailed Work Plan).
          </p>
        </div>
      )}
    </div>
  );
};

export default WorkPlanPage;
