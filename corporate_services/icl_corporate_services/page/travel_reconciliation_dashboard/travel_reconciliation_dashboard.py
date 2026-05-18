import frappe
from frappe.utils import get_url_to_form
from corporate_services.icl_corporate_services.doctype.travel_request_reconciliation.travel_request_reconciliation import (
    _sync_travel_request_reconciliation_status,
)


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


@frappe.whitelist()
def run_one_time_reconciliation_backfill():
    frappe.only_for(("System Manager", "Finance"))

    travel_requests = frappe.get_all(
        "Travel Request",
        filters={"docstatus": ["<", 2]},
        pluck="name",
        limit_page_length=0,
    )

    processed = 0
    for travel_request_name in travel_requests:
        _sync_travel_request_reconciliation_status(travel_request_name)
        processed += 1

    summary = frappe.db.sql(
        """
        select
            sum(case when coalesce(custom_reconciliation_status, 'Pending Reconciliation') = 'Reconciled' then 1 else 0 end) as reconciled,
            sum(case when coalesce(custom_reconciliation_status, 'Pending Reconciliation') != 'Reconciled' then 1 else 0 end) as pending
        from `tabTravel Request`
        where docstatus < 2
        """,
        as_dict=True,
    )
    row = summary[0] if summary else {}

    return {
        "processed": processed,
        "reconciled": row.get("reconciled") or 0,
        "pending": row.get("pending") or 0,
    }


@frappe.whitelist()
def notify_unreconciled_user(travel_request_name):
    frappe.only_for(("System Manager", "Finance"))

    if not travel_request_name:
        frappe.throw("Travel Request is required.")

    travel_request = frappe.db.get_value(
        "Travel Request",
        travel_request_name,
        [
            "name",
            "employee",
            "employee_name",
            "docstatus",
            "custom_reconciliation_status",
        ],
        as_dict=True,
    )

    if not travel_request:
        frappe.throw(f"Travel Request {travel_request_name} was not found.")

    if travel_request.docstatus >= 2:
        frappe.throw("Cannot notify for a cancelled Travel Request.")

    reconciliation_status = (
        travel_request.custom_reconciliation_status or "Pending Reconciliation"
    )
    if reconciliation_status == "Reconciled":
        frappe.throw("This Travel Request is already reconciled.")

    employee_email = frappe.db.get_value(
        "Employee",
        travel_request.employee,
        ["company_email", "personal_email"],
        as_dict=True,
    )
    recipient = (employee_email or {}).get("company_email") or (employee_email or {}).get(
        "personal_email"
    )
    if not recipient:
        frappe.throw(
            f"No email found for employee {travel_request.employee or travel_request.employee_name}."
        )

    request_url = get_url_to_form("Travel Request", travel_request.name)
    subject = f"Reminder: Reconcile Travel Request {travel_request.name}"
    message = """
        Dear {employee_name},<br><br>
        This is a reminder to reconcile your Travel Request <b>{request_name}</b>.<br>
        Please review and complete the reconciliation process here:
        <a href="{request_url}">{request_url}</a>.<br><br>
        Kind regards,<br>
        Finance Department
    """.format(
        employee_name=travel_request.employee_name or travel_request.employee or "Colleague",
        request_name=travel_request.name,
        request_url=request_url,
    )

    frappe.sendmail(
        recipients=[recipient],
        subject=subject,
        message=message,
        header=("Travel Reconciliation Reminder", "text/html"),
    )

    return {"travel_request": travel_request.name, "recipient": recipient}


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
            tr.travel_type,
            tr.custom_project,
            tr.custom_travel_date,
            tr.custom_expected_support,
            tr.custom_currency,
            coalesce(tr.workflow_state, 'Draft') as workflow_status,
            coalesce(tr.custom_reconciliation_status, 'Pending Reconciliation') as reconciliation_status
        from `tabTravel Request` tr
        where tr.docstatus < 2
          and coalesce(tr.custom_reconciliation_status, 'Pending Reconciliation') != 'Reconciled'
        order by tr.modified desc
        limit 200
        """,
        as_dict=True,
    )
