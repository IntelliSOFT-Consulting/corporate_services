import React from "react";
import { useSidebarList } from "./hooks/useSidebarList";
import { OpportunityRow } from "./types";

const STATUS_COLOR: Record<string, string> = {
  Open: "#5e64ff",
  Replied: "#ff8f07",
  Quotation: "#f5a623",
  "Lost Quotation": "#e74c3c",
  Interested: "#28a745",
  Converted: "#28a745",
  "Do Not Contact": "#e74c3c",
};

interface Props {
  activeId: string | null;
  onOpen: (id: string) => void;
}

export function PageSidebar({ activeId, onOpen }: Props) {
  const { items, loading, search, setSearch } = useSidebarList();

  return (
    <div className="om-page-sidebar">
      <div className="om-page-sidebar-header">
        <p className="om-sidebar-title">Opportunities</p>
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="om-page-sidebar-list">
        {loading && (
          <div className="om-sidebar-empty">Loading…</div>
        )}

        {!loading && items.length === 0 && (
          <div className="om-sidebar-empty">No opportunities found</div>
        )}

        {items.map((opp: OpportunityRow) => (
          <div
            key={opp.name}
            className={`om-sidebar-item${opp.name === activeId ? " active" : ""}`}
            onClick={() => onOpen(opp.name)}
          >
            <div className="om-sidebar-item-row">
              <span
                className="om-status-dot"
                style={{ background: STATUS_COLOR[opp.status ?? ""] ?? "#adb5bd" }}
              />
              <span className="om-sidebar-item-name">{opp.name}</span>
            </div>
            <span className="om-sidebar-item-sub">
              {opp.title || opp.customer_name || "-"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
