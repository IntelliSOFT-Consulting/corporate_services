export const LOCAL_STYLES = `
.ipm-dash-subnav {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 10px 12px 0;
  border-bottom: 1px solid var(--border-color, #dee2e6);
  background: var(--fg-color, #fff);
}
.ipm-dash-subnav-btn {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 6px 14px 8px;
  font-size: 13px;
  cursor: pointer;
  color: var(--text-muted, #6c757d);
  white-space: nowrap;
}
.ipm-dash-subnav-btn:hover {
  color: var(--text-color, #333);
}
.ipm-dash-subnav-btn.active {
  color: var(--primary, #5e64ff);
  border-bottom-color: var(--primary, #5e64ff);
  font-weight: 600;
}
.ipm-portfolio-card {
  cursor: pointer;
  transition: box-shadow 0.15s;
}
.ipm-portfolio-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}
.ipm-portfolio-banner {
  background: var(--fg-hover-color, #eef1f5);
  border: 1px solid var(--border-color, #dee2e6);
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 12px;
  color: var(--text-color, #333);
}
.ipm-pm-filter {
  max-width: 220px;
}
.ipm-portfolio-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
}
.ipm-portfolio-pill-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}
.ipm-portfolio-hint {
  font-size: 11px;
  font-style: italic;
  color: var(--text-muted, #6c757d);
}
.ipm-portfolio-rag-badge {
  font-size: 10px;
  font-weight: 600;
  border-radius: 999px;
  padding: 3px 9px;
  white-space: nowrap;
}
.ipm-portfolio-alert-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  border-radius: 4px;
  padding: 3px 8px;
  margin-top: 6px;
}
.ipm-portfolio-stat-row {
  display: flex;
  gap: 8px;
}
.ipm-portfolio-stat-box {
  flex: 1;
  background: var(--fg-hover-color, #f8f9fa);
  border-radius: 4px;
  padding: 6px 8px;
  min-width: 0;
}
.ipm-portfolio-stat-label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted, #6c757d);
}
.ipm-portfolio-stat-val {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-color, #333);
  overflow-wrap: break-word;
}
.ipm-pipeline-row {
  cursor: pointer;
}
.ipm-pipeline-row:hover td {
  background: var(--fg-hover-color, #f8f9fa);
}
.ipm-dash-loading {
  padding: 40px;
  text-align: center;
  color: #888;
}
.ipm-sidebar-header {
  padding: 12px 10px 10px;
  border-bottom: 1px solid var(--border-color, #e2e6ea);
}
.ipm-sidebar-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted, #6c757d);
  margin: 0;
}
.ipm-sidebar-list {
  padding: 6px 0;
}
.ipm-sidebar-item {
  padding: 8px 10px;
  cursor: pointer;
  font-size: 13px;
  border-left: 3px solid transparent;
}
.ipm-sidebar-item:hover {
  background: var(--fg-hover-color, #f8f9fa);
}
.ipm-sidebar-item.active {
  background: var(--control-bg, #e8eaf0);
  border-left-color: var(--primary, #5e64ff);
  font-weight: 600;
}
.ipm-content {
  padding: 0 10px;
}
.ipm-section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted, #6c757d);
  margin: 4px 0 8px;
}
.ipm-hours-row {
  cursor: pointer;
}
.ipm-hours-row:hover td {
  background: var(--fg-hover-color, #f8f9fa);
}
.ipm-stat-tile {
  border: 1px solid var(--border-color, #dee2e6);
  border-radius: 6px;
  padding: 14px;
  text-align: center;
  background: var(--fg-color, #fff);
}
.ipm-stat-tile-danger {
  border-color: #f2b8bd;
  background: #fdf1f2;
}
.ipm-stat-tile-val {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-color, #333);
  line-height: 1.1;
}
.ipm-stat-tile-danger .ipm-stat-tile-val {
  color: #dc3545;
}
.ipm-stat-tile-label {
  font-size: 11px;
  color: var(--text-muted, #6c757d);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 4px;
}
.ipm-health-pill {
  display: inline-block;
  border: 1px solid;
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
}
.ipm-workload-row-danger td {
  background: #fdf1f2;
}
.ipm-report-alert {
  border-left: 4px solid #e2a336;
  background: #fff8e6;
  border-radius: 6px;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.ipm-report-alert-text {
  font-size: 13px;
  color: #7a5b16;
}
.ipm-report-alert-btn {
  background: #dc3545;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.ipm-report-alert-btn:hover {
  background: #c62836;
}
.ipm-risk-tile {
  border-radius: 6px;
  padding: 14px;
  text-align: center;
}
.ipm-risk-tile-green { background: #eaf7ef; }
.ipm-risk-tile-amber { background: #fff8e6; }
.ipm-risk-tile-red { background: #fdecee; }
.ipm-risk-tile-val {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.1;
}
.ipm-risk-tile-green .ipm-risk-tile-val { color: #2e9e5b; }
.ipm-risk-tile-amber .ipm-risk-tile-val { color: #b8860b; }
.ipm-risk-tile-red .ipm-risk-tile-val { color: #dc3545; }
.ipm-risk-tile-label {
  font-size: 11px;
  color: var(--text-muted, #6c757d);
  margin-top: 4px;
}
.ipm-quickstat-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.ipm-quickstat-card {
  flex: 1;
  min-width: 200px;
  background: var(--fg-color, #fff);
  border: 1px solid var(--border-color, #dee2e6);
  border-left: 4px solid var(--primary, #5e64ff);
  border-radius: 6px;
  padding: 16px;
  text-align: center;
}
.ipm-quickstat-val {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-color, #333);
}
.ipm-quickstat-label {
  font-size: 12px;
  color: var(--text-muted, #6c757d);
  margin-top: 2px;
}
.ipm-quickstat-link {
  font-size: 11px;
  margin-top: 8px;
  display: inline-block;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--primary, #5e64ff);
}
.ipm-badge-pill {
  display: inline-block;
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 10px;
  font-weight: 700;
}
`;
