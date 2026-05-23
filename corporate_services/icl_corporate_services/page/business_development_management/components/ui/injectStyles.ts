export function injectBusinessDevelopmentStyles() {
  if (document.getElementById("bdm-react-style")) return;
  const style = document.createElement("style");
  style.id = "bdm-react-style";
  style.textContent = `
    .sm-sidebar-header {
      padding:10px 10px 8px; 
      border-bottom:1px solid var(--border-color, #e2e6ea); 
    }
    .sm-sidebar-title { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted,#6c757d); margin:0; }
    .sm-sidebar-item { display:flex; align-items:center; padding:8px 12px; cursor:pointer; border-left:3px solid transparent; }
    .sm-sidebar-item:hover { background:var(--fg-hover-color, #f0f1f3); }
    .sm-sidebar-item.active { background:var(--control-bg, #e8eaf0); border-left-color:var(--primary, #5e64ff); }
    .sm-sidebar-item-name { font-size:12px; font-weight:500; color:var(--text-color, #333); }

    @keyframes icl-shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
    .skeleton-box {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 400px 100%;
      animation: icl-shimmer 1.4s ease infinite;
      border-radius: 4px;
      display: inline-block;
    }
    .bg-blue-light { background: rgba(74,144,226,.12)!important; }
    .bg-purple-light { background: rgba(108,78,185,.12)!important; }
    .bg-green-light { background: rgba(41,168,117,.12)!important; }
    .bg-yellow-light { background: rgba(245,178,51,.12)!important; }
    .bg-red-light { background: rgba(226,74,74,.12)!important; }
    .avatar.avatar-medium { width:40px; height:40px; display:flex; align-items:center; justify-content:center; }
    .icl-badge { font-size: 11px; padding: 3px 8px; border-radius: 20px; font-weight: 500; display:inline-block; }
    .icl-badge.open { background:#e8f4fd; color:#1a73e8; }
    .icl-badge.replied { background:#e6f4ea; color:#188038; }
    .icl-badge.opportunity { background:#fce8e6; color:#c5221f; }
    .icl-badge.interested { background:#fef7e0; color:#b06000; }
    .icl-badge.converted { background:#e8f0fe; color:#3c4043; }
    .icl-badge.default { background:#f1f3f4; color:#5f6368; }
    .icl-badge.opp-badge { margin-right:4px; margin-bottom:2px; }
    .icl-badge.opp-badge.quotation { background:#fff8e1; color:#f57f17; }
    .icl-badge.opp-badge.closed { background:#fce4ec; color:#c62828; }
    .icl-badge.opp-badge.lost { background:#f3e5f5; color:#6a1b9a; }
    .icl-sticky-card { position: sticky; top: 16px; }
    .icl-sidebar-list { max-height: 72vh; overflow-y: auto; }
    .icl-sidebar-item { border-bottom: 1px solid #f1f3f4; padding: 10px 12px; cursor: pointer; }
    .icl-sidebar-item:hover { background: #f8f9fa; }
    .icl-sidebar-item.active { background: #e8f0fe; border-left: 3px solid #1a73e8; }
    .icl-sidebar-title { font-weight: 600; font-size: 13px; line-height: 1.2; color: #202124; }
    .icl-sidebar-sub { font-size: 12px; color: #5f6368; margin-top: 2px; }
    .icl-mini-pill { display:inline-block; border-radius:999px; padding:2px 7px; font-size:10px; font-weight:600; background:#eef2ff; color:#334155; }
    .icl-chart-empty { color:#6b7280; font-size:12px; padding:10px 0; }
    .icl-bar-row { margin-bottom:10px; }
    .icl-bar-meta { display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:4px; gap:10px; }
    .icl-bar-label { color:#1f2937; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .icl-bar-val { color:#6b7280; font-weight:600; }
    .icl-bar-track { height:8px; border-radius:999px; background:#eef2f7; overflow:hidden; }
    .icl-bar-fill { height:100%; border-radius:999px; background: linear-gradient(90deg, #2563eb 0%, #38bdf8 100%); }
    @media (max-width: 991px) { .icl-sticky-card { position: static; } .icl-sidebar-list { max-height:340px; } }

    .om-wrap { padding: 12px; }
    .om-topbar { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; }
    .om-card { border:1px solid var(--border-color, #e5e7eb); border-radius:10px; }
    .om-section-title { font-size:12px; font-weight:700; letter-spacing:.04em; color:#4b5563; margin-bottom:8px; }
    .om-bar { background:#e5e7eb; border-radius:999px; height:8px; overflow:hidden; }
    .om-bar > span { display:block; height:100%; border-radius:999px; }
    .om-pill { display:inline-flex; align-items:center; gap:4px; border-radius:999px; padding:2px 10px; font-size:12px; font-weight:600; background:#eef2ff; color:#1d4ed8; }
    .om-pill.green { background:#dcfce7; color:#15803d; }
    .om-pill.red { background:#fee2e2; color:#b91c1c; }
    .om-pill.orange { background:#ffedd5; color:#c2410c; }
    .om-pill.gray { background:#f3f4f6; color:#4b5563; }
    .om-pill.blue { background:#dbeafe; color:#1d4ed8; }
    .om-donut { width:126px; height:126px; border-radius:50%; background:conic-gradient(var(--donut-color) var(--pct), #e5e7eb 0); position:relative; flex:0 0 126px; }
    .om-donut-inner { position:absolute; inset:18px; border-radius:50%; background:white; display:flex; flex-direction:column; justify-content:center; align-items:center; }
    .om-donut-num { font-size:36px; font-weight:700; line-height:1; }
    .om-donut-label { font-size:11px; color:#6b7280; margin-top:2px; }
    .om-detail-header { display:flex; align-items:center; gap:8px; border-bottom:1px solid var(--border-color, #e5e7eb); margin-bottom:12px; padding-bottom:8px; }
    .om-back { border:none; background:transparent; font-size:22px; line-height:1; color:#374151; }
    .om-title { margin:0; font-size:30px; font-weight:700; display:flex; gap:8px; align-items:center; }
    .om-title span { font-size:16px; color:#6b7280; font-weight:500; }
    .om-workflow { display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap:10px; }
    .om-step { display:flex; flex-direction:column; align-items:center; text-align:center; gap:4px; }
    .om-step span { width:30px; height:30px; border-radius:999px; background:#f3f4f6; color:#4b5563; display:flex; align-items:center; justify-content:center; font-weight:700; }
    .om-step.active span { background:#cbd5e1; color:#111827; }
    .om-step small { color:#6b7280; font-size:11px; }
    .om-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; }
    .om-grid label, .om-stack label { font-size:12px; color:#6b7280; margin:0 0 2px; display:block; }
    .om-grid p, .om-stack p { margin:0; font-size:14px; color:#111827; font-weight:500; }
    .om-stack { display:grid; gap:10px; }
    .om-list { display:grid; gap:8px; }
    .om-list-row { display:flex; justify-content:space-between; gap:10px; align-items:center; border:1px solid var(--border-color, #e5e7eb); border-radius:8px; padding:8px 10px; }
    .om-note { border:1px solid var(--border-color, #e5e7eb); border-radius:8px; padding:8px 10px; font-size:13px; }
    .om-note small { color:#6b7280; font-size:12px; display:block; margin-top:4px; }
    @media (max-width: 1100px) { .om-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .om-title { font-size:22px; } }
    @media (max-width: 768px) { .om-topbar, .om-detail-header { flex-wrap:wrap; } .om-workflow { grid-template-columns:repeat(2,minmax(0,1fr)); } }
  `;
  document.head.appendChild(style);
}
