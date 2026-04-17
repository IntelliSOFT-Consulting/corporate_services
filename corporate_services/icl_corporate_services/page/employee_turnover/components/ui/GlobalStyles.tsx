import { useEffect } from "react";

const CSS = `

.et-app-wrap {
  padding: 0 4px;
  background: var(--bg-color, #fff);
  min-height: calc(100vh - 114px);
}

/* Fade-in animation */
.et-fade-in {
  animation: etFadeIn 0.22s ease both;
}
@keyframes etFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.et-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0 12px 0;
  border-bottom: 1px solid var(--border-color, #e2e6ea);
  margin-bottom: 18px;
  flex-wrap: wrap;
  gap: 10px;
}

.et-header-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 2px 0;
  color: var(--text-color, #333);
}

.et-header-subtitle {
  font-size: 12px;
  color: var(--text-muted, #6c757d);
  margin: 0;
}

.et-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.et-stats-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.et-stat-card {
  flex: 1;
  min-width: 150px;
  padding: 16px 18px !important;
  margin-bottom: 0 !important;
}

.et-stat-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted, #6c757d);
  margin-bottom: 6px;
}

.et-stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-color, #333);
  line-height: 1.1;
  margin-bottom: 4px;
}

.et-stat-sub {
  font-size: 11px;
  color: var(--text-muted, #adb5bd);
}

.et-stat-skeleton {
  height: 56px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 400px 100%;
  animation: etShimmer 1.4s ease infinite;
  border-radius: 6px;
}
@keyframes etShimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}

.et-chart-card {
  padding: 16px 20px !important;
  margin-bottom: 16px !important;
}

.et-month-chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 120px;
  margin-top: 12px;
}

.et-month-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  position: relative;
}

.et-month-bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.et-month-bar {
  width: 70%;
  min-height: 3px;
  background: var(--primary, #5e64ff);
  border-radius: 3px 3px 0 0;
  opacity: 0.8;
  transition: opacity 0.15s ease, height 0.5s ease;
}

.et-month-col:hover .et-month-bar {
  opacity: 1;
}

.et-month-label {
  font-size: 10px;
  color: var(--text-muted, #6c757d);
  margin-top: 4px;
  text-align: center;
}

.et-month-cnt {
  font-size: 10px;
  font-weight: 600;
  color: var(--primary, #5e64ff);
  text-align: center;
}

.et-section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted, #6c757d);
  margin: 0 0 10px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-color, #e9ecef);
}

.et-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.et-search-wrap {
  position: relative;
  flex: 1;
  min-width: 180px;
  max-width: 320px;
}

.et-search-icon {
  position: absolute;
  left: 9px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--text-muted, #adb5bd);
}

.et-search-wrap input {
  padding-left: 28px !important;
}

.et-table-wrap {
  overflow-x: auto;
  border-radius: 6px;
  border: 1px solid var(--border-color, #e2e6ea);
  margin-bottom: 8px;
}

.et-table {
  margin-bottom: 0 !important;
  font-size: 13px;
}

.et-table thead th {
  background: var(--subtle-fg, #f4f5f7);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted, #6c757d);
  border-bottom: 1px solid var(--border-color, #e2e6ea) !important;
  white-space: nowrap;
  padding: 10px 12px;
}

.et-table tbody tr {
  cursor: pointer;
  transition: background 0.12s ease;
}

.et-table tbody tr:hover {
  background: var(--fg-hover-color, #f8f9fa);
}

.et-table tbody td {
  vertical-align: middle;
  padding: 9px 12px;
  border-color: var(--border-color, #e9ecef) !important;
}

.et-empty {
  text-align: center;
  padding: 48px 24px;
  color: var(--text-muted, #6c757d);
}

.et-empty-icon {
  font-size: 36px;
  margin-bottom: 10px;
  opacity: 0.4;
}

.et-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0 4px 0;
  font-size: 13px;
  color: var(--text-muted, #6c757d);
  flex-wrap: wrap;
  gap: 8px;
}

.et-pagination-btns {
  display: flex;
  gap: 4px;
}

.et-detail-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 0 12px 0;
  border-bottom: 1px solid var(--border-color, #e2e6ea);
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.et-detail-back {
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

.et-detail-back:hover {
  background: var(--fg-hover-color, #f0f0f0);
  color: var(--text-color, #333);
}

.et-detail-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  flex: 1;
}

.et-detail-id {
  font-size: 12px;
  color: var(--text-muted, #6c757d);
  font-weight: 400;
  margin-left: 6px;
}

.et-detail-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.et-field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px 20px;
}

.et-field-label {
  font-size: 11px;
  color: var(--text-muted, #6c757d);
  margin-bottom: 2px;
  font-weight: 500;
}

.et-field-value {
  font-size: 13px;
  color: var(--text-color, #333);
  word-break: break-word;
}

.et-field-value.empty {
  color: var(--text-muted, #adb5bd);
}

.sm-sidebar-header {
  padding: 14px 12px 10px 12px;
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
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
}

.sm-sidebar-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 14px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-color, #333);
  border-radius: 0;
  transition: background 0.1s ease;
  gap: 6px;
  user-select: none;
}

.sm-sidebar-item:hover {
  background: var(--fg-hover-color, #f5f6fa);
}

.sm-sidebar-item.active {
  background: var(--sidebar-select-color, #e8f0fe);
  color: var(--primary, #5e64ff);
  font-weight: 600;
}

.sm-sidebar-item-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sm-sidebar-item-count {
  font-size: 11px;
  color: var(--text-muted, #adb5bd);
  font-weight: 500;
  flex-shrink: 0;
}

.et-rate-highlight {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}

.et-rate-percent {
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
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
