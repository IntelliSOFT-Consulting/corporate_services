import React, { useEffect, useState } from "react";
import { useProjectDetail } from "./hooks/useProjectDetail";
import { ProjectChartCard } from "./ProjectCharts";
import WorkPlanPage from "../work_plan";
import QuickActions from "./components/QuickActions";

const STATUS_INDICATOR: Record<string, string> = {
  Open: "blue",
  Completed: "green",
  Cancelled: "red",
};

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-muted">-</span>;
  const color = STATUS_INDICATOR[status] ?? "gray";
  return (
    <span className={`indicator-pill ${color}`} style={{ fontSize: 12 }}>
      <span>{status}</span>
    </span>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  const isEmpty = value == null || value === "";
  return (
    <div>
      <div className="pm-field-label">{label}</div>
      <div className={`pm-field-value${isEmpty ? " empty" : ""}`}>
        {isEmpty ? "-" : String(value)}
      </div>
    </div>
  );
}

function formatCurrency(amount?: number) {
  if (amount == null) return null;
  return Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(date?: string) {
  if (!date) return null;
  return new Date(date).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateOrDash(date?: string) {
  return formatDate(date) ?? "-";
}

function ProgressBar({ value }: { value?: number }) {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  return (
    <div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: "var(--text-color, #333)",
        }}
      >
        {pct}%
      </div>
      <div className="pm-progress-bar-track" style={{ marginTop: 8 }}>
        <div className="pm-progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface Props {
  projectId: string;
  onBack: () => void;
}

type DriveFolder = {
  folder_name?: string;
  folder_link?: string;
  created_on?: string;
  created_by?: string;
};

type DriveConnectionStatus = {
  connected: boolean;
  message: string;
  auth_url?: string;
};

export function ProjectDetail({ projectId, onBack }: Props) {
  const { doc, loading, error } = useProjectDetail(projectId);
  const linkedUsers = doc?.linked_users ?? [];
  const timesheets = doc?.timesheets ?? [];
  const [activeTab, setActiveTab] = useState<
    "details" | "documents" | "work_plan"
  >("details");
  const [googleFolders, setGoogleFolders] = useState<DriveFolder[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [creatingDriveFolders, setCreatingDriveFolders] = useState(false);
  const [checkingDriveConnection, setCheckingDriveConnection] = useState(false);
  const [driveConnectionStatus, setDriveConnectionStatus] =
    useState<DriveConnectionStatus | null>(null);

  const refreshProjectStorage = async () => {
    if (!projectId) return;
    setTabLoading(true);
    try {
      const [googleRes, folderRes] = await Promise.all([
        (globalThis as any).frappe.call({
          method:
            "corporate_services.api.project.get_project_google_drive_folders",
          args: { project_name: projectId },
        }),
        (globalThis as any).frappe.call({
          method: "corporate_services.api.project.get_project_folder_tree",
          args: { project_name: projectId },
        }),
      ]);
      setGoogleFolders(googleRes?.message ?? []);
    } catch {
      setGoogleFolders([]);
    } finally {
      setTabLoading(false);
    }
  };

  useEffect(() => {
    void refreshProjectStorage();
  }, [projectId]);

  const checkGoogleDriveConnection = async (silent = false) => {
    if (!projectId) return null;
    setCheckingDriveConnection(true);
    try {
      const r = await (globalThis as any).frappe.call({
        method:
          "corporate_services.api.project.google_drive.check_project_google_drive_connection",
        args: { project_name: projectId },
      });
      const status = (r?.message ?? null) as DriveConnectionStatus | null;
      setDriveConnectionStatus(status);
      if (!silent && status?.message) {
        (globalThis as any).frappe?.show_alert({
          message: status.message,
          indicator: status.connected ? "green" : "orange",
        });
      }
      return status;
    } catch (e: any) {
      const status: DriveConnectionStatus = {
        connected: false,
        message:
          e?.message ||
          "Could not verify Google Drive connection. Please reconnect your Google account.",
      };
      setDriveConnectionStatus(status);
      if (!silent) {
        (globalThis as any).frappe?.msgprint({
          title: "Google Drive Connection Check Failed",
          message: status.message,
          indicator: "red",
        });
      }
      return status;
    } finally {
      setCheckingDriveConnection(false);
    }
  };

  const handleCreateDriveFolders = async () => {
    if (!projectId) return;
    const status = await checkGoogleDriveConnection(true);
    if (!status?.connected) {
      (globalThis as any).frappe?.msgprint({
        title: "Google Drive Connection Required",
        message:
          status?.message ||
          "Google Drive connection is not active. Please reconnect and try again.",
        indicator: "orange",
      });
      return;
    }
    setCreatingDriveFolders(true);
    try {
      const r = await (globalThis as any).frappe.call({
        method:
          "corporate_services.api.project.google_drive.create_project_google_drive_folder",
        args: { project_name: projectId, folder_name: projectId },
      });
      const folderLink = r?.message?.folder_link;
      (globalThis as any).frappe?.show_alert({
        message: folderLink
          ? "Google Drive folder created"
          : "Google Drive folder synced",
        indicator: "green",
      });
      if (folderLink) {
        window.open(folderLink, "_blank", "noreferrer");
      }
      await refreshProjectStorage();
    } catch (e: any) {
      (globalThis as any).frappe?.msgprint({
        title: "Google Drive Folder Creation Failed",
        message:
          e?.message || "Could not create the Google Drive folder structure.",
        indicator: "red",
      });
    } finally {
      setCreatingDriveFolders(false);
    }
  };

  const handleDeleteDriveFolder = async (
    folderLink: string,
    folderName: string,
  ) => {
    const confirmed = await new Promise((resolve) => {
      (globalThis as any).frappe?.confirm(
        `Are you sure you want to delete the Google Drive folder "${folderName}"? This action cannot be undone.`,
        () => resolve(true),
        () => resolve(false),
      );
    });

    if (!confirmed) return;

    try {
      await (globalThis as any).frappe.call({
        method:
          "corporate_services.api.project.google_drive.delete_project_google_drive_folder",
        args: { project_name: projectId, folder_link: folderLink },
      });
      (globalThis as any).frappe?.show_alert({
        message: "Google Drive folder deleted successfully",
        indicator: "green",
      });
      await refreshProjectStorage();
    } catch (e: any) {
      (globalThis as any).frappe?.msgprint({
        title: "Delete Failed",
        message: e?.message || "Could not delete the Google Drive folder.",
        indicator: "red",
      });
    }
  };

  return (
    <div className="pm-fade-in">
      {/* -- Header -- */}
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
          {loading ? "Loading…" : doc?.project_name || projectId}
          <span className="pm-detail-id">{projectId}</span>
        </h5>

        {doc && <StatusBadge status={doc.status} />}

        <div className="pm-detail-actions">
          <button
            type="button"
            className="btn btn-default btn-sm"
            onClick={() =>
              (globalThis as any).frappe?.set_route(
                "Form",
                "Project",
                projectId,
              )
            }
          >
            Edit in Form
          </button>
        </div>
      </div>

      {/* -- Loading -- */}
      {loading && (
        <div className="text-center text-muted" style={{ padding: "48px 0" }}>
          <div className="spinner-border spinner-border-sm" role="status" />
          <div style={{ marginTop: 10 }}>Loading project…</div>
        </div>
      )}

      {/* -- Error -- */}
      {error && (
        <div className="alert alert-danger" style={{ fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* -- Content -- */}
      {doc && !loading && (
        <>
          <QuickActions doc={doc} />

          <div className="row">
            <div className="col-md-12">
              <div
                className="frappe-card"
                style={{ padding: "16px 20px", marginBottom: 16 }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className={`btn btn-sm ${activeTab === "details" ? "btn-primary" : "btn-default"}`}
                    onClick={() => setActiveTab("details")}
                  >
                    Project Details
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${activeTab === "documents" ? "btn-primary" : "btn-default"}`}
                    onClick={() => setActiveTab("documents")}
                  >
                    Documents & Folders
                  </button>

                  <button
                    type="button"
                    className={`btn btn-sm ${activeTab === "work_plan" ? "btn-primary" : "btn-default"}`}
                    onClick={() => setActiveTab("work_plan")}
                  >
                    Work Plan
                  </button>
                </div>
              </div>

              {activeTab === "details" && (
                <div>
                  <div
                    className="frappe-card"
                    style={{ padding: "16px 20px", marginBottom: 16 }}
                  >
                    <h6 className="pm-section-title">Overview</h6>
                    <div className="pm-field-grid">
                      <Field label="Project Name" value={doc.project_name} />
                      <div>
                        <div className="pm-field-label">Status</div>
                        <div className="pm-field-value">
                          <StatusBadge status={doc.status} />
                        </div>
                      </div>
                      <Field label="Customer" value={doc.customer} />
                      <Field label="Department" value={doc.department} />
                      <Field label="Company" value={doc.company} />
                      <Field label="Priority" value={doc.priority} />
                      <div>
                        <div className="pm-field-label">Opportunity Bid</div>
                        <div className="pm-field-value">
                          {doc.custom_bid ? (
                            <a
                              href="#"
                              style={{
                                color: "var(--primary, #5e64ff)",
                                textDecoration: "none",
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                (globalThis as any).frappe?.set_route(
                                  "icl-opportunity-module",
                                  doc.custom_bid,
                                );
                              }}
                            >
                              {doc.custom_bid}
                            </a>
                          ) : (
                            <span className="empty">-</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className="frappe-card"
                    style={{ padding: "16px 20px", marginBottom: 16 }}
                  >
                    <h6 className="pm-section-title">Progress</h6>
                    <div style={{ marginBottom: 16 }}>
                      <div className="pm-field-label">Percent Complete</div>
                      <ProgressBar value={doc.percent_complete} />
                    </div>
                    <div className="pm-field-grid">
                      <Field
                        label="Actual Start Date"
                        value={formatDate(doc.actual_start_date)}
                      />
                      <Field
                        label="Actual End Date"
                        value={formatDate(doc.actual_end_date)}
                      />
                      <Field
                        label="Actual Time (hrs)"
                        value={
                          doc.actual_time != null
                            ? String(doc.actual_time)
                            : null
                        }
                      />
                    </div>
                  </div>

                  <div className="pm-charts-grid">
                    <ProjectChartCard
                      title="Timesheets by Status"
                      items={(doc.charts?.timesheet_status_breakdown ?? []).map(
                        (item) => ({
                          label: item.label,
                          value: item.count,
                        }),
                      )}
                      emptyText="No timesheets are linked to this project yet."
                    />
                    <ProjectChartCard
                      title="Travel Requests by Workflow State"
                      items={(
                        doc.charts?.travel_request_workflow_breakdown ?? []
                      ).map((item) => ({
                        label: item.label,
                        value: item.count,
                      }))}
                      emptyText="No travel requests are linked to this project yet."
                    />
                  </div>

                  <div
                    className="frappe-card"
                    style={{ padding: "16px 20px", marginBottom: 16 }}
                  >
                    <div className="pm-list-section-header">
                      <h6
                        className="pm-section-title"
                        style={{ marginBottom: 0 }}
                      >
                        Linked Project Users
                      </h6>
                      <span className="text-muted" style={{ fontSize: 12 }}>
                        {linkedUsers.length} user
                        {linkedUsers.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    {linkedUsers.length === 0 ? (
                      <div className="pm-empty-inline">
                        No users are linked to this project.
                      </div>
                    ) : (
                      <div className="pm-related-table-wrap">
                        <table className="table table-sm pm-related-table">
                          <thead>
                            <tr>
                              <th>User</th>
                              <th>Employee</th>
                              <th>Full Name</th>
                              <th>Email</th>
                              <th>Allocated LOEs</th>
                              <th>Total Hours</th>
                            </tr>
                          </thead>
                          <tbody>
                            {linkedUsers.map((user) => (
                              <tr key={user.user}>
                                <td>{user.user}</td>
                                <td>
                                  {user.employee_name || user.employee || "-"}
                                </td>
                                <td>{user.full_name || "-"}</td>
                                <td>{user.email || "-"}</td>
                                <td>{user.allocated_loes ?? "-"}</td>
                                <td>{user.total_hours ?? 0}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div
                    className="frappe-card"
                    style={{ padding: "16px 20px", marginBottom: 16 }}
                  >
                    <div className="pm-list-section-header">
                      <h6
                        className="pm-section-title"
                        style={{ marginBottom: 0 }}
                      >
                        Project Timesheets
                      </h6>
                      <span className="text-muted" style={{ fontSize: 12 }}>
                        {timesheets.length} record
                        {timesheets.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    {timesheets.length === 0 ? (
                      <div className="pm-empty-inline">
                        No timesheets are linked to this project.
                      </div>
                    ) : (
                      <div className="pm-related-table-wrap">
                        <table className="table table-sm pm-related-table">
                          <thead>
                            <tr>
                              <th>Timesheet</th>
                              <th>Employee</th>
                              <th>Status</th>
                              <th>Hours</th>
                              <th>Start Date</th>
                              <th>End Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {timesheets.map((timesheet) => (
                              <tr key={timesheet.name}>
                                <td>
                                  <a
                                    className="pm-proj-link"
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      (globalThis as any).frappe?.set_route(
                                        "Form",
                                        "Timesheet",
                                        timesheet.name,
                                      );
                                    }}
                                  >
                                    {timesheet.name}
                                  </a>
                                </td>
                                <td>
                                  {timesheet.employee_name ||
                                    timesheet.employee ||
                                    "-"}
                                </td>
                                <td>{timesheet.status || "-"}</td>
                                <td>{timesheet.total_hours ?? "-"}</td>
                                <td>
                                  {formatDateOrDash(timesheet.start_date)}
                                </td>
                                <td>{formatDateOrDash(timesheet.end_date)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "documents" && (
                <div>
                  <div
                    className="frappe-card"
                    style={{ padding: "16px 20px", marginBottom: 16 }}
                  >
                    <div className="pm-list-section-header">
                      <h6
                        className="pm-section-title"
                        style={{ marginBottom: 0 }}
                      >
                        Project Documents & Folders
                      </h6>
                      <span className="text-muted" style={{ fontSize: 12 }}>
                        Google Drive:{" "}
                        {googleFolders.length > 0
                          ? `${googleFolders.length} folder${googleFolders.length === 1 ? "" : "s"}`
                          : "Not created"}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 12,
                        marginBottom: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => void handleCreateDriveFolders()}
                        disabled={tabLoading || creatingDriveFolders}
                      >
                        {creatingDriveFolders
                          ? "Creating Google Drive Folder…"
                          : "Create / Sync Google Drive Folder"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-default"
                        onClick={() => void checkGoogleDriveConnection(false)}
                        disabled={checkingDriveConnection || tabLoading}
                      >
                        {checkingDriveConnection
                          ? "Checking Google Drive…"
                          : "Check Google Drive Connection"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-default"
                        onClick={() => void refreshProjectStorage()}
                        disabled={tabLoading}
                      >
                        Refresh
                      </button>
                    </div>
                    <div className="text-muted" style={{ fontSize: 13 }}>
                      Use this single tab to manage both File Manager and Google
                      Drive because they share the same lifecycle blueprint.
                    </div>
                  </div>

                  {driveConnectionStatus && (
                    <div
                      className="frappe-card"
                      style={{
                        padding: "12px 16px",
                        marginBottom: 16,
                        border: `1px solid ${driveConnectionStatus.connected ? "#c6f6d5" : "#fbd38d"}`,
                        background: driveConnectionStatus.connected
                          ? "#f0fff4"
                          : "#fffaf0",
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        Google Drive Connection
                      </div>
                      <div style={{ fontSize: 13 }}>
                        {driveConnectionStatus.message}
                      </div>
                      {!!driveConnectionStatus.auth_url &&
                        !driveConnectionStatus.connected && (
                          <div style={{ marginTop: 10 }}>
                            <a
                              href={driveConnectionStatus.auth_url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-xs btn-default"
                            >
                              Re-authorize Google Drive
                            </a>
                          </div>
                        )}
                    </div>
                  )}

                  <div className="pm-charts-grid" style={{ marginBottom: 16 }}>
                    <div
                      className="frappe-card"
                      style={{ padding: "16px 20px" }}
                    >
                      <div className="pm-list-section-header">
                        <h6
                          className="pm-section-title"
                          style={{ marginBottom: 0 }}
                        >
                          Google Drive Folders
                        </h6>
                        <span className="text-muted" style={{ fontSize: 12 }}>
                          {googleFolders.length} record
                          {googleFolders.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      {tabLoading ? (
                        <div className="text-muted" style={{ marginTop: 12 }}>
                          Loading Google Drive folders…
                        </div>
                      ) : googleFolders.length === 0 ? (
                        <div
                          className="pm-empty-inline"
                          style={{ marginTop: 12 }}
                        >
                          No Google Drive folder found for this project. Click
                          the button above to create it.
                        </div>
                      ) : (
                        <div
                          className="pm-related-table-wrap"
                          style={{ marginTop: 12 }}
                        >
                          <table className="table table-sm pm-related-table">
                            <thead>
                              <tr>
                                <th>Folder</th>
                                <th>Created On</th>
                                <th>Created By</th>
                                <th style={{ width: 80, textAlign: "center" }}>
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {googleFolders.map((row, idx) => (
                                <tr
                                  key={`${row.folder_link || row.folder_name || "folder"}-${idx}`}
                                >
                                  <td>
                                    {row.folder_link ? (
                                      <a
                                        className="pm-proj-link"
                                        href={row.folder_link}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        {row.folder_name ||
                                          "Google Drive Folder"}
                                      </a>
                                    ) : (
                                      row.folder_name || "-"
                                    )}
                                  </td>
                                  <td>{formatDateOrDash(row.created_on)}</td>
                                  <td>{row.created_by || "-"}</td>
                                  <td style={{ textAlign: "center" }}>
                                    <button
                                      className="btn btn-xs btn-danger"
                                      onClick={() =>
                                        handleDeleteDriveFolder(
                                          row.folder_link,
                                          row.folder_name,
                                        )
                                      }
                                      title="Delete this Google Drive folder"
                                    >
                                      Delete
                                    </button>
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
              )}
              {activeTab === "work_plan" && <WorkPlanPage projectId={projectId} />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
