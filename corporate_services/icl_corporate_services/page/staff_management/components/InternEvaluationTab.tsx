import React, { useEffect, useMemo, useState } from "react";

type InternEvaluationRow = {
  name: string;
  intern_name?: string;
  department?: string;
  review_period?: string;
  assessment_date?: string;
  modified?: string;
};

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="col-md-4 mb-3">
      <div className="card border h-100">
        <div className="card-body">
          <div className="text-muted" style={{ fontSize: 12 }}>
            {label}
          </div>
          <div style={{ fontSize: 26, fontWeight: 600 }}>{value}</div>
        </div>
      </div>
    </div>
  );
}

function BarList({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: number }>;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="card border mb-3">
      <div className="card-body">
        <h6 className="mb-3">{title}</h6>
        {!items.length ? (
          <div className="text-muted">No data available.</div>
        ) : (
          items.map((item) => (
            <div key={item.label} className="mb-2">
              <div className="d-flex justify-content-between">
                <span style={{ fontSize: 12 }}>{item.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{item.value}</span>
              </div>
              <div style={{ height: 8, background: "#eef1f4", borderRadius: 4 }}>
                <div
                  style={{
                    height: "100%",
                    width: `${(item.value / max) * 100}%`,
                    background: "#4f46e5",
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function InternEvaluationTab() {
  const frappe = (globalThis as any).frappe;
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InternEvaluationRow[]>([]);

  useEffect(() => {
    setLoading(true);
    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Intern Evaluation",
        fields: [
          "name",
          "intern_name",
          "department",
          "review_period",
          "assessment_date",
          "modified",
        ],
        order_by: "modified desc",
        limit_page_length: 100,
      },
      callback: (r: any) => {
        setRows((r && r.message) || []);
        setLoading(false);
      },
      error: () => {
        setRows([]);
        setLoading(false);
      },
    });
  }, []);

  const metrics = useMemo(() => {
    const total = rows.length;
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const submittedThisMonth = rows.filter((row) => {
      if (!row.assessment_date) return false;
      const d = new Date(row.assessment_date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;
    const deptCount = new Set(rows.map((r) => r.department).filter(Boolean)).size;
    return { total, submittedThisMonth, deptCount };
  }, [rows]);

  const byReviewPeriod = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row) => {
      const key = row.review_period || "Not Set";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [rows]);

  const byDepartment = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row) => {
      const key = row.department || "Not Set";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [rows]);

  return (
    <div>
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap mb-2">
            <div>
              <h6 className="mb-1">Intern Evaluation</h6>
              <p className="text-muted mb-0" style={{ fontSize: 12 }}>
                Dashboard for intern evaluation submissions and trends.
              </p>
            </div>
            <div className="d-flex" style={{ gap: 8 }}>
              <button
                className="btn btn-default btn-sm"
                onClick={() => frappe?.set_route("List", "Intern Evaluation")}
              >
                View List
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => frappe?.new_doc("Intern Evaluation")}
              >
                New Intern Evaluation
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-muted">Loading intern evaluation dashboard...</div>
      ) : (
        <>
          <div className="row">
            <MetricCard label="Total Evaluations" value={metrics.total} />
            <MetricCard label="Submitted This Month" value={metrics.submittedThisMonth} />
            <MetricCard label="Departments Covered" value={metrics.deptCount} />
          </div>

          <div className="row">
            <div className="col-md-6">
              <BarList title="Evaluations by Review Period" items={byReviewPeriod} />
            </div>
            <div className="col-md-6">
              <BarList title="Evaluations by Department" items={byDepartment} />
            </div>
          </div>

          <div className="card border">
            <div className="card-body">
              <h6 className="mb-3">Recent Evaluations</h6>
              {!rows.length ? (
                <div className="text-muted">No intern evaluations found.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm table-bordered align-middle">
                    <thead>
                      <tr>
                        <th>Evaluation</th>
                        <th>Intern</th>
                        <th>Department</th>
                        <th>Review Period</th>
                        <th>Assessment Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 15).map((row) => (
                        <tr key={row.name}>
                          <td>
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                frappe?.set_route("Form", "Intern Evaluation", row.name);
                              }}
                            >
                              {row.name}
                            </a>
                          </td>
                          <td>{row.intern_name || ""}</td>
                          <td>{row.department || ""}</td>
                          <td>{row.review_period || ""}</td>
                          <td>{row.assessment_date || ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
