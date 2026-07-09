import { useEffect, useState } from "react";
import { frappeCall } from "../utils/frappe";

export type LifecycleDocument = {
  template_name: string;
  sync_status: "Synced" | "Missing" | "Error" | "Not tracked yet" | string;
  drive_file_link?: string | null;
  drive_modified_at?: string | null;
  drive_modified_by?: string | null;
  last_synced_at?: string | null;
};

export type LifecycleChecklist = {
  docname: string | null;
  drive_root_folder_link: string | null;
  last_drive_sync_at: string | null;
  documents: LifecycleDocument[];
};

export function useProjectLifecycle(projectId: string) {
  const [checklist, setChecklist] = useState<LifecycleChecklist | null>(null);
  const [tabLoading, setTabLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const refreshChecklist = async () => {
    if (!projectId) return;
    setTabLoading(true);
    try {
      const r = await frappeCall(
        "corporate_services.api.project.google_drive.get_project_lifecycle_checklist",
        { project_name: projectId },
      );
      setChecklist(r?.message ?? null);
    } catch {
      setChecklist(null);
    } finally {
      setTabLoading(false);
    }
  };

  useEffect(() => {
    void refreshChecklist();
  }, [projectId]);

  const handleCreateOrSyncRecord = async () => {
    if (!projectId || syncing) return;
    setSyncing(true);
    try {
      const connCheck = await frappeCall(
        "corporate_services.api.project.google_drive.check_project_google_drive_connection",
        { project_name: projectId },
      );
      const conn = connCheck?.message;
      if (!conn?.connected) {
        (globalThis as any).frappe?.msgprint({
          title: "Google Drive Connection Required",
          message:
            conn?.message ||
            "Google Drive connection is not active. Please reconnect and try again.",
          indicator: "orange",
        });
        return;
      }
      await frappeCall(
        "corporate_services.api.project.google_drive.create_project_google_drive_folder",
        { project_name: projectId, folder_name: projectId },
      );
      (globalThis as any).frappe?.show_alert({
        message: "Lifecycle record synced with the current template library.",
        indicator: "green",
      });
      await refreshChecklist();
    } catch (e: any) {
      (globalThis as any).frappe?.msgprint({
        title: "Sync Failed",
        message: e?.message || "Could not create or sync the lifecycle record.",
        indicator: "red",
      });
    } finally {
      setSyncing(false);
    }
  };

  return {
    checklist,
    tabLoading,
    syncing,
    refreshChecklist,
    handleCreateOrSyncRecord,
  };
}
