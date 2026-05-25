import React, { useEffect, useMemo, useState } from "react";

type JobOpening = {
  name: string;
  job_title?: string;
  status?: string;
  department?: string;
};

type Applicant = {
  name: string;
  applicant_name?: string;
  status?: string;
  creation?: string;
  email_id?: string;
  phone_number?: string;
  job_title?: string;
  custom_application_stage?: string;
  designation?: string;
  applicant_rating?: number;
};

type SortKey =
  | "applicant_name"
  | "custom_application_stage"
  | "status"
  | "designation"
  | "email_id"
  | "phone_number"
  | "creation";

const STAGES = [
  "APPLICATION RECEIVED",
  "HR SCREENING",
  "SHORTLISTED",
  "INTERVIEW SCHEDULED",
  "INTERVIEWED",
  "REFERENCE CHECK",
  "FINALIST",
  "OFFER_PREP",
  "OFFER SENT",
  "OFFER ACCEPTED",
  "OFFER DECLINED",
  "REJECTED EARLY",
  "REJECTED LATE",
  "WITHDRAWN",
];

function stageClass(stage?: string) {
  if (!stage) return "badge-secondary";
  const positive = [
    "SHORTLISTED",
    "FINALIST",
    "OFFER ACCEPTED",
    "OFFER SENT",
    "OFFER_PREP",
    "INTERVIEWED",
    "REFERENCE CHECK",
    "INTERVIEW SCHEDULED",
  ];
  const negative = ["REJECTED EARLY", "REJECTED LATE", "OFFER DECLINED", "WITHDRAWN"];
  const neutral = ["APPLICATION RECEIVED", "HR SCREENING"];
  if (positive.includes(stage)) return "badge-success";
  if (negative.includes(stage)) return "badge-danger";
  if (neutral.includes(stage)) return "badge-info";
  return "badge-secondary";
}

function stars(rating?: number) {
  if (!rating) return "-";
  const filled = Math.round(Number(rating) * 5);
  return `${"★".repeat(filled)}${"☆".repeat(Math.max(0, 5 - filled))}`;
}

export function JobApplicationsTab() {
  const frappe = (globalThis as any).frappe;

  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [jobCounts, setJobCounts] = useState<Record<string, number>>({});
  const [jobSearch, setJobSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);

  const [appsLoading, setAppsLoading] = useState(false);
  const [apps, setApps] = useState<Applicant[]>([]);
  const [stageFilter, setStageFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<SortKey>("creation");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Job Opening",
        fields: ["name", "job_title", "status", "department"],
        order_by: "posted_on desc",
        limit_page_length: 500,
      },
      callback: (r: any) => {
        const rows: JobOpening[] = (r && r.message) || [];
        setJobs(rows);
        if (!selectedJob && rows.length) setSelectedJob(rows[0]);
        rows.forEach((job) => {
          frappe.call({
            method: "frappe.client.get_count",
            args: {
              doctype: "Job Applicant",
              filters: [["Job Applicant", "job_title", "=", job.name]],
            },
            callback: (res: any) => {
              setJobCounts((prev) => ({ ...prev, [job.name]: res.message || 0 }));
            },
          });
        });
      },
    });
  }, []);

  useEffect(() => {
    if (!selectedJob?.name) return;
    setAppsLoading(true);
    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Job Applicant",
        fields: [
          "name",
          "applicant_name",
          "status",
          "creation",
          "email_id",
          "phone_number",
          "job_title",
          "custom_application_stage",
          "designation",
          "applicant_rating",
        ],
        filters: [["Job Applicant", "job_title", "=", selectedJob.name]],
        order_by: "creation desc",
        limit_page_length: 500,
      },
      callback: (r: any) => {
        setApps((r && r.message) || []);
        setAppsLoading(false);
      },
      error: () => {
        setApps([]);
        setAppsLoading(false);
      },
    });
  }, [selectedJob?.name]);

  const filteredJobs = useMemo(() => {
    const q = jobSearch.toLowerCase().trim();
    if (!q) return jobs;
    return jobs.filter(
      (j) =>
        (j.job_title || "").toLowerCase().includes(q) ||
        (j.department || "").toLowerCase().includes(q),
    );
  }, [jobs, jobSearch]);

  const filteredApps = useMemo(() => {
    let out = [...apps];
    const q = search.toLowerCase().trim();
    if (q) {
      const keys: Array<keyof Applicant> = [
        "applicant_name",
        "status",
        "email_id",
        "phone_number",
        "custom_application_stage",
        "designation",
      ];
      out = out.filter((a) => keys.some((k) => String(a[k] || "").toLowerCase().includes(q)));
    }
    if (stageFilter) out = out.filter((a) => a.custom_application_stage === stageFilter);

    out.sort((a, b) => {
      const va = String(a[sortCol] || "").toLowerCase();
      const vb = String(b[sortCol] || "").toLowerCase();
      if (va === vb) return 0;
      return sortOrder === "asc" ? (va < vb ? -1 : 1) : va > vb ? -1 : 1;
    });
    return out;
  }, [apps, search, stageFilter, sortCol, sortOrder]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    apps.forEach((a) => {
      const s = a.custom_application_stage || "Unknown";
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [apps]);

  const onSort = (col: SortKey) => {
    if (sortCol === col) setSortOrder((s) => (s === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortOrder("asc");
    }
  };

  return (
    <div className="row">
      <div className="col-md-3 mb-3">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body">
            <div className="text-muted mb-2" style={{ fontSize: 11, fontWeight: 600 }}>
              JOB OPENINGS
            </div>
            <input
              className="form-control form-control-sm mb-2"
              placeholder="Filter jobs..."
              value={jobSearch}
              onChange={(e) => setJobSearch(e.target.value)}
            />
            <div style={{ maxHeight: 560, overflowY: "auto" }}>
              {filteredJobs.map((job) => {
                const active = selectedJob?.name === job.name;
                const count = jobCounts[job.name];
                return (
                  <div
                    key={job.name}
                    className={`p-2 mb-1 border rounded ${active ? "bg-light" : ""}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setSelectedJob(job);
                      setSearch("");
                      setStageFilter("");
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <strong style={{ fontSize: 12 }}>{job.job_title || job.name}</strong>
                      <span className={`badge ${count ? "badge-primary" : "badge-secondary"}`}>
                        {count ?? "..."}
                      </span>
                    </div>
                    <small className="text-muted">
                      {job.status || "Unknown"} {job.department ? `• ${job.department}` : ""}
                    </small>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="col-md-9">
        {!selectedJob ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-muted">No job selected.</div>
          </div>
        ) : (
          <>
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center flex-wrap">
                  <div>
                    <h6 className="mb-1">
                      Applications for{" "}
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          frappe?.set_route("Form", "Job Opening", selectedJob.name);
                        }}
                      >
                        {selectedJob.job_title || selectedJob.name}
                      </a>
                    </h6>
                    <small className="text-muted">Click a row to open applicant record</small>
                  </div>
                  <button
                    className="btn btn-default btn-sm"
                    onClick={() => frappe?.set_route("job-opening-dashboard")}
                  >
                    Open Job Opening Dashboard
                  </button>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong style={{ fontSize: 12 }}>Application Frequency (by Stage)</strong>
                  <small className="text-muted">Top stages</small>
                </div>
                {!stageCounts.length ? (
                  <div className="text-muted small">No stage data yet.</div>
                ) : (
                  stageCounts.map(([stage, count]) => {
                    const max = stageCounts[0][1] || 1;
                    const pct = Math.round((count / max) * 100);
                    return (
                      <div key={stage} className="mb-2">
                        <div className="d-flex justify-content-between">
                          <small>{stage}</small>
                          <small className="font-weight-bold">{count}</small>
                        </div>
                        <div className="progress" style={{ height: 6 }}>
                          <div className="progress-bar" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap">
                  <span className="text-muted font-weight-bold" style={{ fontSize: 12 }}>
                    Applicants
                  </span>
                  <div className="d-flex" style={{ gap: 8 }}>
                    <select
                      className="form-control form-control-sm"
                      style={{ width: 210 }}
                      value={stageFilter}
                      onChange={(e) => setStageFilter(e.target.value)}
                    >
                      <option value="">All Stages</option>
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <input
                      className="form-control form-control-sm"
                      style={{ width: 210 }}
                      placeholder="Search applicants..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                {appsLoading ? (
                  <div className="text-muted">Loading applications...</div>
                ) : !filteredApps.length ? (
                  <div className="text-muted">No applications found for this job opening.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th style={{ cursor: "pointer" }} onClick={() => onSort("applicant_name")}>
                            Applicant
                          </th>
                          <th
                            style={{ cursor: "pointer" }}
                            onClick={() => onSort("custom_application_stage")}
                          >
                            Stage
                          </th>
                          <th style={{ cursor: "pointer" }} onClick={() => onSort("status")}>
                            Status
                          </th>
                          <th style={{ cursor: "pointer" }} onClick={() => onSort("designation")}>
                            Designation
                          </th>
                          <th style={{ cursor: "pointer" }} onClick={() => onSort("email_id")}>
                            Email
                          </th>
                          <th style={{ cursor: "pointer" }} onClick={() => onSort("phone_number")}>
                            Mobile
                          </th>
                          <th>Rating</th>
                          <th style={{ cursor: "pointer" }} onClick={() => onSort("creation")}>
                            Applied On
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredApps.map((app, idx) => (
                          <tr
                            key={app.name}
                            style={{ cursor: "pointer" }}
                            onClick={() => frappe?.set_route("Form", "Job Applicant", app.name)}
                          >
                            <td className="text-muted small">{idx + 1}</td>
                            <td>{app.applicant_name || "-"}</td>
                            <td>
                              <span className={`badge ${stageClass(app.custom_application_stage)}`}>
                                {app.custom_application_stage || "-"}
                              </span>
                            </td>
                            <td>{app.status || "-"}</td>
                            <td>{app.designation || "-"}</td>
                            <td>{app.email_id || "-"}</td>
                            <td>{app.phone_number || "-"}</td>
                            <td style={{ color: "#f0ad4e" }}>{stars(app.applicant_rating)}</td>
                            <td>{app.creation ? frappe.datetime.str_to_user(app.creation) : "-"}</td>
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
    </div>
  );
}

