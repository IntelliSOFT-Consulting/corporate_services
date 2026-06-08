import React, { useEffect, useMemo, useState } from "react";

type Kpis = {
  total_leads: number;
  leads_this_month: number;
  open_leads: number;
  converted_leads: number;
  lead_conversion_rate: number;
  total_opportunities: number;
  open_opportunities: number;
  won_opportunities: number;
  lost_opportunities: number;
  pipeline_value: number;
  won_value: number;
  win_rate: number;
  avg_deal_size: number;
};

type Group = { label?: string; count: number };
type PipelineRow = { label?: string; total: number };
type TrendRow = { month: string; leads: number; opportunities: number };
type TopOpp = {
  name: string;
  title?: string;
  customer_name?: string;
  opportunity_amount?: number;
  currency?: string;
  sales_stage?: string;
  status?: string;
  expected_closing?: string;
};

type DashboardData = {
  kpis: Kpis;
  leads_by_status: Group[];
  leads_by_source: Group[];
  opps_by_stage: Group[];
  opps_by_state: Group[];
  pipeline_by_stage: PipelineRow[];
  monthly_trend: TrendRow[];
  top_opportunities: TopOpp[];
  currency: string;
};

function fmtMoney(value: number, currency: string) {
  return `${currency} ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function StatCard({
  label,
  value,
  sub,
  colorClass,
  loading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  colorClass: string;
  loading: boolean;
}) {
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
              {loading ? <span className="skeleton-box" style={{ width: 50, height: 28 }} /> : value}
            </div>
            {sub && <div className="text-muted small mt-1">{sub}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function BarChartCard({ title, bars }: { title: string; bars: Array<[string, number]> }) {
  const max = Math.max(...bars.map((x) => x[1]), 1);
  return (
    <div className="card shadow-sm border-0 h-100">
      <div className="card-header bg-white border-bottom">
        <h6 className="mb-0 font-weight-bold">{title}</h6>
      </div>
      <div className="card-body">
        {!bars.length && <div className="icl-chart-empty">No data to display.</div>}
        {bars.map(([name, value]) => {
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

function TrendCard({ rows }: { rows: TrendRow[] }) {
  const max = Math.max(...rows.flatMap((r) => [r.leads, r.opportunities]), 1);
  return (
    <div className="card shadow-sm border-0 h-100">
      <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center">
        <h6 className="mb-0 font-weight-bold">Leads vs Opportunities (6 months)</h6>
        <div className="small text-muted">
          <span className="me-3"><span className="icl-legend-dot" style={{ background: "#5e64ff" }} /> Leads</span>
          <span><span className="icl-legend-dot" style={{ background: "#28a745" }} /> Opportunities</span>
        </div>
      </div>
      <div className="card-body">
        <div className="d-flex align-items-end justify-content-between" style={{ height: 180, gap: 12 }}>
          {rows.map((r) => (
            <div key={r.month} className="d-flex flex-column align-items-center" style={{ flex: 1 }}>
              <div className="d-flex align-items-end" style={{ height: 150, gap: 4 }}>
                <div
                  title={`Leads: ${r.leads}`}
                  style={{ width: 14, height: `${(r.leads / max) * 100}%`, minHeight: 2, background: "#5e64ff", borderRadius: 3 }}
                />
                <div
                  title={`Opportunities: ${r.opportunities}`}
                  style={{ width: 14, height: `${(r.opportunities / max) * 100}%`, minHeight: 2, background: "#28a745", borderRadius: 3 }}
                />
              </div>
              <div className="text-muted mt-2" style={{ fontSize: 11 }}>{r.month}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardTab() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await (frappe as any).call({
          method: "corporate_services.api.bd_dashboard.get_bd_dashboard",
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
  }, []);

  const k = data?.kpis;
  const cur = data?.currency || "KES";

  const toBars = (rows?: Array<{ label?: string; count: number }>): Array<[string, number]> =>
    (rows || []).map((r) => [r.label || "Not Set", r.count]);
  const toMoneyBars = (rows?: PipelineRow[]): Array<[string, number]> =>
    (rows || []).map((r) => [r.label || "Not Set", Math.round(r.total || 0)]);

  const leadStatusBars = useMemo(() => toBars(data?.leads_by_status), [data]);
  const leadSourceBars = useMemo(() => toBars(data?.leads_by_source), [data]);
  const oppStageBars = useMemo(() => toBars(data?.opps_by_stage), [data]);
  const oppStateBars = useMemo(() => toBars(data?.opps_by_state), [data]);
  const pipelineBars = useMemo(() => toMoneyBars(data?.pipeline_by_stage), [data]);

  return (
    <div className="container-fluid p-4">
      {error && <div className="alert alert-danger">{error}</div>}

      <h6 className="text-uppercase text-muted mb-3" style={{ letterSpacing: 0.5 }}>Leads</h6>
      <div className="row mb-2">
        <StatCard label="Total Leads" value={k ? k.total_leads.toLocaleString() : 0} colorClass="bg-blue-light" loading={loading} />
        <StatCard label="New Leads (This Month)" value={k ? k.leads_this_month.toLocaleString() : 0} colorClass="bg-cyan-light" loading={loading} />
        <StatCard label="Open Leads" value={k ? k.open_leads.toLocaleString() : 0} colorClass="bg-green-light" loading={loading} />
        <StatCard label="Converted Leads" value={k ? k.converted_leads.toLocaleString() : 0} colorClass="bg-purple-light" loading={loading} />
        <StatCard label="Conversion Rate" value={k ? `${k.lead_conversion_rate}%` : "0%"} colorClass="bg-yellow-light" loading={loading} />
      </div>

      <h6 className="text-uppercase text-muted mb-3 mt-2" style={{ letterSpacing: 0.5 }}>Opportunities</h6>
      <div className="row mb-2">
        <StatCard label="Total Opportunities" value={k ? k.total_opportunities.toLocaleString() : 0} colorClass="bg-blue-light" loading={loading} />
        <StatCard label="Open Pipeline" value={k ? k.open_opportunities.toLocaleString() : 0} sub={k ? fmtMoney(k.pipeline_value, cur) : ""} colorClass="bg-orange-light" loading={loading} />
        <StatCard label="Won" value={k ? k.won_opportunities.toLocaleString() : 0} sub={k ? fmtMoney(k.won_value, cur) : ""} colorClass="bg-green-light" loading={loading} />
        <StatCard label="Win Rate" value={k ? `${k.win_rate}%` : "0%"} sub={k ? `${k.lost_opportunities} lost` : ""} colorClass="bg-red-light" loading={loading} />
        <StatCard label="Avg Deal Size" value={k ? fmtMoney(k.avg_deal_size, cur) : fmtMoney(0, cur)} colorClass="bg-purple-light" loading={loading} />
      </div>

      <div className="row g-3 mb-3 mt-1">
        <div className="col-lg-8">
          <TrendCard rows={data?.monthly_trend || []} />
        </div>
        <div className="col-lg-4">
          <BarChartCard title="Pipeline Value by Stage" bars={pipelineBars} />
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-6"><BarChartCard title="Leads by Status" bars={leadStatusBars} /></div>
        <div className="col-md-6"><BarChartCard title="Leads by Source" bars={leadSourceBars} /></div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-6"><BarChartCard title="Opportunities by Sales Stage" bars={oppStageBars} /></div>
        <div className="col-md-6"><BarChartCard title="Opportunities by Workflow State" bars={oppStateBars} /></div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header bg-white border-bottom">
          <h6 className="mb-0 font-weight-bold">Top Open Opportunities</h6>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="thead-light">
                <tr>
                  <th>Opportunity</th>
                  <th>Customer</th>
                  <th>Stage</th>
                  <th>Status</th>
                  <th className="text-end">Amount</th>
                  <th>Expected Closing</th>
                </tr>
              </thead>
              <tbody>
                {!loading && !(data?.top_opportunities || []).length && (
                  <tr><td colSpan={6} className="text-center py-4 text-muted">No open opportunities.</td></tr>
                )}
                {(data?.top_opportunities || []).map((o) => (
                  <tr key={o.name} onClick={() => (frappe as any).set_route("opportunity")} style={{ cursor: "pointer" }}>
                    <td className="font-weight-semibold">{o.title || o.name}</td>
                    <td>{o.customer_name || "-"}</td>
                    <td>{o.sales_stage || "-"}</td>
                    <td><span className="icl-badge default">{o.status || "-"}</span></td>
                    <td className="text-end">{fmtMoney(o.opportunity_amount || 0, o.currency || cur)}</td>
                    <td className="text-muted">{o.expected_closing ? frappe.datetime.str_to_user(o.expected_closing) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
