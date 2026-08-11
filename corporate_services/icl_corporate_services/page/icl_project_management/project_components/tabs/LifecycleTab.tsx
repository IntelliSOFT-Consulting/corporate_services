import React from "react";
import { useProjectLifecycle } from "../hooks/useProjectLifecycle";
import { SectionCard } from "../components/SectionCard";

const SYNC_STATUS_COLOR: Record<string, string> = {
  Synced: "green",
  Missing: "orange",
  Error: "red",
  "Not tracked yet": "gray",
};

function SyncStatusBadge({ status }: { status: string }) {
  const color = SYNC_STATUS_COLOR[status] ?? "gray";
  return (
    <span className={`indicator-pill ${color}`} style={{ fontSize: 12 }}>
      <span>{status}</span>
    </span>
  );
}

export function LifecycleTab({ projectId }: { projectId: string }) {
  const { checklist, tabLoading, syncing, handleCreateOrSyncRecord } =
    useProjectLifecycle(projectId);

  const documents = checklist?.documents ?? [];
  const syncedCount = documents.filter((d) => d.sync_status === "Synced").length;

  return (
    <div>
      <SectionCard
        title="Project Lifecycle Toolkit"
        right={
          <span className="text-muted" style={{ fontSize: 12 }}>
            {checklist
              ? `${syncedCount} of ${documents.length} required templates synced`
              : ""}
          </span>
        }
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            className="btn btn-sm btn-dark"
            onClick={() => void handleCreateOrSyncRecord()}
            disabled={tabLoading || syncing}
          >
            {syncing
              ? "Syncing…"
              : checklist?.docname
                ? "Sync Lifecycle Record"
                : "Create Lifecycle Record"}
          </button>
          {checklist?.drive_root_folder_link && (
            <a
              className="pm-proj-link"
              href={checklist.drive_root_folder_link}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 13 }}
            >
              Open Drive Folder
            </a>
          )}
        </div>
        <div className="text-muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Every template configured in the Project Toolkit is listed below.
          Create or sync the record to check off the ones already uploaded to
          this project's Google Drive folder.
        </div>

        {tabLoading ? (
          <div className="text-muted">Loading lifecycle checklist…</div>
        ) : documents.length === 0 ? (
          <div className="pm-empty-inline">No toolkit templates are configured yet.</div>
        ) : (
          <div>
            {documents.map((doc) => {
              const isSynced = doc.sync_status === "Synced";
              return (
                <div className="pm-lifecycle-row" key={doc.template_name}>
                  <div className="pm-lifecycle-name">
                    <span className={`pm-lifecycle-check ${isSynced ? "synced" : "unsynced"}`}>
                      {isSynced ? "✓" : ""}
                    </span>
                    {doc.template_name}
                  </div>
                  <div className="pm-lifecycle-actions">
                    <SyncStatusBadge status={doc.sync_status} />
                    {isSynced && doc.drive_file_link ? (
                      <a
                        className="btn btn-sm btn-outline-secondary"
                        href={doc.drive_file_link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => void handleCreateOrSyncRecord()}
                        disabled={tabLoading || syncing}
                      >
                        Sync
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
