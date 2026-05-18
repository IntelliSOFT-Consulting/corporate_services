from datetime import datetime, timedelta

import frappe
from frappe.utils import getdate, nowdate


@frappe.whitelist()
def get_dashboard_data(contract_type=None):
    week_start, week_end = _current_week_bounds()
    selected_contract_type = contract_type or _default_contract_type_from_config()

    interns = _get_active_interns(selected_contract_type)
    submitted_map = _get_submitted_map(week_start, week_end)

    submitted_rows = []
    missing_rows = []

    for emp in interns:
        report = submitted_map.get(emp["name"])
        row = {
            "employee": emp["name"],
            "employee_name": emp.get("employee_name"),
            "department": emp.get("department"),
            "supervisor": emp.get("custom_reports_to_name"),
            "contract_type": emp.get("custom_contract_type"),
            "report_name": report["name"] if report else None,
            "submitted_on": report["creation"] if report else None,
        }
        if report:
            submitted_rows.append(row)
        else:
            missing_rows.append(row)

    return {
        "week_start": str(week_start),
        "week_end": str(week_end),
        "contract_type": selected_contract_type,
        "summary": {
            "total_active_interns": len(interns),
            "submitted_count": len(submitted_rows),
            "missing_count": len(missing_rows),
        },
        "submitted_rows": submitted_rows,
        "missing_rows": missing_rows,
    }


def _current_week_bounds():
    today = getdate(nowdate())
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    return week_start, week_end


def _default_contract_type_from_config():
    return frappe.db.get_single_value("HR Config", "weekly_progress_contract_type")


def _get_active_interns(contract_type=None):
    filters = {"status": "Active"}
    if contract_type:
        filters["custom_contract_type"] = contract_type
    return frappe.get_all(
        "Employee",
        filters=filters,
        fields=[
            "name",
            "employee_name",
            "department",
            "custom_reports_to_name",
            "custom_contract_type",
            "company_email",
            "personal_email",
        ],
        limit_page_length=1000,
        order_by="employee_name asc",
    )


def _get_submitted_map(week_start, week_end):
    rows = frappe.get_all(
        "Weekly Progress Report",
        filters={
            "creation": ["between", [f"{week_start} 00:00:00", f"{week_end} 23:59:59"]],
            "docstatus": ["!=", 2],
        },
        fields=["name", "intern", "creation"],
        order_by="creation desc",
        limit_page_length=10000,
    )
    out = {}
    for row in rows:
        if row["intern"] and row["intern"] not in out:
            out[row["intern"]] = row
    return out


def is_weekly_reminder_due(config):
    if not getattr(config, "enable_weekly_progress_reminder", 0):
        return False

    weekday = getattr(config, "weekly_progress_reminder_weekday", None)
    reminder_time = getattr(config, "weekly_progress_reminder_time", None)
    if not weekday or not reminder_time:
        return False

    now_dt = datetime.now()
    if now_dt.strftime("%A") != weekday:
        return False

    reminder_dt = datetime.combine(now_dt.date(), reminder_time)
    if now_dt < reminder_dt:
        return False

    last_sent = getattr(config, "weekly_progress_last_reminder_sent_on", None)
    if last_sent and str(last_sent) == str(now_dt.date()):
        return False

    return True
