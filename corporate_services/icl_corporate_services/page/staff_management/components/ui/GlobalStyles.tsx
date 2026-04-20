import { useEffect } from "react";

// Minimal CSS — only for things not covered by Frappe/Bootstrap classes
const CSS = `
.sm-fade-in {
  animation: smFadeIn 0.2s ease both;
}
@keyframes smFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Sidebar items */
.sm-sidebar-header {
  padding: 10px 10px 8px 10px;
  border-bottom: 1px solid var(--border-color, #e2e6ea);
}

.sm-sidebar-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted, #6c757d);
  margin: 0;
}

.sm-sidebar-list {
  overflow-y: auto;
  max-height: calc(100vh - 200px);
}

.sm-sidebar-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: background 0.1s ease;
}
.sm-sidebar-item:hover {
  background: var(--fg-hover-color, #f0f1f3);
}
.sm-sidebar-item.active {
  background: var(--control-bg, #e8eaf0);
  border-left-color: var(--primary, #5e64ff);
}
.sm-sidebar-item-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-color, #333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sm-sidebar-item-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted, #6c757d);
  flex-shrink: 0;
  margin-left: 8px;
}

/* Table row cursor */
.sm-table tbody tr { cursor: pointer; }

/* Stat card value */
.sm-stat-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--text-color, #333);
}

/* Skeleton */
.sm-skeleton {
  height: 48px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 400px 100%;
  animation: smShimmer 1.4s ease infinite;
  border-radius: 4px;
}
@keyframes smShimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}

/* Search icon */
.sm-search-wrap { position: relative; }
.sm-search-icon {
  position: absolute;
  left: 9px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--text-muted, #adb5bd);
}
.sm-search-wrap input { padding-left: 28px !important; }
`;

let injected = false;

export function GlobalStyles() {
  useEffect(() => {
    if (injected) return;
    injected = true;
    const el = document.createElement("style");
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);
  return null;
}
