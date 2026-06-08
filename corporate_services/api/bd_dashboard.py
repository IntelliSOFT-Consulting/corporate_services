import frappe
from frappe.utils import add_months, flt, get_first_day, get_last_day, getdate, nowdate

OPEN_LEAD_STATUSES = ["Lead", "Open", "Replied", "Interested", "Opportunity", "Quotation"]
OPEN_OPP_STATUSES = ["Open", "Quotation", "Replied"]


def _count(doctype, filters=None):
    """Permission-aware count via get_list so role permissions are respected."""
    rows = frappe.get_list(
        doctype,
        filters=filters or {},
        fields=["count(name) as count"],
        ignore_permissions=False,
    )
    return rows[0]["count"] if rows else 0


def _sum(doctype, field, filters=None):
    rows = frappe.get_list(
        doctype,
        filters=filters or {},
        fields=[f"sum({field}) as total"],
        ignore_permissions=False,
    )
    return flt(rows[0]["total"]) if rows and rows[0]["total"] else 0.0


def _group(doctype, field, filters=None, limit=10):
    return frappe.get_list(
        doctype,
        filters=filters or {},
        fields=[f"{field} as label", "count(name) as count"],
        group_by=field,
        order_by="count desc",
        limit=limit,
        ignore_permissions=False,
    )


@frappe.whitelist()
def get_bd_dashboard():
    """Aggregated KPIs and chart data for the Business Development dashboard,
    derived from Lead and Opportunity. Permission-aware throughout."""
    today = getdate(nowdate())
    month_start = get_first_day(today)

    # --- Lead KPIs ---
    total_leads = _count("Lead")
    leads_this_month = _count("Lead", {"creation": [">=", month_start]})
    open_leads = _count("Lead", {"status": ["in", OPEN_LEAD_STATUSES]})
    converted_leads = _count("Lead", {"status": "Converted"})
    lead_conversion_rate = round((converted_leads / total_leads) * 100, 1) if total_leads else 0.0

    # --- Opportunity KPIs ---
    total_opps = _count("Opportunity")
    open_opps = _count("Opportunity", {"status": ["in", OPEN_OPP_STATUSES]})
    won_opps = _count("Opportunity", {"status": "Converted"})
    lost_opps = _count("Opportunity", {"status": "Lost"})
    pipeline_value = _sum("Opportunity", "opportunity_amount", {"status": ["in", OPEN_OPP_STATUSES]})
    won_value = _sum("Opportunity", "opportunity_amount", {"status": "Converted"})
    decided = won_opps + lost_opps
    win_rate = round((won_opps / decided) * 100, 1) if decided else 0.0
    avg_deal_size = round(pipeline_value / open_opps, 0) if open_opps else 0.0

    # --- Charts ---
    leads_by_status = _group("Lead", "status")
    leads_by_source = _group("Lead", "source")
    opps_by_stage = _group("Opportunity", "sales_stage")
    opps_by_state = _group("Opportunity", "workflow_state")

    pipeline_by_stage = frappe.get_list(
        "Opportunity",
        filters={"status": ["in", OPEN_OPP_STATUSES]},
        fields=["sales_stage as label", "sum(opportunity_amount) as total"],
        group_by="sales_stage",
        order_by="total desc",
        ignore_permissions=False,
    )

    # --- Monthly trend (last 6 months) ---
    trend = []
    for i in range(5, -1, -1):
        m_start = get_first_day(add_months(today, -i))
        m_end = get_last_day(m_start)
        trend.append({
            "month": m_start.strftime("%b %Y"),
            "leads": _count("Lead", {"creation": ["between", [m_start, m_end]]}),
            "opportunities": _count("Opportunity", {"transaction_date": ["between", [m_start, m_end]]}),
        })

    # --- Top open opportunities by value ---
    top_opportunities = frappe.get_list(
        "Opportunity",
        filters={"status": ["in", OPEN_OPP_STATUSES]},
        fields=["name", "title", "customer_name", "opportunity_amount", "currency",
                "sales_stage", "status", "expected_closing"],
        order_by="opportunity_amount desc",
        limit=5,
        ignore_permissions=False,
    )

    default_currency = frappe.defaults.get_global_default("currency") or "KES"

    return {
        "kpis": {
            "total_leads": total_leads,
            "leads_this_month": leads_this_month,
            "open_leads": open_leads,
            "converted_leads": converted_leads,
            "lead_conversion_rate": lead_conversion_rate,
            "total_opportunities": total_opps,
            "open_opportunities": open_opps,
            "won_opportunities": won_opps,
            "lost_opportunities": lost_opps,
            "pipeline_value": pipeline_value,
            "won_value": won_value,
            "win_rate": win_rate,
            "avg_deal_size": avg_deal_size,
        },
        "leads_by_status": leads_by_status,
        "leads_by_source": leads_by_source,
        "opps_by_stage": opps_by_stage,
        "opps_by_state": opps_by_state,
        "pipeline_by_stage": pipeline_by_stage,
        "monthly_trend": trend,
        "top_opportunities": top_opportunities,
        "currency": default_currency,
    }
