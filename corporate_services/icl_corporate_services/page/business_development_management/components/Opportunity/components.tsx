import React from "react";
import type { OpportunityDetail, OpportunityRow, OpportunityStats, WorkflowStateInfo } from "./types";
import { formatDate, formatMoney, statusColor } from "./utils";
import { WorkflowStatus } from "./WorkflowStatus";
import { FileBrowser } from "./FileBrowser";

function Donut({ total, value, color }: { total: number; value: number; color: string }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((value / total) * 100))) : 0;
  return (
    <div className="om-donut" style={{ ["--pct" as string]: `${pct}%`, ["--donut-color" as string]: color }}>
      <div className="om-donut-inner">
        <div className="om-donut-num">{value}</div>
        <div className="om-donut-label">TOTAL</div>
      </div>
    </div>
  );
}

type DashboardProps = {
  stats: OpportunityStats | null;
  rows: OpportunityRow[];
  total: number;
  loading: boolean;
  search: string;
  setSearch: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  activeStatusCount: number;
  onRefresh: () => void;
  onSelect: (id: string) => void;
};

export function DashboardView(props: DashboardProps) {
  const {
    stats, rows, total, loading, search, setSearch, statusFilter, setStatusFilter, activeStatusCount, onRefresh, onSelect,
  } = props;

  return (
    <div className="om-wrap">
      <div className="om-topbar">
        <p className="mb-0 text-muted">Manage your leads and opportunities</p>
        <div className="d-flex gap-2">
          <button className="btn btn-default btn-sm" onClick={() => (frappe as any).set_route("icl-opportunity-module", "guide")}>Opportunity Guide</button>
          <button className="btn btn-default btn-sm" onClick={() => (frappe as any).new_doc("Lead")}>+ New Lead</button>
          <button className="btn btn-primary btn-sm" onClick={() => (frappe as any).new_doc("Opportunity")}>+ New Opportunity</button>
        </div>
      </div>

      <div className="frappe-card om-card p-3 mb-3">
        <div className="om-section-title">BID DEVELOPMENT FRAMEWORK SETUP</div>
        <p className="mb-2">Review the complete bid coordination process, task checklist structure, expert assignment model, timelines and accountability requirements in the dedicated opportunity guide.</p>
        <button className="btn btn-default btn-sm" onClick={() => (frappe as any).set_route("icl-opportunity-module", "guide")}>Open Opportunity Guide</button>
      </div>

      <div className="row g-3 mb-2">
        <div className="col-md-4"><div className="frappe-card om-card p-3 h-100"><div className="om-section-title">OPPORTUNITIES BY STATUS</div><div className="d-flex justify-content-between align-items-center"><Donut total={stats?.total || 0} value={stats?.total || 0} color="#5a63f6" /><div className="w-100 ms-3"><div className="d-flex justify-content-between"><span>Open</span><b>{activeStatusCount} ({stats?.total ? Math.round((activeStatusCount / stats.total) * 100) : 0}%)</b></div><div className="om-bar"><span style={{ width: `${stats?.total ? Math.round((activeStatusCount / stats.total) * 100) : 0}%`, background: "#5a63f6" }} /></div></div></div></div></div>
        <div className="col-md-4"><div className="frappe-card om-card p-3 h-100"><div className="om-section-title">OPPORTUNITIES BY SOURCE TYPE</div><div className="d-flex justify-content-between align-items-center"><Donut total={stats?.total || 0} value={stats?.total || 0} color="#0d6efd" /><div className="w-100 ms-3">{(stats?.by_opportunity_from || []).slice(0, 2).map((s, i) => { const pct = stats?.total ? Math.round((Number(s.count) / stats.total) * 100) : 0; const colors = ["#0d6efd", "#36b37e"]; return <div key={s.opportunity_from || i} className="mb-2"><div className="d-flex justify-content-between"><span>{s.opportunity_from || "Unknown"}</span><b>{s.count} ({pct}%)</b></div><div className="om-bar"><span style={{ width: `${pct}%`, background: colors[i] || "#adb5bd" }} /></div></div>; })}</div></div></div></div>
        <div className="col-md-4"><div className="frappe-card om-card p-3 h-100"><div className="om-section-title">OPPORTUNITIES BY WORKFLOW STATE</div>{(stats?.by_workflow_state || []).slice(0, 3).map((s, i) => { const max = Math.max(...(stats?.by_workflow_state || [{ count: 1 }]).map((x) => Number(x.count)), 1); const pct = Math.round((Number(s.count) / max) * 100); const color = ["#28a745", "#adb5bd", "#5a63f6"][i] || "#adb5bd"; return <div key={s.workflow_state || i} className="mb-2"><div className="d-flex justify-content-between"><span>{s.workflow_state || "Unknown"}</span><b>{s.count}</b></div><div className="om-bar"><span style={{ width: `${pct}%`, background: color }} /></div></div>; })}</div></div>
      </div>

      <div className="d-flex align-items-center gap-2 mb-2">
        <input className="form-control form-control-sm" style={{ maxWidth: 300 }} placeholder="Search opportunities..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="form-control form-control-sm" style={{ maxWidth: 170 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {(stats?.by_status || []).map((s) => <option key={s.status} value={s.status}>{s.status}</option>)}
        </select>
        <button className="btn btn-default btn-sm" onClick={onRefresh}>⟳</button>
        <div className="ms-auto text-muted">{total} records</div>
      </div>

      <div className="frappe-card om-card p-0"><div className="table-responsive"><table className="table table-hover mb-0"><thead><tr><th>ID</th><th>TITLE / PARTY</th><th>STATUS</th><th>SALES STAGE</th><th>AMOUNT</th><th>EXPECTED CLOSING</th><th>OWNER</th><th>DATE</th></tr></thead><tbody>{!loading && rows.length === 0 && <tr><td colSpan={8} className="text-center text-muted py-4">No opportunities found.</td></tr>}{rows.map((r) => <tr key={r.name} onClick={() => onSelect(r.name)} style={{ cursor: "pointer" }}><td>{r.name}</td><td><div>{r.title || "-"}</div><small className="text-muted">{r.customer_name || "-"}</small></td><td><span className={`om-pill ${statusColor(r.status)}`}>{r.status || "-"}</span></td><td>{r.sales_stage || "-"}</td><td>{formatMoney(r.opportunity_amount, r.currency)}</td><td>{formatDate(r.expected_closing)}</td><td>{r.opportunity_owner || "-"}</td><td>{formatDate(r.transaction_date)}</td></tr>)}</tbody></table></div></div>
    </div>
  );
}

type DetailProps = {
  detail: OpportunityDetail;
  detailLoading: boolean;
  workflowStates: WorkflowStateInfo[];
  detailTab: "overview" | "finance" | "checklist";
  setDetailTab: (tab: "overview" | "finance" | "checklist") => void;
  groupedChecklist: Record<string, any[]>;
  sendingReminder: boolean;
  awarding: boolean;
  onBack: () => void;
  onAward: () => void;
  onSendReminder: () => void;
};

export function DetailView(props: DetailProps) {
  const { detail, detailLoading, workflowStates, detailTab, setDetailTab, groupedChecklist, sendingReminder, awarding, onBack, onAward, onSendReminder } = props;

  return (
    <div className="om-wrap">
      <div className="om-detail-header">
        <button className="om-back" onClick={onBack}>‹</button>
        <h5 className="om-title">{detail.title || detail.customer_name || detail.name} <span>{detail.name}</span></h5>
        <span className={`om-pill ${statusColor(detail.status)}`}>{detail.status || "-"}</span>
        {detail.linked_project && <span className="om-pill green">Awarded · {detail.linked_project}</span>}
        {!detail.linked_project && <button className="btn btn-primary btn-sm" onClick={onAward} disabled={awarding}>{awarding ? "Awarding…" : "Award"}</button>}
        <button className="btn btn-default btn-sm" onClick={() => (frappe as any).set_route("Form", "Opportunity", detail.name)}>Edit in Form</button>
      </div>
      {detailLoading && <div className="text-muted small mb-2">Loading details...</div>}

      <div className="row g-3"><div className="col-lg-8">
        <WorkflowStatus states={workflowStates} currentState={detail.workflow_state} />
        <div className="frappe-card om-card p-2 mb-3"><div className="btn-group btn-group-sm"><button className={`btn ${detailTab === "overview" ? "btn-primary" : "btn-default"}`} onClick={() => setDetailTab("overview")}>Overview</button><button className={`btn ${detailTab === "finance" ? "btn-primary" : "btn-default"}`} onClick={() => setDetailTab("finance")}>Finance</button><button className={`btn ${detailTab === "checklist" ? "btn-primary" : "btn-default"}`} onClick={() => setDetailTab("checklist")}>Task Checklist</button></div></div>

        {detailTab === "overview" && <><div className="frappe-card om-card p-3 mb-3"><div className="om-section-title">OVERVIEW</div><div className="om-grid"><div><label>Title</label><p>{detail.title || "-"}</p></div><div><label>Party</label><p>{detail.customer_name || "-"}</p></div><div><label>Opportunity From</label><p>{detail.opportunity_from || "-"}</p></div><div><label>Company</label><p>{detail.company || "-"}</p></div><div><label>Sales Stage</label><p>{detail.sales_stage || "-"}</p></div><div><label>Source</label><p>{detail.source || "-"}</p></div><div><label>Territory</label><p>{detail.territory || "-"}</p></div><div><label>Campaign</label><p>{detail.campaign || "-"}</p></div></div></div><div className="frappe-card om-card p-3 mb-3"><div className="om-section-title">CONTACT</div><div className="om-grid"><div><label>Contact Person</label><p>{detail.contact_person || "-"}</p></div><div><label>Email</label><p>{detail.contact_email || "-"}</p></div><div><label>Mobile</label><p>{detail.contact_mobile || "-"}</p></div><div><label>Phone</label><p>{detail.phone || "-"}</p></div><div><label>City</label><p>{detail.city || "-"}</p></div><div><label>Country</label><p>{detail.country || "-"}</p></div></div></div></>}
        {detailTab === "finance" && <div className="frappe-card om-card p-3 mb-3"><div className="om-section-title">FINANCE</div><div className="om-grid"><div><label>Opportunity Amount</label><p>{formatMoney(detail.opportunity_amount, detail.currency)}</p></div><div><label>Currency</label><p>{detail.currency || "-"}</p></div><div><label>Probability</label><p>{detail.probability != null ? `${detail.probability}%` : "-"}</p></div><div><label>Expected Closing</label><p>{formatDate(detail.expected_closing)}</p></div></div></div>}
        {detailTab === "checklist" && <div className="frappe-card om-card p-3 mb-3"><div className="om-section-title">TASK CHECKLIST</div>{Object.keys(groupedChecklist).length === 0 && <div className="text-muted">No checklist linked.</div>}{Object.entries(groupedChecklist).map(([section, items]) => <div key={section} className="mb-3"><h6 className="mb-2">{section}</h6><div className="om-list">{(items as any[]).map((item) => <div key={item.name} className="om-list-row"><span>{item.description}</span><span className={`om-pill ${statusColor(item.status)}`}>{item.status}</span></div>)}</div></div>)}</div>}
      </div>
      <div className="col-lg-4">
        <div className="frappe-card om-card p-3 mb-3"><div className="om-section-title">ASSIGNMENT</div><div className="om-stack"><div><label>Opportunity Owner</label><p>{detail.opportunity_owner || "-"}</p></div><div><label>Opportunity Date</label><p>{formatDate(detail.transaction_date)}</p></div><div><label>Created By</label><p>{detail.owner || "-"}</p></div><div><label>Last Modified</label><p>{formatDate(detail.modified)}</p></div></div></div>
        <div className="frappe-card om-card p-3 mb-3"><div className="om-section-title">CLOSING DATE</div><div className="om-stack"><div><label>Expected Closing (Due Date)</label><p>{formatDate(detail.expected_closing)}</p></div><button className="btn btn-default btn-sm" disabled={sendingReminder} onClick={onSendReminder}>{sendingReminder ? "Sending…" : "Send Due Reminder to Owner"}</button></div></div>
        <div className="frappe-card om-card p-3 mb-3"><div className="om-section-title">REMINDER ACTIVITY LOG</div><div className="om-list">{(detail.reminder_activities || []).length === 0 && <div className="text-muted">No reminder activity yet.</div>}{(detail.reminder_activities || []).map((x) => <div key={x.name} className="om-note"><div>{x.content}</div><small>{formatDate(x.creation)} • {x.owner}</small></div>)}</div></div>
        <div className="frappe-card om-card p-3 mb-3"><div className="om-section-title">MARKET</div><div className="om-stack"><div><label>Industry</label><p>{detail.industry || "-"}</p></div><div><label>Market Segment</label><p>{detail.market_segment || "-"}</p></div><div><label>No. of Employees</label><p>{detail.no_of_employees || "-"}</p></div><div><label>Annual Revenue</label><p>{formatMoney(detail.annual_revenue, detail.currency)}</p></div></div></div>
        {detail.opportunity_folder && (
          <div className="frappe-card om-card p-3 mb-3"><div className="om-section-title">FILES</div><FileBrowser rootFolder={detail.opportunity_folder} opportunityName={detail.name} /></div>
        )}
      </div></div>
    </div>
  );
}
