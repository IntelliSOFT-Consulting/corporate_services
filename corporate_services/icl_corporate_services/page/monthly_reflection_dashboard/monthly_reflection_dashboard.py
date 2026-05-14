from datetime import datetime

import frappe


@frappe.whitelist()
def get_dashboard_data(review_period=None):
    selected_review_period = (review_period or _default_review_period()).strip()

    employees = _get_active_employees()
    submitted_map = _get_submitted_map(selected_review_period)

    submitted_rows = []
    missing_rows = []

    for emp in employees:
        reflection = submitted_map.get(emp["name"])
        row = {
            "employee": emp["name"],
            "employee_name": emp.get("employee_name"),
            "department": emp.get("department"),
            "designation": emp.get("designation"),
            "supervisor": emp.get("custom_reports_to_name"),
            "review_period": selected_review_period,
            "reflection_name": reflection["name"] if reflection else None,
            "submitted_on": str(reflection["creation"]) if reflection else None,
            "workflow_state": reflection.get("workflow_state") if reflection else None,
        }
        if reflection:
            submitted_rows.append(row)
        else:
            missing_rows.append(row)

    return {
        "review_period": selected_review_period,
        "summary": {
            "total_active_staff": len(employees),
            "submitted_count": len(submitted_rows),
            "missing_count": len(missing_rows),
        },
        "submitted_rows": submitted_rows,
        "missing_rows": missing_rows,
    }


@frappe.whitelist()
def get_review_period_options(year=None):
    target_year = int(year) if year else datetime.now().year
    months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ]
    return [f"{month} {target_year}" for month in months]


def _default_review_period():
    return datetime.now().strftime("%B %Y")


def _get_active_employees():
    return frappe.get_all(
        "Employee",
        filters={"status": "Active"},
        fields=[
            "name",
            "employee_name",
            "department",
            "designation",
            "custom_reports_to_name",
        ],
        limit_page_length=1000,
        order_by="employee_name asc",
    )


def _get_submitted_map(review_period):
    rows = frappe.get_all(
        "Monthly Reflection",
        filters={
            "review_period": review_period,
            "docstatus": ["!=", 2],
        },
        fields=["name", "employee", "creation", "workflow_state"],
        order_by="creation desc",
        limit_page_length=10000,
    )

    out = {}
    for row in rows:
        employee = row.get("employee")
        if employee and employee not in out:
            out[employee] = row
    return out
