import React from "react";
import { useProjectLifecycle } from "../hooks/useProjectLifecycle";
import { SectionCard } from "../components/SectionCard";
import { RelatedTable, Column } from "../components/RelatedTable";
import { formatDateOrDash } from "../utils/format";
import { LifecycleDocument } from "../hooks/useProjectLifecycle";

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

  const columns: Column<LifecycleDocument>[] = [
    { header: "Required Template", render: (row) => row.template_name },
    {
      header: "Status",
      width: 140,
      render: (row) => <SyncStatusBadge status={row.sync_status} />,
    },
    {
      header: "Drive File",
      render: (row) =>
        row.drive_file_link ? (
          <a
            className="pm-proj-link"
            href={row.drive_file_link}
            target="_blank"
            rel="noreferrer"
          >
            Open
          </a>
        ) : (
          "-"
        ),
    },
    {
      header: "Last Synced",
      width: 120,
      render: (row) => formatDateOrDash(row.last_synced_at || undefined),
    },
  ];

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
            className="btn btn-sm btn-primary"
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
          this project's Google Drive folder and add any newly-required
          templates to the checklist.
        </div>

        {tabLoading ? (
          <div className="text-muted">Loading lifecycle checklist…</div>
        ) : (
          <RelatedTable
            columns={columns}
            rows={documents}
            getKey={(row) => row.template_name}
            emptyText="No toolkit templates are configured yet."
          />
        )}
      </SectionCard>
    </div>
  );
}
