import React, { useEffect, useMemo, useState } from "react";

type LeadRow = {
  name: string;
  lead_name?: string;
  company_name?: string;
  status?: string;
  source?: string;
  mobile_no?: string;
  email_id?: string;
  lead_owner?: string;
  creation?: string;
};

type OppRow = {
  name: string;
  status?: string;
  party_name?: string;
  opportunity_amount?: number;
};

type OppMap = Record<string, Array<{ opp: string; status: string; amount: number }>>;

type StatCardProps = {
  label: string;
  value: number;
  loading: boolean;
  colorClass: string;
};

function StatCard({ label, value, loading, colorClass }: StatCardProps) {
  return (
    <div className="col-xl col-md-4 col-sm-6 mb-3">
      <div className="card h-100 shadow-sm border-0">
        <div className="card-body d-flex align-items-center">
          <div className="me-3">
            <span className={`avatar avatar-medium rounded ${colorClass}`} />
          </div>
          <div>
            <div className="text-muted small mb-1">{label}</div>
            <div className="h4 mb-0 font-weight-bold text-dark">
              {loading ? <span className="skeleton-box" style={{ width: 50, height: 28 }} /> : Number(value).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type BarChartCardProps = {
  title: string;
  bars: Array<[string, number]>;
};

function BarChartCard({ title, bars }: BarChartCardProps) {
  return (
    <div className="card shadow-sm border-0">
      <div className="card-header bg-white border-bottom">
        <h6 className="mb-0 font-weight-bold">{title}</h6>
      </div>
      <div className="card-body">
        {!bars.length && <div className="icl-chart-empty">No data to display for current filter.</div>}
        {bars.map(([name, value]) => {
          const max = Math.max(...bars.map((x) => x[1]), 1);
          const width = Math.round((value / max) * 100);
          return (
            <div className="icl-bar-row" key={name}>
              <div className="icl-bar-meta">
                <span className="icl-bar-label">{name}</span>
                <span className="icl-bar-val">{Number(value).toLocaleString()}</span>
              </div>
              <div className="icl-bar-track">
                <div className="icl-bar-fill" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function statusClass(status?: string) {
  return (status || "").toLowerCase().replace(/\s+/g, "-") || "default";
}

type LeadsTableProps = {
  rows: LeadRow[];
  start: number;
  oppMap: OppMap;
};

function LeadsTable({ rows, start, oppMap }: LeadsTableProps) {
  return (
    <div className="table-responsive">
      <table className="table table-hover mb-0" id="icl-leads-table">
        <thead className="thead-light">
          <tr>
            <th>#</th>
            <th>Lead Name</th>
            <th>Company</th>
            <th>Status</th>
            <th>Source</th>
            <th>Mobile</th>
            <th>Email</th>
            <th>Linked Opportunities</th>
            <th>Owner</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {!rows.length && (
            <tr>
              <td colSpan={11} className="text-center py-5 text-muted">
                No leads found.
              </td>
            </tr>
          )}
          {rows.map((lead, idx) => (
            <tr
              key={lead.name}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a")) return;
                frappe.set_route("leads/" + lead.name);
              }}
            >
              <td className="text-muted">{start + idx + 1}</td>
              <td className="font-weight-semibold">{lead.lead_name || "-"}</td>
              <td>{lead.company_name || "-"}</td>
              <td>
                <span className={`icl-badge ${statusClass(lead.status)} default`}>{lead.status || "-"}</span>
              </td>
              <td>{lead.source || "-"}</td>
              <td>{lead.mobile_no || "-"}</td>
              <td>{lead.email_id || "-"}</td>
              <td>
                {(oppMap[lead.name] || []).length
                  ? (oppMap[lead.name] || []).map((o) => (
                      <span key={o.opp} className={`icl-badge opp-badge ${statusClass(o.status)}`}>
                        {o.opp}
                      </span>
                    ))
                  : <span className="text-muted">-</span>}
              </td>
              <td>{lead.lead_owner || "-"}</td>
              <td className="text-muted">{lead.creation ? frappe.datetime.str_to_user(lead.creation) : "-"}</td>
              <td>
                <a href={`/leads/${lead.name}`} className="btn btn-xs btn-default" onClick={(e) => e.stopPropagation()}>
                  <i className="fa fa-external-link" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type LeadsSidebarProps = {
  leads: LeadRow[];
  selectedLead: string | null;
  setSelectedLead: (lead: string | null) => void;
  oppMap: OppMap;
  setPage: (setter: (value: number) => number) => void;
};



export function LeadsTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allLeads, setAllLeads] = useState<LeadRow[]>([]);
  const [oppMap, setOppMap] = useState<OppMap>({});
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const leadRes = await (frappe as any).call({
          method: "frappe.client.get_list",
          args: {
            doctype: "Lead",
            fields: ["name", "lead_name", "company_name", "status", "source", "mobile_no", "email_id", "lead_owner", "creation"],
            limit: 0,
            order_by: "creation desc",
          },
        });
        const leads: LeadRow[] = leadRes.message || [];

        let oppLinks: OppRow[] = [];
        try {
          const oppRes = await (frappe as any).call({
            method: "frappe.client.get_list",
            args: {
              doctype: "Opportunity",
              fields: ["name", "status", "party_name", "opportunity_amount"],
              filters: [["Opportunity", "opportunity_from", "=", "Lead"]],
              limit: 0,
            },
          });
          oppLinks = oppRes.message || [];
        } catch (e: any) {
          console.warn("ICL Leads: could not fetch Opportunities -", e?.message || e);
        }

        const map: OppMap = {};
        oppLinks.forEach((o) => {
          if (!o.party_name) return;
          if (!map[o.party_name]) map[o.party_name] = [];
          map[o.party_name].push({ opp: o.name, status: o.status || "", amount: o.opportunity_amount || 0 });
        });

        if (!cancelled) {
          setAllLeads(leads);
          setOppMap(map);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const ACTIVE_STATUSES = ["Open", "Replied", "Interested"];
  const ACTIVE_OPP_STATUSES = ["Open", "Quotation", "Converted"];

  const stats = useMemo(() => {
    const oppList = Object.values(oppMap).flat();
    const totalLeads = allLeads.length;
    const totalOpportunities = oppList.length;
    const activeLeads = allLeads.filter((l) => ACTIVE_STATUSES.includes(l.status || "")).length;
    const leadsWithActiveOpps = allLeads.filter((l) => (oppMap[l.name] || []).some((o) => ACTIVE_OPP_STATUSES.includes(o.status))).length;
    const activeLinkedOpps = oppList.filter((o) => ACTIVE_OPP_STATUSES.includes(o.status)).length;
    return { totalLeads, totalOpportunities, activeLeads, leadsWithActiveOpps, activeLinkedOpps };
  }, [allLeads, oppMap]);

  const filteredLeads = useMemo(() => {
    let rows = allLeads;
    const q = search.toLowerCase().trim();
    if (q) {
      rows = rows.filter(
        (l) =>
          (l.lead_name || "").toLowerCase().includes(q) ||
          (l.company_name || "").toLowerCase().includes(q) ||
          (l.email_id || "").toLowerCase().includes(q) ||
          (l.status || "").toLowerCase().includes(q)
      );
    }
    if (selectedLead) rows = rows.filter((l) => l.name === selectedLead);
    return rows;
  }, [allLeads, search, selectedLead]);

  const pagedLeads = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
    const p = Math.min(page, totalPages);
    const start = (p - 1) * pageSize;
    return { rows: filteredLeads.slice(start, start + pageSize), totalPages, page: p, start };
  }, [filteredLeads, page]);

  function renderBarData(getValue: (lead: LeadRow) => number) {
    const counts: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      const k = (lead.company_name || "Unspecified Client").trim() || "Unspecified Client";
      counts[k] = (counts[k] || 0) + getValue(lead);
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }

  const leadBars = renderBarData(() => 1);
  const oppBars = renderBarData((lead) => (oppMap[lead.name] || []).length);

  return (
    <div className="container-fluid p-4">
      <div className="row mb-4">
        <StatCard label="Total Leads" value={stats.totalLeads} loading={loading} colorClass="bg-blue-light" />
        <StatCard label="Total Opportunities Linked" value={stats.totalOpportunities} loading={loading} colorClass="bg-purple-light" />
        <StatCard label="Active Leads" value={stats.activeLeads} loading={loading} colorClass="bg-green-light" />
        <StatCard label="Leads with Active Opportunities" value={stats.leadsWithActiveOpps} loading={loading} colorClass="bg-yellow-light" />
        <StatCard label="Active Opportunities (Linked)" value={stats.activeLinkedOpps} loading={loading} colorClass="bg-red-light" />
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3">
        <div className="col-lg-12">
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <BarChartCard title="Top Clients by Leads" bars={leadBars} />
            </div>
            <div className="col-md-6">
              <BarChartCard title="Top Clients by Linked Opportunities" bars={oppBars} />
            </div>
          </div>

          <div className="card shadow-sm border-0">
            <div className="card-header d-flex justify-content-between align-items-center bg-white border-bottom">
              <h6 className="mb-0 font-weight-bold">All Leads</h6>
              <input
                className="form-control form-control-sm"
                placeholder="Search leads..."
                style={{ width: 220 }}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="card-body p-0">
              <LeadsTable rows={pagedLeads.rows} start={pagedLeads.start} oppMap={oppMap} />
            </div>
            {pagedLeads.totalPages > 1 && (
              <div className="card-footer bg-white border-top d-flex justify-content-between align-items-center">
                <span className="text-muted small">
                  Showing {pagedLeads.start + 1}–{Math.min(pagedLeads.start + pageSize, filteredLeads.length)} of {filteredLeads.length}
                </span>
                <div className="btn-group btn-group-sm">
                  <button className="btn btn-default btn-sm" disabled={pagedLeads.page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    ‹ Prev
                  </button>
                  <button
                    className="btn btn-default btn-sm"
                    disabled={pagedLeads.page === pagedLeads.totalPages}
                    onClick={() => setPage((p) => Math.min(pagedLeads.totalPages, p + 1))}
                  >
                    Next ›
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
