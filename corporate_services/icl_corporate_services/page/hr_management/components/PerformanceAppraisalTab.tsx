import React, { useEffect, useState } from "react";

type PendingAppraisal = {
  name: string;
  workflow_state?: string;
};

type CycleRow = {
  name: string;
  evaluation_type?: string;
  from_start_date?: string;
  to_end_date?: string;
  date?: string;
  total?: number;
  completed?: number;
  pending?: number;
  status?: string;
  pending_appraisals?: PendingAppraisal[];
};

type Analytics = {
  total_graded?: number;
  avg_percentage?: number;
  rating_distribution?: { rating: string; count: number }[];
  by_department?: { department: string; avg: number }[];
};

const RATING_COLORS: Record<string, string> = {
  Exceptional: "#2e7d32",
  "Strong Performer": "#43a047",
  "Consistently Effective": "#7cb342",
  "Meets Expectation": "#c0ca33",
  "Below Expectation": "#fb8c00",
  Poor: "#f4511e",
  Unacceptable: "#e53935",
};

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="col">
      <div className="card border h-100">
        <div className="card-body py-2">
          <div className="text-muted" style={{ fontSize: 12 }}>
            {label}
          </div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{value}</div>
        </div>
      </div>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  suffix,
  color,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="d-flex align-items-center mb-2" style={{ gap: 8 }}>
      <div style={{ width: 160, fontSize: 12, color: "#444" }}>{label}</div>
      <div style={{ flex: 1, background: "#f0f1f3", borderRadius: 4, height: 18 }}>
        <div
          style={{
            width: `${Math.max(pct, value > 0 ? 4 : 0)}%`,
            background: color,
            height: "100%",
            borderRadius: 4,
            transition: "width .3s",
          }}
        />
      </div>
      <div style={{ width: 52, textAlign: "right", fontSize: 12, fontWeight: 600 }}>
        {value}
        {suffix || ""}
      </div>
    </div>
  );
}

function AnalyticsPanel() {
  const frappe = (globalThis as any).frappe;
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    frappe.call({
      method:
        "corporate_services.api.performance_appraisal.performance_appraisal.get_appraisal_analytics",
      callback: (r: any) => setData((r && r.message) || {}),
      error: () => setData({}),
    });
  }, []);

  if (!data) return null;

  const dist = data.rating_distribution || [];
  const byDept = data.by_department || [];
  const maxCount = Math.max(...dist.map((d) => d.count), 1);

  if (!data.total_graded) {
    return (
      <div className="card border mb-3">
        <div className="card-body text-muted" style={{ fontSize: 13 }}>
          No graded appraisals yet. Charts appear once supervisors submit
          appraisals back to HR.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="row g-2 mb-3" style={{ rowGap: 8 }}>
        <Metric label="Graded Appraisals" value={data.total_graded || 0} />
        <Metric label="Average Score" value={`${data.avg_percentage || 0}%`} />
        <Metric label="Rating Bands Used" value={dist.length} />
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="card border h-100">
            <div className="card-body">
              <h6 className="mb-3">Performance Rating Distribution</h6>
              {dist.map((d) => (
                <BarRow
                  key={d.rating}
                  label={d.rating}
                  value={d.count}
                  max={maxCount}
                  color={RATING_COLORS[d.rating] || "#5e64ff"}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card border h-100">
            <div className="card-body">
              <h6 className="mb-3">Average Score by Department</h6>
              {!byDept.length ? (
                <div className="text-muted" style={{ fontSize: 12 }}>
                  No department data.
                </div>
              ) : (
                byDept.map((d) => (
                  <BarRow
                    key={d.department}
                    label={d.department}
                    value={d.avg}
                    max={100}
                    suffix="%"
                    color="#5e64ff"
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const complete = status === "Completed";
  return (
    <span
      className={`badge ${complete ? "badge-success" : "badge-warning"}`}
      style={{
        background: complete ? "#d4edda" : "#fff3cd",
        color: complete ? "#155724" : "#856404",
        padding: "3px 8px",
        borderRadius: 4,
        fontSize: 12,
      }}
    >
      {status || "-"}
    </span>
  );
}

function HRGuide() {
  const [open, setOpen] = useState(true);
  return (
    <div className="card border mb-3">
      <div
        className="card-body"
        style={{ cursor: "pointer" }}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">How performance appraisals work</h6>
          <span className="text-muted">{open ? "▾" : "▸"}</span>
        </div>
        {open && (
          <div className="mt-3" style={{ fontSize: 13, lineHeight: 1.7 }}>
            <ol className="mb-2">
              <li>
                <strong>Set up a template (once).</strong> Create a{" "}
                <strong>Performance Appraisal Template</strong> and mark it{" "}
                <em>Active</em>. It defines the performance areas &amp; criteria, the
                rating scale, the score bands, and the supervisor-comment questions -
                all prefilled with defaults you can edit. Every appraisal is built
                from the active template, so update questions here, not on each form.
              </li>
              <li>
                <strong>Create a cycle.</strong> Click{" "}
                <strong>+ New Appraisal Cycle</strong>, set the evaluation type and
                period, then add every staff member in the <strong>Employees</strong>{" "}
                table. Leave the template blank to use the active one.
              </li>
              <li>
                <strong>Submit the cycle.</strong> One Performance Appraisal is created
                per employee - seeded with the template - and emailed to their
                supervisor (the employee is CC'd). Staff with no supervisor
                (<code>reports_to</code>) are skipped and flagged on the cycle.
              </li>
              <li>
                <strong>Supervisor completes it.</strong> The supervisor rates each
                area, answers the comment questions, and submits back to HR. On
                submission the appraisal is auto-graded: a <em>Score %</em> and{" "}
                <em>Performance Rating</em> band (with recommended action) appear on
                the form.
              </li>
              <li>
                <strong>HR reviews.</strong> HR approves, rejects, or requests
                clarification. A cycle stays <em>In Progress</em> until every appraisal
                is <em>Approved by HR</em>.
              </li>
            </ol>
            <p className="mb-0 text-muted">
              The charts below summarise graded appraisals. Use the toggle to focus on
              cycles that still need attention.{" "}
              <a
                href="/wiki/performance-appraisals"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read the full documentation →
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function PerformanceAppraisalTab() {
  const frappe = (globalThis as any).frappe;
  const [loading, setLoading] = useState(true);
  const [onlyIncomplete, setOnlyIncomplete] = useState(true);
  const [cycles, setCycles] = useState<CycleRow[]>([]);

  function load() {
    setLoading(true);
    frappe.call({
      method:
        "corporate_services.api.performance_appraisal.performance_appraisal.get_appraisal_cycles",
      args: { only_incomplete: onlyIncomplete ? 1 : 0 },
      callback: (r: any) => {
        setCycles((r && r.message) || []);
        setLoading(false);
      },
      error: () => {
        setCycles([]);
        setLoading(false);
      },
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyIncomplete]);

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center flex-wrap mb-3 gap-2">
        <div className="custom-control custom-switch">
          <input
            type="checkbox"
            className="custom-control-input"
            id="pa-only-incomplete"
            checked={onlyIncomplete}
            onChange={(e) => setOnlyIncomplete(e.target.checked)}
          />
          <label className="custom-control-label" htmlFor="pa-only-incomplete">
            Show only incomplete cycles
          </label>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-default"
            onClick={() => frappe?.set_route("List", "Performance Appraisal Cycle")}
          >
            Open List
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => frappe?.new_doc("Performance Appraisal Cycle")}
          >
            + New Appraisal Cycle
          </button>
        </div>
      </div>

      <HRGuide />

      <AnalyticsPanel />

      <div className="card border">
        <div className="card-body">
          <h6 className="mb-3">Appraisal Cycles</h6>
          {loading ? (
            <div className="text-muted">Loading cycles...</div>
          ) : !cycles.length ? (
            <div className="text-muted">
              {onlyIncomplete
                ? "No incomplete cycles. All appraisals are approved 🎉"
                : "No appraisal cycles yet. Create one to get started."}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-bordered align-middle">
                <thead>
                  <tr>
                    <th>Cycle</th>
                    <th>Evaluation Type</th>
                    <th>Period</th>
                    <th>Total</th>
                    <th>Completed</th>
                    <th>Pending</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cycles.map((c) => (
                    <tr key={c.name}>
                      <td>
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            frappe?.set_route(
                              "Form",
                              "Performance Appraisal Cycle",
                              c.name,
                            );
                          }}
                        >
                          {c.name}
                        </a>
                      </td>
                      <td>{c.evaluation_type || ""}</td>
                      <td>
                        {c.from_start_date || "?"} → {c.to_end_date || "?"}
                      </td>
                      <td>{c.total ?? 0}</td>
                      <td>{c.completed ?? 0}</td>
                      <td>{c.pending ?? 0}</td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
