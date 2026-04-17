import React, { useState, useEffect, useRef } from "react";

interface FileItem {
  name: string;
  file_name: string;
  is_folder: number;
  file_url?: string;
  file_size?: number;
  modified?: string;
}

interface BreadcrumbEntry {
  name: string;
  file_name: string;
}

interface Props {
  rootFolder: { name: string; file_name: string };
  opportunityName: string;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: number; // 0-100
  error?: string;
}

function FolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--yellow-500, #f59e0b)", flexShrink: 0 }}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-muted, #6c757d)", flexShrink: 0 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

function formatSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function uploadFile(
  file: File,
  folderName: string,
  opportunityName: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const frappe = (globalThis as any).frappe;
    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("folder", folderName);
    formData.append("attached_to_doctype", "Opportunity");
    formData.append("attached_to_name", opportunityName);
    formData.append("is_private", "1");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/method/upload_file");
    xhr.setRequestHeader("X-Frappe-CSRF-Token", frappe?.csrf_token ?? "");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        try {
          const resp = JSON.parse(xhr.responseText);
          reject(new Error(resp?.exc_type || resp?.message || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(formData);
  });
}

export function FileBrowser({ rootFolder, opportunityName }: Props) {
  const frappe = (globalThis as any).frappe;

  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbEntry[]>([rootFolder]);
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New folder state
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [savingFolder, setSavingFolder] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFolder = breadcrumb[breadcrumb.length - 1];

  useEffect(() => {
    loadContents(currentFolder.name);
  }, [currentFolder.name]);

  useEffect(() => {
    if (creating) folderInputRef.current?.focus();
  }, [creating]);

  async function loadContents(folderName: string) {
    setLoading(true);
    setError(null);
    try {
      const r = await frappe.call({
        method: "corporate_services.api.opportunity.get_folder_contents",
        args: { folder_name: folderName, opportunity_name: opportunityName },
      });
      setItems(r?.message ?? []);
    } catch (e: any) {
      setError(e?.message || "Failed to load folder.");
    } finally {
      setLoading(false);
    }
  }

  function openFolder(item: FileItem) {
    setBreadcrumb((prev) => [...prev, { name: item.name, file_name: item.file_name }]);
  }

  function navigateTo(index: number) {
    setBreadcrumb((prev) => prev.slice(0, index + 1));
  }

  // ── New folder ──────────────────────────────────────────────────────────────

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    setSavingFolder(true);
    try {
      await frappe.call({
        method: "corporate_services.api.opportunity.create_subfolder",
        args: {
          folder_name: newFolderName.trim(),
          parent_folder: currentFolder.name,
          opportunity_name: opportunityName,
        },
      });
      setNewFolderName("");
      setCreating(false);
      loadContents(currentFolder.name);
    } catch (e: any) {
      frappe?.msgprint({ title: "Error", message: e?.message || "Could not create folder.", indicator: "red" });
    } finally {
      setSavingFolder(false);
    }
  }

  function handleFolderKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleCreateFolder();
    if (e.key === "Escape") { setCreating(false); setNewFolderName(""); }
  }

  // ── Upload ──────────────────────────────────────────────────────────────────

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    // Reset input so the same file can be re-uploaded if needed
    e.target.value = "";

    const entries: UploadingFile[] = files.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      name: f.name,
      progress: 0,
    }));
    setUploading((prev) => [...prev, ...entries]);

    await Promise.all(
      files.map(async (file, i) => {
        const id = entries[i].id;
        try {
          await uploadFile(file, currentFolder.name, opportunityName, (pct) => {
            setUploading((prev) =>
              prev.map((u) => (u.id === id ? { ...u, progress: pct } : u))
            );
          });
          setUploading((prev) => prev.filter((u) => u.id !== id));
        } catch (err: any) {
          setUploading((prev) =>
            prev.map((u) => (u.id === id ? { ...u, error: err.message } : u))
          );
        }
      })
    );

    loadContents(currentFolder.name);
  }

  function dismissUploadError(id: string) {
    setUploading((prev) => prev.filter((u) => u.id !== id));
  }

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  const [dragOver, setDragOver] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;

    const entries: UploadingFile[] = files.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      name: f.name,
      progress: 0,
    }));
    setUploading((prev) => [...prev, ...entries]);

    await Promise.all(
      files.map(async (file, i) => {
        const id = entries[i].id;
        try {
          await uploadFile(file, currentFolder.name, opportunityName, (pct) => {
            setUploading((prev) =>
              prev.map((u) => (u.id === id ? { ...u, progress: pct } : u))
            );
          });
          setUploading((prev) => prev.filter((u) => u.id !== id));
        } catch (err: any) {
          setUploading((prev) =>
            prev.map((u) => (u.id === id ? { ...u, error: err.message } : u))
          );
        }
      })
    );

    loadContents(currentFolder.name);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const folders = items.filter((i) => i.is_folder);
  const files = items.filter((i) => !i.is_folder);
  const isUploading = uploading.some((u) => !u.error);

  return (
    <div
      className={`fb-root${dragOver ? " fb-drag-over" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={handleFilesSelected}
      />

      {/* Breadcrumb + actions */}
      <div className="fb-toolbar">
        <div className="fb-breadcrumb">
          {breadcrumb.map((entry, idx) => (
            <React.Fragment key={entry.name}>
              {idx > 0 && <span className="fb-crumb-sep">/</span>}
              <button
                type="button"
                className={`fb-crumb${idx === breadcrumb.length - 1 ? " active" : ""}`}
                onClick={() => navigateTo(idx)}
                disabled={idx === breadcrumb.length - 1}
              >
                {entry.file_name}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="fb-toolbar-actions">
          <button
            type="button"
            className="btn btn-xs btn-primary fb-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <UploadIcon />
            Upload
          </button>
          {!creating && (
            <button
              type="button"
              className="btn btn-xs btn-default fb-new-folder-btn"
              onClick={() => setCreating(true)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Folder
            </button>
          )}
        </div>
      </div>

      {/* New folder inline input */}
      {creating && (
        <div className="fb-new-folder-row">
          <FolderIcon />
          <input
            ref={folderInputRef}
            className="form-control form-control-sm fb-new-folder-input"
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={handleFolderKeyDown}
            disabled={savingFolder}
          />
          <button
            type="button"
            className="btn btn-xs btn-primary"
            onClick={handleCreateFolder}
            disabled={savingFolder || !newFolderName.trim()}
          >
            {savingFolder ? "…" : "Create"}
          </button>
          <button
            type="button"
            className="btn btn-xs btn-default"
            onClick={() => { setCreating(false); setNewFolderName(""); }}
            disabled={savingFolder}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Upload progress rows */}
      {uploading.map((u) => (
        <div key={u.id} className={`fb-upload-row${u.error ? " fb-upload-row--error" : ""}`}>
          <FileIcon />
          <span className="fb-upload-name">{u.name}</span>
          {u.error ? (
            <>
              <span className="fb-upload-error-msg">{u.error}</span>
              <button type="button" className="fb-upload-dismiss" onClick={() => dismissUploadError(u.id)} title="Dismiss">✕</button>
            </>
          ) : (
            <div className="fb-upload-progress-wrap">
              <div className="fb-upload-progress-bar" style={{ width: `${u.progress}%` }} />
            </div>
          )}
        </div>
      ))}

      {/* Drag overlay hint */}
      {dragOver && (
        <div className="fb-drop-overlay">
          <UploadIcon />
          <span>Drop files to upload</span>
        </div>
      )}

      {/* Contents */}
      {loading && (
        <div className="fb-loading">
          <div className="spinner-border spinner-border-sm" role="status" />
        </div>
      )}

      {error && <div className="fb-error">{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div className="fb-empty">
          <div>This folder is empty</div>
          <div className="fb-empty-hint">Drop files here or click Upload</div>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="fb-list">
          {folders.map((item) => (
            <button
              key={item.name}
              type="button"
              className="fb-item fb-item--folder"
              onClick={() => openFolder(item)}
            >
              <FolderIcon />
              <span className="fb-item-name">{item.file_name}</span>
            </button>
          ))}
          {files.map((item) => (
            <a
              key={item.name}
              className="fb-item fb-item--file"
              href={item.file_url || "#"}
              target="_blank"
              rel="noreferrer"
              title={item.file_name}
            >
              <FileIcon />
              <span className="fb-item-name">{item.file_name}</span>
              {item.file_size ? (
                <span className="fb-item-size">{formatSize(item.file_size)}</span>
              ) : null}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
