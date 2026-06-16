import React, { useEffect, useMemo, useState } from "react";

type JobOpening = {
  name: string;
  job_title?: string;
  department?: string;
  designation?: string;
  employment_type?: string;
  status?: string;
  posted_on?: string;
  location?: string;
  vacancies?: number;
};

export function JobOpeningDashboardTab() {
  const frappe = (globalThis as any).frappe;
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<JobOpening[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Job Opening",
        fields: [
          "name",
          "job_title",
          "department",
          "designation",
          "employment_type",
          "status",
          "posted_on",
          "location",
          "vacancies",
        ],
        order_by: "posted_on desc",
        limit_page_length: 500,
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      ["job_title", "department", "designation", "employment_type", "status", "location"].some((k) =>
        String((r as any)[k] || "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [rows, search]);

  const openCount = rows.filter((r) => (r.status || "").toLowerCase() === "open").length;
  const closedCount = rows.filter((r) => (r.status || "").toLowerCase() !== "open").length;

  return (
    <div>
      <div className="d-flex justify-content-end align-items-center flex-wrap mb-3">
        <div className="d-flex" style={{ gap: 8 }}>
          <button className="btn btn-default btn-sm" onClick={() => frappe?.set_route("List", "Job Opening")}>
            View Job Openings
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => frappe?.new_doc("Job Opening")}>
            New Job Opening
          </button>
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-md-4 mb-2">
          <div className="card border h-100">
            <div className="card-body">
              <div className="text-muted" style={{ fontSize: 12 }}>
                Total Openings
              </div>
              <div style={{ fontSize: 26, fontWeight: 600 }}>{rows.length}</div>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-2">
          <div className="card border h-100">
            <div className="card-body">
              <div className="text-muted" style={{ fontSize: 12 }}>
                Open
              </div>
              <div style={{ fontSize: 26, fontWeight: 600, color: "#198754" }}>{openCount}</div>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-2">
          <div className="card border h-100">
            <div className="card-body">
              <div className="text-muted" style={{ fontSize: 12 }}>
                Closed / Other
              </div>
              <div style={{ fontSize: 26, fontWeight: 600, color: "#6c757d" }}>{closedCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-2">
        <input
          className="form-control form-control-sm"
          style={{ maxWidth: 320 }}
          placeholder="Search openings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-muted">Loading job openings...</div>
      ) : !filtered.length ? (
        <div className="text-muted">No job openings found.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-bordered align-middle">
            <thead>
              <tr>
                <th>Job Opening</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Employment Type</th>
                <th>Status</th>
                <th>Location</th>
                <th>Vacancies</th>
                <th>Posted On</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.name}>
                  <td>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        frappe?.set_route("Form", "Job Opening", row.name);
                      }}
                    >
                      {row.job_title || row.name}
                    </a>
                  </td>
                  <td>{row.department || ""}</td>
                  <td>{row.designation || ""}</td>
                  <td>{row.employment_type || ""}</td>
                  <td>{row.status || ""}</td>
                  <td>{row.location || ""}</td>
                  <td>{row.vacancies ?? ""}</td>
                  <td>{row.posted_on || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
