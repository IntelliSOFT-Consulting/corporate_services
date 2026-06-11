import React, { useEffect, useState } from "react";

type Opp = {
  name: string;
  title?: string;
  status?: string;
  sales_stage?: string;
  workflow_state?: string;
  opportunity_amount?: number;
  currency?: string;
  expected_closing?: string;
  opportunity_owner?: string;
  transaction_date?: string;
};

type Project = {
  name: string;
  project_name?: string;
  status?: string;
  percent_complete?: number;
  expected_start_date?: string;
  expected_end_date?: string;
  custom_bid?: string;
};

type LeadDoc = {
  name: string;
  lead_name?: string;
  company_name?: string;
  status?: string;
  source?: string;
  email_id?: string;
  mobile_no?: string;
  phone?: string;
  lead_owner?: string;
  territory?: string;
  market_segment?: string;
  industry?: string;
  website?: string;
  creation?: string;
};

type Detail = { lead: LeadDoc; opportunities: Opp[]; projects: Project[] };

function statusClass(status?: string) {
  return (status || "").toLowerCase().replace(/\s+/g, "-") || "default";
}

function fmtMoney(value?: number, currency?: string) {
  if (value == null) return "-";
  return `${currency || ""} ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`.trim();
}

function fmtDate(d?: string) {
  return d ? frappe.datetime.str_to_user(d) : "-";
}

export function LeadDetail({ name, onBack }: { name: string; onBack: () => void }) {
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await (frappe as any).call({
          method: "corporate_services.api.leads.get_lead_detail",
          args: { name },
        });
        if (!cancelled) setData(res?.message || null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [name]);

  const lead = data?.lead;
  const opps = data?.opportunities || [];
  const projects = data?.projects || [];

  return (
    <div className="om-wrap">
      <div className="om-detail-header">
        <button className="om-back" onClick={onBack}>‹</button>
        <h5 className="om-title">{lead?.lead_name || name} <span>{name}</span></h5>
        {lead?.status && <span className={`icl-badge ${statusClass(lead.status)} default`}>{lead.status}</span>}
        <button className="btn btn-default btn-sm ms-auto" onClick={() => (frappe as any).set_route("Form", "Lead", name)}>Edit in Form</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <div className="text-muted small mb-2">Loading lead…</div>}

      <div className="row g-3">
        <div className="col-lg-4">
          <div className="frappe-card om-card p-3 mb-3">
            <div className="om-section-title">LEAD DETAILS</div>
            <div className="om-stack">
              <div><label>Company</label><p>{lead?.company_name || "-"}</p></div>
              <div><label>Source</label><p>{lead?.source || "-"}</p></div>
              <div><label>Email</label><p>{lead?.email_id || "-"}</p></div>
              <div><label>Mobile</label><p>{lead?.mobile_no || "-"}</p></div>
              <div><label>Phone</label><p>{lead?.phone || "-"}</p></div>
              <div><label>Owner</label><p>{lead?.lead_owner || "-"}</p></div>
              <div><label>Territory</label><p>{lead?.territory || "-"}</p></div>
              <div><label>Industry</label><p>{lead?.industry || "-"}</p></div>
              <div><label>Created</label><p>{fmtDate(lead?.creation)}</p></div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card shadow-sm border-0 mb-3">
            <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center">
              <h6 className="mb-0 font-weight-bold">Opportunities ({opps.length})</h6>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="thead-light">
                    <tr><th>Opportunity</th><th>Status</th><th>Stage</th><th className="text-end">Amount</th><th>Expected Closing</th></tr>
                  </thead>
                  <tbody>
                    {!opps.length && <tr><td colSpan={5} className="text-center py-4 text-muted">No opportunities for this lead.</td></tr>}
                    {opps.map((o) => (
                      <tr key={o.name} style={{ cursor: "pointer" }} onClick={() => (frappe as any).set_route("Form", "Opportunity", o.name)}>
                        <td className="font-weight-semibold">{o.title || o.name}</td>
                        <td><span className={`icl-badge ${statusClass(o.status)} default`}>{o.status || "-"}</span></td>
                        <td>{o.sales_stage || "-"}</td>
                        <td className="text-end">{fmtMoney(o.opportunity_amount, o.currency)}</td>
                        <td className="text-muted">{fmtDate(o.expected_closing)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-bottom">
              <h6 className="mb-0 font-weight-bold">Projects ({projects.length})</h6>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="thead-light">
                    <tr><th>Project</th><th>Status</th><th>Progress</th><th>Start</th><th>End</th><th>From Bid</th></tr>
                  </thead>
                  <tbody>
                    {!projects.length && <tr><td colSpan={6} className="text-center py-4 text-muted">No projects linked to this lead.</td></tr>}
                    {projects.map((p) => (
                      <tr key={p.name} style={{ cursor: "pointer" }} onClick={() => (frappe as any).set_route("Form", "Project", p.name)}>
                        <td className="font-weight-semibold">{p.project_name || p.name}</td>
                        <td><span className={`icl-badge ${statusClass(p.status)} default`}>{p.status || "-"}</span></td>
                        <td>{p.percent_complete != null ? `${Math.round(p.percent_complete)}%` : "-"}</td>
                        <td className="text-muted">{fmtDate(p.expected_start_date)}</td>
                        <td className="text-muted">{fmtDate(p.expected_end_date)}</td>
                        <td className="text-muted">{p.custom_bid || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
