# Copyright (c) 2026, ICL Corporate Services and contributors
# For license information, please see license.txt

import frappe
from frappe import _

MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

STATUS_COLORS = {
    "Open": "#f59e0b",
    "Approved": "#16a34a",
    "Rejected": "#dc2626",
    "Cancelled": "#64748b",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def format_month_year(value):
    """Convert 'MM-YYYY' to 'Month YYYY' for display."""
    if not value or "-" not in value:
        return value or ""
    try:
        month_str, year_str = value.split("-", 1)
        month = int(month_str)
        if 1 <= month <= 12:
            return f"{MONTH_NAMES[month]} {year_str}"
    except (ValueError, IndexError):
        pass
    return value


def parse_month_year_filter(value):
    """Accept 'Month YYYY' or 'MM-YYYY'; always return 'MM-YYYY' for SQL."""
    if not value:
        return value
    # Already MM-YYYY
    if "-" in value:
        parts = value.split("-", 1)
        try:
            if 1 <= int(parts[0]) <= 12:
                return value
        except ValueError:
            pass
    # Parse "Month YYYY"
    for i, name in enumerate(MONTH_NAMES[1:], 1):
        if value.startswith(name + " "):
            year = value[len(name) + 1:].strip()
            if year.isdigit() and len(year) == 4:
                return f"{i:02d}-{year}"
    return value


def get_current_employee(user=None):
    """Return the active Employee linked to the given user."""
    user = user or frappe.session.user
    return frappe.db.get_value(
        "Employee",
        {"user_id": user, "status": "Active"},
        ["name", "employee_name", "department"],
        as_dict=True,
    )


def get_role_context():
    """
    Determine the effective viewing role for the logged-in user.

    Returns a dict:
      role      → "hr_finance" | "supervisor" | "employee"
      employee  → Employee dict (or None for hr_finance)
      reportees → list of Employee dicts who report to this user
    """
    user = frappe.session.user
    roles = frappe.get_roles(user)

    if any(r in roles for r in ["System Manager", "HR Manager", "Finance", "HR User"]):
        return {"role": "hr_finance", "employee": None, "reportees": []}

    employee = get_current_employee(user)
    if not employee:
        return {"role": "employee", "employee": None, "reportees": []}

    reportees = frappe.get_all(
        "Employee",
        filters={"reports_to": employee["name"], "status": "Active"},
        fields=["name", "employee_name", "company_email", "personal_email",
                "department", "designation"],
    )
    if reportees:
        return {"role": "supervisor", "employee": employee, "reportees": reportees}

    return {"role": "employee", "employee": employee, "reportees": []}


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def execute(filters=None):
    filters = filters or {}

    # Normalise the month_year filter value (accept both display and DB format)
    if filters.get("month_year"):
        filters["month_year"] = parse_month_year_filter(filters["month_year"])

    ctx = get_role_context()
    columns = get_columns(ctx)
    data = get_data(filters, ctx)
    message = get_summary_message(data, filters, ctx)
    chart = get_chart_data(data)

    return columns, data, message, chart


# ---------------------------------------------------------------------------
# Columns
# ---------------------------------------------------------------------------

def get_columns(ctx):
    cols = [
        {
            "fieldname": "name",
            "label": _("Timesheet ID"),
            "fieldtype": "Link",
            "options": "Timesheet Submission",
            "width": 160,
        },
        {
            "fieldname": "employee",
            "label": _("Employee ID"),
            "fieldtype": "Link",
            "options": "Employee",
            "width": 120,
        },
        {
            "fieldname": "employee_name",
            "label": _("Employee Name"),
            "fieldtype": "Data",
            "width": 180,
        },
        {
            "fieldname": "department",
            "label": _("Department"),
            "fieldtype": "Link",
            "options": "Department",
            "width": 150,
        },
        {
            "fieldname": "designation",
            "label": _("Designation"),
            "fieldtype": "Link",
            "options": "Designation",
            "width": 150,
        },
        {
            "fieldname": "month_year_display",
            "label": _("Month-Year"),
            "fieldtype": "Data",
            "width": 140,
        },
        {
            "fieldname": "total_working_hours",
            "label": _("Total Hours"),
            "fieldtype": "Float",
            "width": 110,
            "precision": 2,
        },
        {
            "fieldname": "project_count",
            "label": _("No. of Projects"),
            "fieldtype": "Int",
            "width": 120,
        },
        {
            "fieldname": "status",
            "label": _("Status"),
            "fieldtype": "Data",
            "width": 130,
        },
        {
            "fieldname": "submission_date",
            "label": _("Submitted On"),
            "fieldtype": "Date",
            "width": 120,
        },
        {
            "fieldname": "timesheet_imported",
            "label": _("Imported"),
            "fieldtype": "Check",
            "width": 80,
        },
    ]

    # HR / Finance see workflow state and submitter
    if ctx["role"] == "hr_finance":
        cols.append({
            "fieldname": "workflow_state",
            "label": _("Workflow State"),
            "fieldtype": "Data",
            "width": 210,
        })
        cols.append({
            "fieldname": "owner",
            "label": _("Submitted By"),
            "fieldtype": "Data",
            "width": 150,
        })

    return cols


# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------

def get_data(filters, ctx):
    conditions, params = build_conditions(filters, ctx)

    rows = frappe.db.sql(
        f"""
        SELECT
            ts.name,
            ts.employee,
            ts.employee_name,
            emp.department,
            emp.designation,
            ts.month_year,
            ts.total_working_hours,
            ts.status,
            ts.workflow_state,
            ts.timesheet_imported,
            ts.creation AS submission_date,
            ts.owner,
            (
                SELECT COUNT(*)
                FROM `tabTimesheet Submission List`
                WHERE parent = ts.name
            ) AS project_count
        FROM `tabTimesheet Submission` ts
        LEFT JOIN `tabEmployee` emp ON ts.employee = emp.name
        WHERE ts.docstatus != 2
        {conditions}
        ORDER BY ts.creation DESC
        """,
        params,
        as_dict=True,
    )

    for row in rows:
        row["month_year_display"] = format_month_year(row.get("month_year"))

    # Append "Not Submitted" rows when a specific month is selected
    if filters.get("month_year") and ctx["role"] != "employee":
        rows.extend(get_not_submitted_rows(filters, ctx, rows))

    return rows


def build_conditions(filters, ctx):
    """
    Return (sql_conditions_string, params_list) using positional %s placeholders.
    """
    conditions = []
    params = []

    # ── Role-based scope ────────────────────────────────────────────────────
    if ctx["role"] == "employee":
        if ctx.get("employee"):
            conditions.append("ts.employee = %s")
            params.append(ctx["employee"]["name"])
        else:
            conditions.append("1 = 0")   # no linked employee → show nothing

    elif ctx["role"] == "supervisor":
        allowed = [ctx["employee"]["name"]] + [r["name"] for r in ctx["reportees"]]
        placeholders = ", ".join(["%s"] * len(allowed))
        conditions.append(f"ts.employee IN ({placeholders})")
        params.extend(allowed)

    # ── Explicit filter fields ───────────────────────────────────────────────
    if filters.get("employee"):
        conditions.append("ts.employee = %s")
        params.append(filters["employee"])

    if filters.get("month_year"):
        conditions.append("ts.month_year = %s")
        params.append(filters["month_year"])

    if filters.get("status"):
        conditions.append("ts.status = %s")
        params.append(filters["status"])

    if filters.get("department"):
        conditions.append("emp.department = %s")
        params.append(filters["department"])

    if filters.get("designation"):
        conditions.append("emp.designation = %s")
        params.append(filters["designation"])

    # Workflow state filter only meaningful for hr_finance
    if filters.get("workflow_state") and ctx["role"] == "hr_finance":
        conditions.append("ts.workflow_state = %s")
        params.append(filters["workflow_state"])

    sql = " AND " + " AND ".join(conditions) if conditions else ""
    return sql, params


def get_not_submitted_rows(filters, ctx, submitted_rows):
    """
    Return placeholder rows for active employees who have no submission for
    the filtered month-year.  Supervisors see only their own reportees;
    HR/Finance see all active employees (optionally scoped by department).
    """
    submitted_ids = {r["employee"] for r in submitted_rows if r.get("employee")}
    month_year = filters["month_year"]

    if ctx["role"] == "supervisor":
        candidates = ctx["reportees"]
    else:
        f = {"status": "Active"}
        if filters.get("department"):
            f["department"] = filters["department"]
        candidates = frappe.get_all(
            "Employee",
            filters=f,
            fields=["name", "employee_name", "department", "designation"],
        )

    result = []
    for emp in candidates:
        if emp["name"] not in submitted_ids:
            result.append({
                "name": "",
                "employee": emp["name"],
                "employee_name": emp.get("employee_name", ""),
                "department": emp.get("department", ""),
                "designation": emp.get("designation", ""),
                "month_year": month_year,
                "month_year_display": format_month_year(month_year),
                "total_working_hours": None,
                "project_count": None,
                "status": "Not Submitted",
                "workflow_state": "",
                "submission_date": None,
                "timesheet_imported": 0,
                "owner": "",
            })
    return result


# ---------------------------------------------------------------------------
# Message (shown above the table)
# ---------------------------------------------------------------------------

def get_summary_message(data, filters, ctx):
    """Return an HTML alert listing employees who have not submitted."""
    if not filters.get("month_year") or ctx["role"] == "employee":
        return None

    not_submitted = [r for r in data if r.get("status") == "Not Submitted"]
    if not not_submitted:
        return None

    month_display = format_month_year(filters["month_year"])
    count = len(not_submitted)
    names = ", ".join(r["employee_name"] for r in not_submitted[:10])
    if count > 10:
        names += f" … and {count - 10} more"

    return f"""
        <div class="alert alert-warning"
             style="margin:0 0 14px; padding:10px 16px; border-radius:5px; font-size:13px;">
            <strong>{count} employee(s) have not submitted their timesheet for
            {month_display}:</strong><br>
            {names}<br>
            <small style="color:#6c757d;">
                Use the <strong>Notify Non-Submitters</strong> button to send them a reminder.
            </small>
        </div>
    """


# ---------------------------------------------------------------------------
# Chart
# ---------------------------------------------------------------------------

def get_chart_data(data):
    """Pie chart of submission status for submitted records only."""
    submitted = [r for r in data if r.get("status") and r["status"] != "Not Submitted"]
    if not submitted:
        return None

    counts = {}
    for row in submitted:
        s = row["status"]
        counts[s] = counts.get(s, 0) + 1

    labels = list(counts.keys())
    values = list(counts.values())
    colors = [STATUS_COLORS.get(s, "#7cd6fd") for s in labels]

    return {
        "data": {
            "labels": labels,
            "datasets": [{"name": "Submissions", "values": values}],
        },
        "type": "pie",
        "height": 280,
        "colors": colors,
    }
