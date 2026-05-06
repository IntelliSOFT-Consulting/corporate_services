import React, { useEffect, useMemo, useRef, useState } from "react";
import PaginationControls from "./PaginationControls";

const DETAIL_API = "corporate_services.icl_corporate_services.page.timesheet_workflow.timesheet_workflow.get_timesheet_submission_details";
const COMMENT_LIST_API = "corporate_services.icl_corporate_services.page.timesheet_workflow.timesheet_workflow.get_timesheet_submission_comments";
const COMMENT_ADD_API = "corporate_services.icl_corporate_services.page.timesheet_workflow.timesheet_workflow.add_timesheet_submission_comment";
const WORKFLOW_ACTIONS_API = "corporate_services.icl_corporate_services.page.timesheet_workflow.timesheet_workflow.get_timesheet_submission_workflow_actions";
const WORKFLOW_APPLY_API = "corporate_services.icl_corporate_services.page.timesheet_workflow.timesheet_workflow.apply_timesheet_submission_workflow_action";
const ENTRY_PAGE_SIZE = 10;

function statusBadgeClass(status) {
  switch (status) {
    case "Approved":
      return "bg-success";
    case "Rejected":
      return "bg-danger";
    case "Cancelled":
      return "bg-secondary";
    default:
      return "bg-warning text-dark";
  }
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function renderTaskDetails(taskValue) {
  const raw = (taskValue || "").toString().trim();
  if (!raw) return "-";

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return "-";

  return (
    <div>
      {lines.map((line, index) => {
        const taskMatch = line.match(/^Task:\s*(.*)$/i);
        const deliverablesMatch = line.match(/^Deliverables:\s*(.*)$/i);

        if (taskMatch) {
          return (
            <div key={`task-line-${index}`}>
              <strong>Task:</strong> {taskMatch[1] || "-"}
            </div>
          );
        }

        if (deliverablesMatch) {
          return (
            <div key={`task-line-${index}`}>
              <strong>Deliverables:</strong> {deliverablesMatch[1] || "-"}
            </div>
          );
        }

        return <div key={`task-line-${index}`}>{line}</div>;
      })}
    </div>
  );
}

function useSubmissionCharts({ projects, tasks }) {
  useEffect(() => {
    if (typeof window.Chart === "undefined") return undefined;

    const Chart = window.Chart;
    ["submissionProjectChart", "submissionTaskChart"].forEach((id) => {
      const chart = Chart.getChart(id);
      if (chart) chart.destroy();
    });

    if (projects?.length) {
      const projectCanvas = document.getElementById("submissionProjectChart");
      if (projectCanvas) {
        new Chart(projectCanvas, {
          type: "doughnut",
          data: {
            labels: projects.map((row) => row.project_name || row.project || "-"),
            datasets: [
              {
                data: projects.map((row) => Number(row.hours || 0)),
                backgroundColor: [
                  "rgba(13, 110, 253, 0.75)",
                  "rgba(25, 135, 84, 0.75)",
                  "rgba(255, 193, 7, 0.75)",
                  "rgba(220, 53, 69, 0.75)",
                  "rgba(111, 66, 193, 0.75)",
                  "rgba(32, 201, 151, 0.75)",
                ],
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: { display: true, text: "Hours by Project" },
              legend: { position: "bottom" },
            },
          },
        });
      }
    }

    if (tasks?.length) {
      const taskCanvas = document.getElementById("submissionTaskChart");
      if (taskCanvas) {
        const sortedTasks = [...tasks].slice(0, 8);
        new Chart(taskCanvas, {
          type: "bar",
          data: {
            labels: sortedTasks.map((row) => row.task_name || row.task || "-"),
            datasets: [
              {
                label: "Hours",
                data: sortedTasks.map((row) => Number(row.hours || 0)),
                backgroundColor: "rgba(13, 110, 253, 0.75)",
                borderColor: "rgba(13, 110, 253, 1)",
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: "y",
            plugins: {
              title: { display: true, text: "Top Tasks by Hours" },
              legend: { display: false },
            },
            scales: {
              x: { beginAtZero: true },
            },
          },
        });
      }
    }

    return undefined;
  }, [projects, tasks]);
}

function SubmissionDetails({ submission, employee, onBack }) {
  const [details, setDetails] = useState(null);
  const [comments, setComments] = useState([]);
  const [workflowActions, setWorkflowActions] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [commentSaving, setCommentSaving] = useState(false);
  const [workflowSaving, setWorkflowSaving] = useState(false);
  const [workflowMenuOpen, setWorkflowMenuOpen] = useState(false);
  const [activeBreakdownTab, setActiveBreakdownTab] = useState("projects");
  const [entryPage, setEntryPage] = useState(1);
  const workflowMenuRef = useRef(null);

  const submissionName = submission?.name;

  const loadSubmissionData = () => {
    if (!submissionName) return;
    setLoading(true);

    frappe.call({
      method: DETAIL_API,
      args: { submission_name: submissionName },
      callback: (r) => {
        setDetails(r.message || null);
        setEntryPage(1);
        setLoading(false);
      },
    });

    frappe.call({
      method: COMMENT_LIST_API,
      args: { submission_name: submissionName },
      callback: (r) => {
        setComments(r.message || []);
      },
    });

    frappe.call({
      method: WORKFLOW_ACTIONS_API,
      args: { submission_name: submissionName },
      callback: (r) => {
        setWorkflowActions(r.message || []);
      },
    });
  };

  useEffect(() => {
    loadSubmissionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionName]);

  useEffect(() => {
    if (!workflowMenuOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (workflowMenuRef.current && !workflowMenuRef.current.contains(event.target)) {
        setWorkflowMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [workflowMenuOpen]);

  const handleCreateSalarySlip = () => {
    if (!details?.submission) return;

    frappe.call({
      method:
        "corporate_services.icl_corporate_services.page.timesheet_workflow.timesheet_workflow.create_salary_slip_from_timesheet",
      args: {
        submission_name: details.submission.name,
        employee: details.submission.employee,
      },
      callback: (r) => {
        if (r.message) {
          frappe.new_doc("Salary Slip", r.message);
          frappe.show_alert({
            message: __("Opening Salary Slip form..."),
            indicator: "green",
          });
        }
      },
      error: () => {
        frappe.show_alert({
          message: __("Error preparing Salary Slip data"),
          indicator: "red",
        });
      },
    });
  };

  const handleAddComment = () => {
    const text = (commentText || "").trim();
    if (!text || !submissionName) return;

    setCommentSaving(true);
    frappe.call({
      method: COMMENT_ADD_API,
      args: {
        submission_name: submissionName,
        comment: text,
      },
      callback: (r) => {
        setComments(r.message || []);
        setCommentText("");
        setCommentSaving(false);
        frappe.show_alert({ message: __("Comment added"), indicator: "green" });
      },
      error: () => {
        setCommentSaving(false);
        frappe.show_alert({ message: __("Failed to add comment"), indicator: "red" });
      },
    });
  };

  const handleWorkflowAction = (action) => {
    if (!submissionName) return;

    frappe.confirm(
      __("Apply workflow action {0}?", [action]),
      () => {
        setWorkflowSaving(true);
        frappe.call({
          method: WORKFLOW_APPLY_API,
          args: {
            submission_name: submissionName,
            action,
          },
          callback: () => {
            setWorkflowSaving(false);
            frappe.show_alert({ message: __("Workflow updated"), indicator: "green" });
            loadSubmissionData();
          },
          error: () => {
            setWorkflowSaving(false);
            frappe.show_alert({ message: __("Workflow update failed"), indicator: "red" });
          },
        });
      }
    );
  };

  const paginatedEntries = useMemo(() => {
    const entries = details?.timesheets || [];
    return entries.slice((entryPage - 1) * ENTRY_PAGE_SIZE, entryPage * ENTRY_PAGE_SIZE);
  }, [details, entryPage]);

  useSubmissionCharts({
    projects: details?.projects || [],
    tasks: details?.tasks || [],
  });

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">Failed to load submission details</div>
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back
        </button>
      </div>
    );
  }

  const { submission: sub, projects = [], tasks = [], timesheets = [], total_entries = 0 } = details;
  const totalHours = Number(sub.total_working_hours || 0);
  const totalProjectHours = projects.reduce((sum, row) => sum + Number(row.hours || 0), 0);
  const totalTaskHours = tasks.reduce((sum, row) => sum + Number(row.hours || 0), 0);
  const totalPages = Math.ceil(timesheets.length / ENTRY_PAGE_SIZE);

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-start mb-4 gap-2 flex-wrap">
        <div className="d-flex">
          <button
            type="button"
            className="btn btn-link p-0 fw-semibold text-primary text-decoration-underline"
            onClick={() => frappe.set_route("Form", "Timesheet Submission", sub.name)}
            style={{ fontSize: 18, lineHeight: 1.2 }}
          >
            {sub.name}
          </button>
          <div className="d-flex align-items-center ms-4">
            <span className="badge bg-light text-dark border">{sub.workflow_state || "Draft"}</span>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          {workflowActions.length > 0 && (
            <div className="dropdown me-2" ref={workflowMenuRef} style={{ position: "relative" }}>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => setWorkflowMenuOpen((open) => !open)}
                disabled={workflowSaving}
              >
                Action <i className="fa fa-caret-down ms-1"></i>
              </button>
              {workflowMenuOpen && (
                <div
                  className="dropdown-menu show dropdown-menu-end"
                  style={{ position: "absolute", right: 0, top: "100%", marginTop: 6, zIndex: 10, minWidth: 220 }}
                >
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setWorkflowMenuOpen(false);
                      frappe.set_route("Form", "Timesheet Submission", sub.name);
                    }}
                  >
                    View Submission
                  </button>
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setWorkflowMenuOpen(false);
                      loadSubmissionData();
                    }}
                  >
                    Reload
                  </button>
                  <div className="dropdown-divider"></div>
                  {workflowActions.map((action) => (
                    <button
                      key={action.action}
                      type="button"
                      className="dropdown-item"
                      onClick={() => {
                        setWorkflowMenuOpen(false);
                        handleWorkflowAction(action.action);
                      }}
                    >
                      {action.action}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {sub.status === "Approved" && (
            <button className="btn btn-primary" onClick={handleCreateSalarySlip}>
              <i className="fa fa-file-text"></i> Create Salary Slip
            </button>
          )}
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <h5 className="mb-0">Timesheet Submission Details</h5>
            <span className={`badge ${statusBadgeClass(sub.status)}`}>{sub.status}</span>
          </div>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <div className="text-muted small text-uppercase">Employee</div>
              <div className="fw-semibold">{sub.employee_name}</div>
              <div className="small text-muted">{sub.employee}</div>
            </div>
            <div className="col-md-3">
              <div className="text-muted small text-uppercase">Month</div>
              <div className="fw-semibold">{sub.month_year}</div>
            </div>
            <div className="col-md-3">
              <div className="text-muted small text-uppercase">Total Hours</div>
              <div className="fw-semibold">{totalHours.toFixed(1)}</div>
            </div>
            <div className="col-md-3">
              <div className="text-muted small text-uppercase">Workflow State</div>
              <div className="badge bg-light text-dark border">{sub.workflow_state || "Draft"}</div>
            </div>
          </div>
          
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card">
            <div className="card-body text-center">
              <div className="text-muted small text-uppercase">Total Entries</div>
              <div className="fs-3 fw-semibold">{total_entries}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body text-center">
              <div className="text-muted small text-uppercase">Projects</div>
              <div className="fs-3 fw-semibold">{projects.length}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body text-center">
              <div className="text-muted small text-uppercase">Tasks</div>
              <div className="fs-3 fw-semibold">{tasks.length}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body text-center">
              <div className="text-muted small text-uppercase">Hours in Breakdown</div>
              <div className="fs-3 fw-semibold">{Math.max(totalProjectHours, totalTaskHours).toFixed(1)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="mb-0">Project Hours Chart</h5>
            </div>
            <div className="card-body" style={{ minHeight: 320 }}>
              {projects.length === 0 ? (
                <div className="text-center text-muted py-5">No project data available</div>
              ) : (
                <div style={{ position: "relative", height: 280 }}>
                  <canvas id="submissionProjectChart" />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="mb-0">Task Hours Chart</h5>
            </div>
            <div className="card-body" style={{ minHeight: 320 }}>
              {tasks.length === 0 ? (
                <div className="text-center text-muted py-5">No task data available</div>
              ) : (
                <div style={{ position: "relative", height: 280 }}>
                  <canvas id="submissionTaskChart" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Hours by Project / Task</h5>
        </div>
        <div className="card-body">
          <ul className="nav nav-tabs mb-3">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link${activeBreakdownTab === "projects" ? " active" : ""}`}
                onClick={() => setActiveBreakdownTab("projects")}
              >
                Projects
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link${activeBreakdownTab === "tasks" ? " active" : ""}`}
                onClick={() => setActiveBreakdownTab("tasks")}
              >
                Tasks
              </button>
            </li>
          </ul>

          {activeBreakdownTab === "projects" && (
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 48 }}>#</th>
                    <th>Project</th>
                    <th>Project Name</th>
                    <th>Total Hours</th>
                    <th>Tasks</th>
                    <th>Entries</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-4">
                        No project data available
                      </td>
                    </tr>
                  ) : (
                    projects.map((project, index) => {
                      const pct = totalHours ? (Number(project.hours || 0) / totalHours) * 100 : 0;
                      return (
                        <tr key={`${project.project}-${index}`}>
                          <td className="text-muted">{index + 1}</td>
                          <td>{project.project || "-"}</td>
                          <td>{project.project_name || "-"}</td>
                          <td>{Number(project.hours || 0).toFixed(2)}</td>
                          <td>{project.task_count || 0}</td>
                          <td>{project.entries || 0}</td>
                          <td style={{ minWidth: 160 }}>
                            <div className="progress" style={{ height: 18 }}>
                              <div
                                className="progress-bar bg-primary"
                                role="progressbar"
                                style={{ width: `${pct}%` }}
                              >
                                {pct.toFixed(1)}%
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeBreakdownTab === "tasks" && (
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 48 }}>#</th>
                    <th>Task</th>
                    <th>Project/Activity Name</th>
                    <th>Total Hours</th>
                    <th>Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        No task data available
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task, index) => (
                      <tr key={`${task.task}-${task.project}-${index}`}>
                        <td className="text-muted">{index + 1}</td>
                        <td>{task.task || "-"}</td>
                        <td>{task.project_name || "-"}</td>
                        <td>{Number(task.hours || 0).toFixed(2)}</td>
                        <td>{task.entries || 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Timesheet Entries</h5>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered table-sm">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 48 }}>#</th>
                  <th>Date</th>
                  <th>Project/Activity Name</th>
                  <th>Task</th>
                  <th>Activity</th>
                  <th>Hours</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      No timesheet entries found
                    </td>
                  </tr>
                ) : (
                  paginatedEntries.map((ts, index) => (
                    <tr key={`${ts.parent}-${index}`}>
                      <td className="text-muted">
                        {(entryPage - 1) * ENTRY_PAGE_SIZE + index + 1}
                      </td>
                      <td>{formatDate(ts.date)}</td>
                      <td>{ts.project_name || "-"}</td>
                      <td>{renderTaskDetails(ts.task_name || ts.task)}</td>
                      <td>{ts.activity_type || "-"}</td>
                      <td>{Number(ts.hours || 0).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls
            currentPage={entryPage}
            totalPages={totalPages}
            totalItems={timesheets.length}
            onPageChange={setEntryPage}
            pageSize={ENTRY_PAGE_SIZE}
          />
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h5 className="mb-0">Comments</h5>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-light text-dark border">{sub.workflow_state || "Draft"}</span>
            <span className="text-muted small">{comments.length} comment(s)</span>
          </div>
        </div>
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label fw-semibold">Add Comment</label>
            <textarea
              className="form-control"
              rows="3"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment for this timesheet submission..."
            />
          </div>
          <div className="d-flex justify-content-end mb-4">
            <button
              className="btn btn-primary"
              onClick={handleAddComment}
              disabled={commentSaving || !commentText.trim()}
            >
              {commentSaving ? "Adding..." : "Add Comment"}
            </button>
          </div>

          <div className="border rounded">
            {comments.length === 0 ? (
              <div className="text-center text-muted py-4">No comments yet.</div>
            ) : (
              comments.map((comment) => (
                <div key={comment.name} className="border-bottom p-3">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                    <strong>{comment.owner || comment.comment_by || "Comment"}</strong>
                    <span className="text-muted small">{formatDate(comment.creation)}</span>
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: comment.content || "" }} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SubmissionDetails;
