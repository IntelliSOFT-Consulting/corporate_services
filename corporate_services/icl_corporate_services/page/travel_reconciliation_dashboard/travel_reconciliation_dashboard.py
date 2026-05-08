import frappe


@frappe.whitelist()
def get_dashboard_data():
    summary = _get_summary()
    status_breakdown = _get_status_breakdown()
    monthly_trend = _get_monthly_trend()
    unreconciled_rows = _get_unreconciled_rows()

    return {
        "summary": summary,
        "status_breakdown": status_breakdown,
        "monthly_trend": monthly_trend,
        "unreconciled_rows": unreconciled_rows,
    }


def _get_summary():
    rows = frappe.db.sql(
        """
        select
            count(tr.name) as total_requests,
            sum(case when tr.custom_reconciliation_status = 'Reconciled' then 1 else 0 end) as reconciled,
            sum(case when coalesce(tr.custom_reconciliation_status, 'Pending Reconciliation') != 'Reconciled' then 1 else 0 end) as pending,
            sum(coalesce(tr.custom_actual_allocated_amount_used, 0)) as total_allocated,
            sum(coalesce(tr.custom_reconciled_total_spent, 0)) as total_spent,
            sum(coalesce(tr.custom_reconciled_total_balance, 0)) as total_balance
        from `tabTravel Request` tr
        where tr.docstatus < 2
        """,
        as_dict=True,
    )
    return rows[0] if rows else {}


def _get_status_breakdown():
    return frappe.db.sql(
        """
        select
            coalesce(tr.custom_reconciliation_status, 'Pending Reconciliation') as status,
            count(*) as count
        from `tabTravel Request` tr
        where tr.docstatus < 2
        group by coalesce(tr.custom_reconciliation_status, 'Pending Reconciliation')
        order by count desc
        """,
        as_dict=True,
    )


def _get_monthly_trend():
    return frappe.db.sql(
        """
        select
            date_format(coalesce(tr.custom_reconciliation_date, tr.modified), '%Y-%m') as month,
            sum(case when tr.custom_reconciliation_status = 'Reconciled' then 1 else 0 end) as reconciled,
            sum(case when coalesce(tr.custom_reconciliation_status, 'Pending Reconciliation') != 'Reconciled' then 1 else 0 end) as pending
        from `tabTravel Request` tr
        where tr.docstatus < 2
        group by date_format(coalesce(tr.custom_reconciliation_date, tr.modified), '%Y-%m')
        order by month desc
        limit 12
        """,
        as_dict=True,
    )[::-1]


def _get_unreconciled_rows():
    return frappe.db.sql(
        """
        select
            tr.name,
            tr.employee,
            tr.employee_name,
            tr.custom_project,
            tr.custom_travel_date,
            tr.custom_expected_support,
            tr.custom_currency,
            coalesce(tr.custom_reconciliation_status, 'Pending Reconciliation') as reconciliation_status
        from `tabTravel Request` tr
        where tr.docstatus < 2
          and coalesce(tr.custom_reconciliation_status, 'Pending Reconciliation') != 'Reconciled'
        order by tr.modified desc
        limit 200
        """,
        as_dict=True,
    )
