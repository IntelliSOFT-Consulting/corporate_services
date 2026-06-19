import React from "react";
import { useProjectStorage, DriveFolder } from "../hooks/useProjectStorage";
import { SectionCard } from "../components/SectionCard";
import { RelatedTable, Column } from "../components/RelatedTable";
import { formatDateOrDash } from "../utils/format";

export function DocumentsTab({ projectId }: { projectId: string }) {
  const {
    googleFolders,
    tabLoading,
    creatingDriveFolders,
    checkingDriveConnection,
    driveConnectionStatus,
    refreshProjectStorage,
    checkGoogleDriveConnection,
    handleCreateDriveFolders,
    handleDeleteDriveFolder,
  } = useProjectStorage(projectId);

  const columns: Column<DriveFolder>[] = [
    {
      header: "Folder",
      render: (row) =>
        row.folder_link ? (
          <a
            className="pm-proj-link"
            href={row.folder_link}
            target="_blank"
            rel="noreferrer"
          >
            {row.folder_name || "Google Drive Folder"}
          </a>
        ) : (
          row.folder_name || "-"
        ),
    },
    { header: "Created On", render: (row) => formatDateOrDash(row.created_on) },
    { header: "Created By", render: (row) => row.created_by || "-" },
    {
      header: "Action",
      width: 80,
      align: "center",
      render: (row) => (
        <button
          className="btn btn-xs btn-danger"
          onClick={() =>
            handleDeleteDriveFolder(row.folder_link, row.folder_name)
          }
          title="Delete this Google Drive folder"
        >
          Delete
        </button>
      ),
    },
  ];

  return (
    <div>
      <SectionCard
        title="Project Documents & Folders"
        right={
          <span className="text-muted" style={{ fontSize: 12 }}>
            Google Drive:{" "}
            {googleFolders.length > 0
              ? `${googleFolders.length} folder${googleFolders.length === 1 ? "" : "s"}`
              : "Not created"}
          </span>
        }
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
          Use this single tab to manage both File Manager and Google Drive
          because they share the same lifecycle blueprint.
        </div>
      </SectionCard>

      {driveConnectionStatus && (
        <div
          className="frappe-card"
          style={{
            padding: "12px 16px",
            marginBottom: 16,
            border: `1px solid ${driveConnectionStatus.connected ? "#c6f6d5" : "#fbd38d"}`,
            background: driveConnectionStatus.connected ? "#f0fff4" : "#fffaf0",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            Google Drive Connection
          </div>
          <div style={{ fontSize: 13 }}>{driveConnectionStatus.message}</div>
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

      <SectionCard title="Google Drive Folders" count={googleFolders.length}>
        {tabLoading ? (
          <div className="text-muted">Loading Google Drive folders…</div>
        ) : (
          <RelatedTable
            columns={columns}
            rows={googleFolders}
            getKey={(row, idx) =>
              `${row.folder_link || row.folder_name || "folder"}-${idx}`
            }
            emptyText="No Google Drive folder found for this project. Click the button above to create it."
          />
        )}
      </SectionCard>
    </div>
  );
}
