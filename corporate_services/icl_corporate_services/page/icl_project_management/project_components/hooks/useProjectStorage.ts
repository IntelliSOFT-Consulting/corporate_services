import { useEffect, useState } from "react";
import { frappeCall } from "../utils/frappe";

export type DriveFolder = {
  folder_name?: string;
  folder_link?: string;
  created_on?: string;
  created_by?: string;
};

export type DriveConnectionStatus = {
  connected: boolean;
  message: string;
  auth_url?: string;
};

export function useProjectStorage(projectId: string) {
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
      const [googleRes] = await Promise.all([
        frappeCall(
          "corporate_services.api.project.get_project_google_drive_folders",
          { project_name: projectId },
        ),
        frappeCall("corporate_services.api.project.get_project_folder_tree", {
          project_name: projectId,
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
      const r = await frappeCall(
        "corporate_services.api.project.google_drive.check_project_google_drive_connection",
        { project_name: projectId },
      );
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
      const r = await frappeCall(
        "corporate_services.api.project.google_drive.create_project_google_drive_folder",
        { project_name: projectId, folder_name: projectId },
      );
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
    folderLink?: string,
    folderName?: string,
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
      await frappeCall(
        "corporate_services.api.project.google_drive.delete_project_google_drive_folder",
        { project_name: projectId, folder_link: folderLink },
      );
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

  return {
    googleFolders,
    tabLoading,
    creatingDriveFolders,
    checkingDriveConnection,
    driveConnectionStatus,
    refreshProjectStorage,
    checkGoogleDriveConnection,
    handleCreateDriveFolders,
    handleDeleteDriveFolder,
  };
}
