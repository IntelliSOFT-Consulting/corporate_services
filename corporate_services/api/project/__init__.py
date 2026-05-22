import frappe
from frappe import _


def _as_int(value, default):
    try:
        return int(value)
    except Exception:
        return default


def _has_field(doctype, fieldname):
    try:
        return frappe.get_meta(doctype).has_field(fieldname)
    except Exception:
        return False


@frappe.whitelist()
def get_projects(page_length=20, page=1, search=None, status=None):
    page_length = max(_as_int(page_length, 20), 1)
    page = max(_as_int(page, 1), 1)
    start = (page - 1) * page_length
    filters = {"status": ["!=", "Cancelled"]}
    if status:
        filters["status"] = status

    or_filters = None
    if search:
        term = f"%{search}%"
        or_filters = [
            ["Project", "name", "like", term],
            ["Project", "project_name", "like", term],
            ["Project", "customer", "like", term],
            ["Project", "custom_bid", "like", term],
        ]

    fields = [
        "name",
        "project_name",
        "status",
        "percent_complete",
        "expected_start_date",
        "expected_end_date",
        "customer",
        "department",
        "company",
        "priority",
        "estimated_costing",
        "custom_bid",
    ]

    projects = frappe.get_all(
        "Project",
        filters=filters,
        or_filters=or_filters,
        fields=fields,
        order_by="modified desc",
        start=start,
        page_length=page_length,
    )

    total = len(
        frappe.get_all(
            "Project",
            filters=filters,
            or_filters=or_filters,
            pluck="name",
        )
    )

    for p in projects:
        p["timesheet_count"] = 0
        p["total_timesheet_hours"] = 0
        p["travel_request_count"] = 0

    return {
        "projects": projects,
        "total": total,
        "charts": {
            "timesheet_hours_by_project": [],
            "travel_requests_by_project": [],
        },
    }


@frappe.whitelist()
def get_project(name):
    if not name:
        frappe.throw(_("Project name is required."))

    doc = frappe.get_doc("Project", name)

    project = {
        "name": doc.name,
        "project_name": doc.project_name,
        "status": doc.status,
        "percent_complete": doc.percent_complete,
        "expected_start_date": doc.expected_start_date,
        "expected_end_date": doc.expected_end_date,
        "actual_start_date": doc.actual_start_date,
        "actual_end_date": doc.actual_end_date,
        "actual_time": doc.actual_time,
        "customer": doc.customer,
        "department": doc.department,
        "company": doc.company,
        "priority": doc.priority,
        "estimated_costing": doc.estimated_costing,
        "total_costing_amount": doc.total_costing_amount,
        "total_purchase_cost": doc.total_purchase_cost,
        "gross_margin": doc.gross_margin,
        "per_gross_margin": doc.per_gross_margin,
        "custom_bid": doc.custom_bid,
        "notes": doc.notes,
        "cost_center": doc.cost_center,
        "creation": doc.creation,
        "modified": doc.modified,
        "owner": doc.owner,
    }

    linked_users = []
    for row in (doc.get("users") or []):
        linked_users.append(
            {
                "user": row.get("user"),
                "allocated_loes": row.get("custom_allocated_loes"),
                "project_status": row.get("custom_project_status"),
            }
        )

    timesheets = []
    travel_requests = []
    ts_breakdown = []
    tr_breakdown = []

    if _has_field("Timesheet", "project"):
        timesheets = frappe.get_all(
            "Timesheet",
            filters={"project": name, "docstatus": ["<", 2]},
            fields=[
                "name",
                "employee",
                "employee_name",
                "status",
                "total_hours",
                "start_date",
                "end_date",
                "modified",
            ],
            order_by="modified desc",
            limit_page_length=50,
        )
        grouped = {}
        for row in timesheets:
            key = row.get("status") or "Not Set"
            grouped[key] = grouped.get(key, 0) + 1
        ts_breakdown = [{"label": k, "count": v} for k, v in grouped.items()]

    if _has_field("Travel Request", "project"):
        travel_requests = frappe.get_all(
            "Travel Request",
            filters={"project": name, "docstatus": ["<", 2]},
            fields=[
                "name",
                "employee",
                "employee_name",
                "workflow_state",
                "custom_travel_date",
                "custom_travel_place",
                "modified",
            ],
            order_by="modified desc",
            limit_page_length=50,
        )
        grouped = {}
        for row in travel_requests:
            key = row.get("workflow_state") or "Not Set"
            grouped[key] = grouped.get(key, 0) + 1
        tr_breakdown = [{"label": k, "count": v} for k, v in grouped.items()]

    project["linked_users"] = linked_users
    project["timesheets"] = timesheets
    project["travel_requests"] = travel_requests
    project["charts"] = {
        "timesheet_status_breakdown": ts_breakdown,
        "travel_request_workflow_breakdown": tr_breakdown,
    }

    return project
