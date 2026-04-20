import React from "react";
import { useSidebarList } from "./hooks/useSidebarList";
import { ProjectRow } from "./types";

const STATUS_COLOR: Record<string, string> = {
  Open: "#5e64ff",
  Completed: "#28a745",
  Cancelled: "#e74c3c",
};

interface Props {
  activeId: string | null;
  onOpen: (id: string) => void;
}

export function PageSidebar({ activeId, onOpen }: Props) {
  const { items, loading, search, setSearch } = useSidebarList();

  return (
    <div className="pm-page-sidebar">
      <div className="pm-page-sidebar-header">
        <p className="pm-sidebar-title">Projects</p>
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="pm-page-sidebar-list">
        {loading && (
          <div className="pm-sidebar-empty">Loading…</div>
        )}

        {!loading && items.length === 0 && (
          <div className="pm-sidebar-empty">No projects found</div>
        )}

        {items.map((proj: ProjectRow) => (
          <div
            key={proj.name}
            className={`pm-sidebar-item${proj.name === activeId ? " active" : ""}`}
            onClick={() => onOpen(proj.name)}
          >
            <div className="pm-sidebar-item-row">
              <span
                className="pm-status-dot"
                style={{ background: STATUS_COLOR[proj.status ?? ""] ?? "#adb5bd" }}
              />
              <span className="pm-sidebar-item-name">{proj.project_name || proj.name}</span>
            </div>
            <span className="pm-sidebar-item-sub">
              {proj.status || "-"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
