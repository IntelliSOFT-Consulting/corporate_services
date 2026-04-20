import { useEffect } from "react";

const CSS = `
/* ── ICL Project Module styles ───────────────────────────── */

.pm-app-wrap {
  padding: 0 4px;
  background: var(--bg-color, #fff);
  min-height: calc(100vh - 114px);
}

/* Fade-in animation */
.pm-fade-in {
  animation: pmFadeIn 0.22s ease both;
}
@keyframes pmFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Header */
.pm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0 12px 0;
  border-bottom: 1px solid var(--border-color, #e2e6ea);
  margin-bottom: 18px;
  flex-wrap: wrap;
  gap: 10px;
}

.pm-header-title {
  font-size: 13px;
  color: var(--text-muted, #6c757d);
  margin: 0;
}

.pm-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Toolbar row (search + filter + refresh) */
.pm-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.pm-charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.pm-chart-card {
  padding: 16px 20px;
}

.pm-chart-header {
  margin-bottom: 12px;
}

.pm-chart-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pm-chart-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pm-chart-row.clickable {
  cursor: pointer;
}

.pm-chart-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pm-chart-label-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.pm-chart-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

.pm-chart-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color, #333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pm-chart-value {
  font-size: 12px;
  color: var(--text-muted, #6c757d);
  white-space: nowrap;
}

.pm-chart-pct {
  color: var(--text-muted, #adb5bd);
}

.pm-chart-track {
  height: 8px;
  background: var(--border-color, #e9ecef);
  border-radius: 999px;
  overflow: hidden;
}

.pm-chart-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.45s ease;
}

.pm-chart-empty {
  padding: 18px 0 4px 0;
  font-size: 13px;
  color: var(--text-muted, #6c757d);
}

.pm-search-wrap {
  position: relative;
  flex: 1;
  min-width: 180px;
  max-width: 300px;
}
.pm-search-wrap .pm-search-icon {
  position: absolute;
  left: 9px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--text-muted, #adb5bd);
  font-size: 13px;
}
.pm-search-wrap input {
  padding-left: 28px !important;
}

/* Table */
.pm-table-wrap {
  overflow-x: auto;
  border-radius: 6px;
  border: 1px solid var(--border-color, #e2e6ea);
}

.pm-table {
  margin-bottom: 0 !important;
  font-size: 13px;
}

.pm-table thead th {
  background: var(--subtle-fg, #f4f5f7);
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted, #6c757d);
  border-bottom: 1px solid var(--border-color, #e2e6ea) !important;
  white-space: nowrap;
  padding: 10px 12px;
}

.pm-table tbody tr {
  cursor: pointer;
  transition: background 0.12s ease;
}

.pm-table tbody tr:hover {
  background: var(--fg-hover-color, #f8f9fa);
}

.pm-table tbody td {
  vertical-align: middle;
  padding: 9px 12px;
  border-color: var(--border-color, #e9ecef) !important;
}

/* Project name link */
.pm-proj-link {
  color: var(--primary, #5e64ff);
  font-weight: 500;
  text-decoration: none;
}
.pm-proj-link:hover {
  text-decoration: underline;
  color: var(--primary, #5e64ff);
}

/* Pagination */
.pm-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0 4px 0;
  font-size: 13px;
  color: var(--text-muted, #6c757d);
  flex-wrap: wrap;
  gap: 8px;
}
.pm-pagination-btns {
  display: flex;
  gap: 4px;
}

/* Empty / error state */
.pm-empty {
  text-align: center;
  padding: 48px 24px;
  color: var(--text-muted, #6c757d);
}
.pm-empty-icon {
  font-size: 36px;
  margin-bottom: 10px;
  opacity: 0.4;
}

/* ── Frappe native sidebar (portal target: #project-sidebar-root) ── */
.pm-page-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.pm-page-sidebar-header {
  padding: 12px 10px 10px 10px;
  border-bottom: 1px solid var(--border-color, #e2e6ea);
}

.pm-page-sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.pm-sidebar-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted, #6c757d);
  margin: 0 0 8px 0;
}

.pm-sidebar-item {
  display: flex;
  flex-direction: column;
  padding: 7px 10px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: background 0.1s ease, border-color 0.1s ease;
  gap: 2px;
}

.pm-sidebar-item:hover {
  background: var(--fg-hover-color, #f0f1f3);
}

.pm-sidebar-item.active {
  background: var(--control-bg, #e8eaf0);
  border-left-color: var(--primary, #5e64ff);
}

.pm-sidebar-item-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.pm-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}

.pm-sidebar-item-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-color, #333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pm-sidebar-item-sub {
  font-size: 11px;
  color: var(--text-muted, #6c757d);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: 13px;
}

.pm-sidebar-empty {
  padding: 20px 10px;
  text-align: center;
  font-size: 12px;
  color: var(--text-muted, #adb5bd);
}

/* ── Detail view ── */
.pm-detail-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 0 12px 0;
  border-bottom: 1px solid var(--border-color, #e2e6ea);
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.pm-detail-back {
  background: none;
  border: none;
  padding: 4px 6px;
  cursor: pointer;
  color: var(--text-muted, #6c757d);
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: background 0.12s ease, color 0.12s ease;
}
.pm-detail-back:hover {
  background: var(--fg-hover-color, #f0f0f0);
  color: var(--text-color, #333);
}

.pm-detail-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  flex: 1;
}

.pm-detail-id {
  font-size: 12px;
  color: var(--text-muted, #6c757d);
  font-weight: 400;
  margin-left: 6px;
}

.pm-detail-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.pm-section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted, #6c757d);
  margin: 0 0 10px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-color, #e9ecef);
}

.pm-field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px 20px;
}

.pm-field-label {
  font-size: 11px;
  color: var(--text-muted, #6c757d);
  margin-bottom: 2px;
  font-weight: 500;
}

.pm-field-value {
  font-size: 13px;
  color: var(--text-color, #333);
  word-break: break-word;
}

.pm-field-value.empty {
  color: var(--text-muted, #adb5bd);
}

.pm-list-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.pm-related-table-wrap {
  overflow-x: auto;
}

.pm-related-table {
  margin-bottom: 0 !important;
}

.pm-related-table thead th {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted, #6c757d);
  white-space: nowrap;
}

.pm-empty-inline {
  font-size: 13px;
  color: var(--text-muted, #6c757d);
  padding: 4px 0 2px 0;
}

/* ── Progress bar ── */
.pm-progress-bar-track {
  height: 6px;
  border-radius: 3px;
  background: var(--border-color, #e9ecef);
  overflow: hidden;
  margin-top: 4px;
}
.pm-progress-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--primary, #5e64ff);
  transition: width 0.4s ease;
}
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
