import { useEffect } from "react";

const CSS = `
/* -- Survey Manager custom styles ----------------------------- */

/* Survey card hover lift */
.sm-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.sm-card::before {
  content: "";
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: transparent;
  transition: background 0.15s ease;
  border-radius: 3px 0 0 3px;
}
.sm-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(0,0,0,0.09) !important;
}
.sm-card.sm-card-active::before {
  background: var(--primary, #5e64ff);
}
.sm-card.sm-card-active {
  background: var(--subtle-fg, #f4f5f7) !important;
}
.sm-card.sm-card-published::before {
  background: #28a745;
}

/* Status dot on card */
.sm-status-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

/* Fade-in animation */
.sm-fade-in {
  animation: smFadeIn 0.22s ease both;
}
@keyframes smFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Animated progress bar fill */
.sm-bar-fill {
  transition: width 0.75s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: inset 0 -2px 0 rgba(0,0,0,0.12);
}

/* Toast slide-in container */
.sm-toast-container {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 9999;
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  pointer-events: none;
}
.sm-toast {
  animation: smToastIn 0.3s ease both;
  pointer-events: all;
  min-width: 280px;
  max-width: 380px;
  border-radius: 8px !important;
  box-shadow: 0 4px 16px rgba(0,0,0,0.18) !important;
}
.sm-toast-out {
  animation: smToastOut 0.25s ease forwards;
}
@keyframes smToastIn {
  from { transform: translateX(110%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
@keyframes smToastOut {
  from { transform: translateX(0);    opacity: 1; }
  to   { transform: translateX(110%); opacity: 0; }
}

/* Nav tab tweaks - smooth underline transition */
.sm-nav-tab {
  border: none !important;
  background: none !important;
  position: relative;
  color: var(--text-muted, #6c757d) !important;
  transition: color 0.15s ease !important;
}
.sm-nav-tab::after {
  content: "";
  position: absolute;
  bottom: 0; left: 12px; right: 12px;
  height: 2px;
  background: var(--primary, #5e64ff);
  border-radius: 2px 2px 0 0;
  transform: scaleX(0);
  transition: transform 0.2s ease;
}
.sm-nav-tab.active {
  color: var(--primary, #5e64ff) !important;
  font-weight: 600;
}
.sm-nav-tab.active::after {
  transform: scaleX(1);
}

/* Animated caret */
.sm-caret {
  display: inline-block;
  font-size: 10px;
  transition: transform 0.2s ease;
  transform: rotate(0deg);
  line-height: 1;
  color: var(--text-muted, #6c757d);
}
.sm-caret.open {
  transform: rotate(90deg);
}

/* Section body smooth collapse */
.sm-section-body {
  overflow: hidden;
  transition: max-height 0.28s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.22s ease;
}
.sm-section-body.open {
  max-height: 4000px;
  opacity: 1;
}
.sm-section-body.closed {
  max-height: 0;
  opacity: 0;
}

/* Question card hover */
.sm-question-card {
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.sm-question-card:hover {
  border-color: var(--primary, #5e64ff) !important;
  box-shadow: 0 2px 8px rgba(94,100,255,0.10);
}

/* Pulsing "Unsaved" badge */
.sm-unsaved-badge {
  animation: smPulse 2s ease-in-out infinite;
}
@keyframes smPulse {
  0%,100% { opacity: 1; }
  50%      { opacity: 0.6; }
}

/* Mini response rate bar */
.sm-rate-track {
  height: 4px;
  border-radius: 2px;
  background: var(--border-color, #e9ecef);
  overflow: hidden;
  margin-top: 4px;
}
.sm-rate-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s ease;
}

/* Search input icon wrapper */
.sm-search-wrap {
  position: relative;
}
.sm-search-wrap .sm-search-icon {
  position: absolute;
  left: 9px; top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--text-muted, #adb5bd);
  font-size: 13px;
  line-height: 1;
}
.sm-search-wrap input {
  padding-left: 28px !important;
}

/* Stat card in report summary */
.sm-stat-card {
  flex: 1;
  text-align: center;
  padding: 10px 12px;
}
.sm-stat-card .sm-stat-num {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.1;
}
.sm-stat-card .sm-stat-label {
  font-size: 11px;
  color: var(--text-muted, #6c757d);
  margin-top: 2px;
}
.sm-stat-card .sm-stat-icon {
  font-size: 18px;
  margin-bottom: 4px;
  display: block;
}

/* Divider */
.sm-vr {
  width: 1px;
  background: var(--border-color, #e2e6ea);
  align-self: stretch;
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
