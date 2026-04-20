import { useEffect } from "react";

const CSS = `
/* ── ICL Opportunity Module styles ───────────────────────────── */

.om-app-wrap {
  padding: 0 4px;
  background: var(--bg-color, #fff);
  min-height: calc(100vh - 114px);
}

/* Fade-in animation */
.om-fade-in {
  animation: omFadeIn 0.22s ease both;
}
@keyframes omFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Header */
.om-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0 12px 0;
  border-bottom: 1px solid var(--border-color, #e2e6ea);
  margin-bottom: 18px;
  flex-wrap: wrap;
  gap: 10px;
}

.om-header-title {
  font-size: 13px;
  color: var(--text-muted, #6c757d);
  margin: 0;
}

.om-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Bid framework card */
.om-framework-card {
  padding: 16px 20px;
  margin-bottom: 16px;
}

.om-framework-intro {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: var(--text-color, #333);
}

.om-framework-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 4px;
  font-size: 13px;
  color: var(--text-color, #333);
}

/* Toolbar row (search + filter + refresh) */
.om-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.om-search-wrap {
  position: relative;
  flex: 1;
  min-width: 180px;
  max-width: 300px;
}
.om-search-wrap .om-search-icon {
  position: absolute;
  left: 9px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--text-muted, #adb5bd);
  font-size: 13px;
}
.om-search-wrap input {
  padding-left: 28px !important;
}

/* Table */
.om-table-wrap {
  overflow-x: auto;
  border-radius: 6px;
  border: 1px solid var(--border-color, #e2e6ea);
}

.om-table {
  margin-bottom: 0 !important;
  font-size: 13px;
}

.om-table thead th {
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

.om-table tbody tr {
  cursor: pointer;
  transition: background 0.12s ease;
}

.om-table tbody tr:hover {
  background: var(--fg-hover-color, #f8f9fa);
}

.om-table tbody td {
  vertical-align: middle;
  padding: 9px 12px;
  border-color: var(--border-color, #e9ecef) !important;
}

/* Opportunity name link */
.om-opp-link {
  color: var(--primary, #5e64ff);
  font-weight: 500;
  text-decoration: none;
}
.om-opp-link:hover {
  text-decoration: underline;
  color: var(--primary, #5e64ff);
}

/* Pagination */
.om-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0 4px 0;
  font-size: 13px;
  color: var(--text-muted, #6c757d);
  flex-wrap: wrap;
  gap: 8px;
}
.om-pagination-btns {
  display: flex;
  gap: 4px;
}

/* Empty / error state */
.om-empty {
  text-align: center;
  padding: 48px 24px;
  color: var(--text-muted, #6c757d);
}
.om-empty-icon {
  font-size: 36px;
  margin-bottom: 10px;
  opacity: 0.4;
}

/* ── Frappe native sidebar (portal target: #opportunity-sidebar-root) ── */
.om-page-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.om-page-sidebar-header {
  padding: 12px 10px 10px 10px;
  border-bottom: 1px solid var(--border-color, #e2e6ea);
}

.om-page-sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.om-sidebar-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted, #6c757d);
  margin: 0 0 8px 0;
}

.om-sidebar-item {
  display: flex;
  flex-direction: column;
  padding: 7px 10px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: background 0.1s ease, border-color 0.1s ease;
  gap: 2px;
}

.om-sidebar-item:hover {
  background: var(--fg-hover-color, #f0f1f3);
}

.om-sidebar-item.active {
  background: var(--control-bg, #e8eaf0);
  border-left-color: var(--primary, #5e64ff);
}

.om-sidebar-item-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.om-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}

.om-sidebar-item-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-color, #333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.om-sidebar-item-sub {
  font-size: 11px;
  color: var(--text-muted, #6c757d);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: 13px;
}

.om-sidebar-empty {
  padding: 20px 10px;
  text-align: center;
  font-size: 12px;
  color: var(--text-muted, #adb5bd);
}

/* ── Workflow state bar chart ── */
.om-wf-bar-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 4px;
}

.om-wf-bar-row {
  cursor: pointer;
}

.om-wf-bar-row:hover .om-wf-bar-fill {
  filter: brightness(1.1);
}

.om-wf-bar-meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 12px;
  margin-bottom: 5px;
}

.om-wf-bar-label {
  font-weight: 500;
  color: var(--text-color, #333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 65%;
}

.om-wf-bar-count {
  font-weight: 600;
  color: var(--text-color, #333);
  flex-shrink: 0;
}

.om-wf-bar-pct {
  font-weight: 400;
  color: var(--text-muted, #6c757d);
  font-size: 11px;
}

.om-wf-bar-track {
  background: var(--border-color, #eaecef);
  border-radius: 4px;
  height: 14px;
  overflow: hidden;
}

.om-wf-bar-fill {
  height: 100%;
  border-radius: 4px;
  min-width: 4px;
  transition: width 0.5s ease;
}

/* ── Workflow stepper ── */
.om-workflow-card {
  padding: 16px 20px;
  margin-bottom: 16px;
}

.om-workflow-current {
  margin-bottom: 16px;
}

.om-workflow-stepper {
  display: flex;
  align-items: flex-start;
  gap: 0;
  flex-wrap: wrap;
  row-gap: 8px;
}

.om-workflow-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex: 1;
  min-width: 60px;
}

.om-workflow-line {
  position: absolute;
  top: 13px;
  right: 50%;
  left: -50%;
  height: 2px;
  transition: background 0.3s ease;
}

.om-workflow-node {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  transition: background 0.25s ease, border-color 0.25s ease;
  flex-shrink: 0;
}

.om-workflow-node-num {
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}

.om-workflow-label {
  font-size: 11px;
  margin-top: 6px;
  text-align: center;
  line-height: 1.3;
  max-width: 80px;
  word-break: break-word;
  transition: color 0.25s ease;
}

/* ── Charts row ── */
.om-charts-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.om-charts-row .om-chart-card {
  flex: 1;
  min-width: 280px;
  margin-bottom: 0;
}

/* ── Status chart ── */
.om-chart-card {
  padding: 16px 20px;
  margin-bottom: 16px;
  max-width: 560px;
}

.om-chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.om-chart-loading {
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
}

.om-chart-body {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.om-donut-wrap {
  flex-shrink: 0;
  width: 128px;
}

.om-donut-svg {
  width: 100%;
  height: auto;
  display: block;
}

.om-donut-total-num {
  font-size: 20px;
  font-weight: 700;
  fill: var(--text-color, #333);
}

.om-donut-total-label {
  font-size: 10px;
  fill: var(--text-muted, #6c757d);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.om-chart-bars {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.om-chart-bar-row {
  cursor: pointer;
}

.om-chart-bar-row:hover .om-chart-bar-fill {
  filter: brightness(1.1);
}

.om-chart-bar-label-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-size: 12px;
}

.om-chart-bar-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.om-chart-bar-name {
  flex: 1;
  font-weight: 500;
  color: var(--text-color, #333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.om-chart-bar-count {
  font-weight: 600;
  color: var(--text-color, #333);
  flex-shrink: 0;
}

.om-chart-bar-pct {
  font-weight: 400;
  color: var(--text-muted, #6c757d);
  font-size: 11px;
}

.om-chart-bar-track {
  background: var(--border-color, #eaecef);
  border-radius: 4px;
  height: 8px;
  overflow: hidden;
}

.om-chart-bar-fill {
  height: 100%;
  border-radius: 4px;
  min-width: 4px;
  transition: width 0.5s ease;
}

/* ── Detail view ── */
.om-detail-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 0 12px 0;
  border-bottom: 1px solid var(--border-color, #e2e6ea);
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.om-detail-back {
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
.om-detail-back:hover {
  background: var(--fg-hover-color, #f0f0f0);
  color: var(--text-color, #333);
}

.om-detail-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  flex: 1;
}

.om-detail-id {
  font-size: 12px;
  color: var(--text-muted, #6c757d);
  font-weight: 400;
  margin-left: 6px;
}

.om-detail-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.om-section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted, #6c757d);
  margin: 0 0 10px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-color, #e9ecef);
}

.om-field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px 20px;
}

.om-field-label {
  font-size: 11px;
  color: var(--text-muted, #6c757d);
  margin-bottom: 2px;
  font-weight: 500;
}

.om-field-value {
  font-size: 13px;
  color: var(--text-color, #333);
  word-break: break-word;
}

.om-field-value.empty {
  color: var(--text-muted, #adb5bd);
}

/* ── File Browser ── */
.fb-root {
  font-size: 13px;
}

.fb-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  gap: 8px;
}

.fb-breadcrumb {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.fb-crumb {
  background: none;
  border: none;
  padding: 2px 4px;
  font-size: 12px;
  color: var(--primary, #5e64ff);
  cursor: pointer;
  border-radius: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}
.fb-crumb:hover:not(:disabled) {
  background: var(--fg-hover-color, #f0f1f3);
  text-decoration: underline;
}
.fb-crumb.active {
  color: var(--text-color, #333);
  font-weight: 600;
  cursor: default;
}

.fb-crumb-sep {
  color: var(--text-muted, #adb5bd);
  font-size: 11px;
  padding: 0 2px;
}

.fb-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.fb-upload-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.fb-new-folder-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.fb-new-folder-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: var(--control-bg, #f4f5f7);
  border-radius: 5px;
  margin-bottom: 8px;
}

.fb-new-folder-input {
  flex: 1;
  min-width: 0;
}

.fb-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.fb-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 5px;
  transition: background 0.1s ease;
  text-decoration: none;
  color: var(--text-color, #333);
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
}
.fb-item:hover {
  background: var(--fg-hover-color, #f4f5f7);
}
.fb-item--file {
  cursor: pointer;
}
.fb-item--file:hover {
  text-decoration: none;
  color: var(--text-color, #333);
}

.fb-item-name {
  flex: 1;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fb-item-size {
  font-size: 11px;
  color: var(--text-muted, #adb5bd);
  flex-shrink: 0;
}

.fb-loading {
  padding: 20px 0;
  text-align: center;
  color: var(--text-muted, #6c757d);
}

.fb-empty {
  padding: 16px 8px;
  text-align: center;
  color: var(--text-muted, #adb5bd);
  font-size: 12px;
}

.fb-error {
  padding: 10px 8px;
  color: var(--red-500, #e53e3e);
  font-size: 12px;
}

/* Drag-over state */
.fb-root {
  position: relative;
}

.fb-root.fb-drag-over {
  outline: 2px dashed var(--primary, #5e64ff);
  outline-offset: -2px;
  border-radius: 6px;
}

.fb-drop-overlay {
  position: absolute;
  inset: 0;
  background: rgba(94, 100, 255, 0.08);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--primary, #5e64ff);
  pointer-events: none;
  z-index: 10;
}

/* Upload progress rows */
.fb-upload-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  background: var(--control-bg, #f4f5f7);
  border-radius: 5px;
  margin-bottom: 4px;
  font-size: 12px;
}

.fb-upload-row--error {
  background: var(--red-50, #fff5f5);
}

.fb-upload-name {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-color, #333);
}

.fb-upload-progress-wrap {
  width: 80px;
  height: 5px;
  background: var(--border-color, #e2e6ea);
  border-radius: 3px;
  overflow: hidden;
  flex-shrink: 0;
}

.fb-upload-progress-bar {
  height: 100%;
  background: var(--primary, #5e64ff);
  border-radius: 3px;
  transition: width 0.2s ease;
}

.fb-upload-error-msg {
  color: var(--red-500, #e53e3e);
  font-size: 11px;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fb-upload-dismiss {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted, #adb5bd);
  font-size: 11px;
  padding: 0 2px;
  line-height: 1;
  flex-shrink: 0;
}
.fb-upload-dismiss:hover {
  color: var(--red-500, #e53e3e);
}

.fb-empty-hint {
  font-size: 11px;
  color: var(--text-muted, #adb5bd);
  margin-top: 4px;
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
