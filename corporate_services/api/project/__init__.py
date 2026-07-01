import frappe
from frappe import _
import re
from frappe.utils import add_to_date, get_first_day, get_last_day, getdate

from corporate_services.api.project.lifecycle_toolkit import get_project_lifecycle_rows, get_toolkit_items


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

    visible_filters = _get_project_visibility_filters()
    if visible_filters:
        filters.update(visible_filters)

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
        "project_type",
        "owner",
    ]

    all_visible_projects = frappe.get_all(
        "Project",
        filters=filters,
        or_filters=or_filters,
        fields=fields,
        order_by="modified desc",
    )

    total = len(all_visible_projects)
    paged_projects = all_visible_projects[start : start + page_length]
    names = [p["name"] for p in all_visible_projects]
    next_milestones = _get_next_milestones(names)
    risk_projects = _get_risk_project_set(names)
    today = getdate()

    green_count = 0
    amber_count = 0
    red_count = 0

    for p in all_visible_projects:
        status_tone = _derive_project_tone(p.get("status"), p.get("name"), risk_projects)
        if status_tone == "green":
            green_count += 1
        elif status_tone == "red":
            red_count += 1
        else:
            amber_count += 1

        next_milestone = next_milestones.get(p.get("name"))
        end_date = getdate(p.get("expected_end_date")) if p.get("expected_end_date") else None
        days_to_contract_end = (end_date - today).days if end_date else None

        p["status_tone"] = status_tone
        p["status_tone_label"] = status_tone.title()
        p["lifecycle_phase"] = p.get("project_type") or "-"
        p["next_milestone_name"] = (next_milestone or {}).get("subject")
        p["next_milestone_due_date"] = (next_milestone or {}).get("exp_end_date")
        p["days_to_contract_end"] = days_to_contract_end
        p["timesheet_count"] = 0
        p["total_timesheet_hours"] = 0
        p["travel_request_count"] = 0

    page_names = {p["name"] for p in paged_projects}
    this_week = _get_this_week_glance(filters)

    return {
        "projects": [p for p in all_visible_projects if p["name"] in page_names],
        "total": total,
        "status_counter": {
            "green": green_count,
            "amber": amber_count,
            "red": red_count,
        },
        "this_week": this_week,
        "charts": {
            "timesheet_hours_by_project": [],
            "travel_requests_by_project": [],
        },
    }


@frappe.whitelist()
def get_project_lifecycle_items(project=None, docname=None):
    return get_project_lifecycle_rows(project=project, docname=docname)


def _get_project_visibility_filters():
    user = frappe.session.user
    if user == "Administrator":
        return {}

    roles = set(frappe.get_roles(user))
    if "SMT" in roles or "System Manager" in roles:
        return {}

    meta = frappe.get_meta("Project")
    for fieldname in ["project_manager", "custom_project_manager", "project_lead", "custom_project_lead"]:
        if meta.has_field(fieldname):
            return {fieldname: user}

    return {"owner": user}


def _get_next_milestones(project_names):
    if not project_names:
        return {}
    if not (_has_field("Task", "project") and _has_field("Task", "exp_end_date")):
        return {}

    tasks = frappe.get_all(
        "Task",
        filters={
            "project": ["in", project_names],
            "exp_end_date": [">=", getdate()],
            "status": ["not in", ["Completed", "Cancelled"]],
            "docstatus": ["<", 2],
        },
        fields=["name", "project", "subject", "exp_end_date", "status"],
        order_by="exp_end_date asc",
        limit_page_length=2000,
    )

    out = {}
    for task in tasks:
        project = task.get("project")
        if project and project not in out:
            out[project] = task
    return out


def _get_risk_project_set(project_names):
    if not project_names:
        return set()

    risk_projects = set()

    if _has_field("Issue", "project") and _has_field("Issue", "status"):
        rows = frappe.get_all(
            "Issue",
            filters={
                "project": ["in", project_names],
                "status": ["not in", ["Closed", "Resolved", "Cancelled"]],
                "docstatus": ["<", 2],
            },
            fields=["project"],
            limit_page_length=5000,
        )
        risk_projects.update({row.get("project") for row in rows if row.get("project")})

    if _has_field("Travel Request", "project") and _has_field("Travel Request", "workflow_state"):
        # Any non-terminal workflow state is treated as operational risk for project health.
        tr_rows = frappe.get_all(
            "Travel Request",
            filters={
                "project": ["in", project_names],
                "workflow_state": ["not in", ["Approved", "Completed", "Cancelled", "Rejected"]],
                "docstatus": ["<", 2],
            },
            fields=["project"],
            limit_page_length=5000,
        )
        risk_projects.update({row.get("project") for row in tr_rows if row.get("project")})

    return risk_projects


def _derive_project_tone(project_status, project_name, risk_projects):
    normalized = (project_status or "").strip().lower()
    if normalized in {"completed", "closed"}:
        return "green"
    if project_name in risk_projects:
        return "red"
    return "amber"


def _get_this_week_glance(project_filters):
    project_names = frappe.get_all("Project", filters=project_filters, pluck="name")
    if not project_names:
        return {
            "status_reports_due_this_week": 0,
            "milestones_due_next_7_days": 0,
        }

    today = getdate()
    week_end = add_to_date(today, days=7, as_string=True)

    milestones_due = 0
    if _has_field("Task", "project") and _has_field("Task", "exp_end_date"):
        milestones_due = len(
            frappe.get_all(
                "Task",
                filters={
                    "project": ["in", project_names],
                    "exp_end_date": ["between", [today, week_end]],
                    "status": ["not in", ["Completed", "Cancelled"]],
                    "docstatus": ["<", 2],
                },
                pluck="name",
            )
        )

    status_reports_due = 0
    if frappe.db.exists("DocType", "Project Status Report"):
        psr_meta = frappe.get_meta("Project Status Report")
        project_field = "project" if psr_meta.has_field("project") else None
        due_field = None
        for candidate in ["due_date", "reporting_date", "status_report_due_date"]:
            if psr_meta.has_field(candidate):
                due_field = candidate
                break
        if project_field and due_field:
            status_reports_due = len(
                frappe.get_all(
                    "Project Status Report",
                    filters={
                        project_field: ["in", project_names],
                        due_field: ["between", [today, week_end]],
                        "docstatus": ["<", 2],
                    },
                    pluck="name",
                )
            )

    return {
        "status_reports_due_this_week": status_reports_due,
        "milestones_due_next_7_days": milestones_due,
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
        "custom_jira_project": doc.get("custom_jira_project"),
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

    tasks = []
    task_breakdown = []
    if _has_field("Task", "project"):
        task_fields = [
            "name",
            "subject",
            "status",
            "priority",
            "exp_start_date",
            "exp_end_date",
            "progress",
            "modified",
        ]
        for f in ("custom_task_source", "custom_jira_issue_key", "custom_jira_issue_url"):
            if _has_field("Task", f):
                task_fields.append(f)
        tasks = frappe.get_all(
            "Task",
            filters={"project": name},
            fields=task_fields,
            order_by="modified desc",
            limit_page_length=200,
        )
        grouped = {}
        for row in tasks:
            key = row.get("status") or "Not Set"
            grouped[key] = grouped.get(key, 0) + 1
        task_breakdown = [{"label": k, "count": v} for k, v in grouped.items()]

    project["linked_users"] = linked_users
    project["timesheets"] = timesheets
    project["travel_requests"] = travel_requests
    project["tasks"] = tasks
    project["charts"] = {
        "timesheet_status_breakdown": ts_breakdown,
        "travel_request_workflow_breakdown": tr_breakdown,
        "task_status_breakdown": task_breakdown,
    }
    project["this_week"] = _get_this_week_glance({"name": name})

    return project


@frappe.whitelist()
def pull_project_jira_tasks(project_name):
    """Pull Jira issues for the project's linked Jira Project and sync them into Tasks."""
    if not project_name:
        frappe.throw(_("Project name is required."))

    jira_key = frappe.db.get_value("Project", project_name, "custom_jira_project")
    if not jira_key:
        frappe.throw(_("This project is not linked to a Jira Project."))

    from corporate_services.icl_corporate_services.doctype.jira_settings.jira_settings import (
        pull_issues,
    )

    return pull_issues(jira_key)


@frappe.whitelist()
def get_project_template_targets(project_name):
    if not project_name:
        frappe.throw("Project is required.")

    templates = get_toolkit_items()

    candidates = ["project_name", "project", "project_id"]
    out = []

    for template in templates:
        doctype = template.get("target_doctype")
        if not doctype:
            continue

        fieldname = None
        first_name = None
        match_count = 0

        try:
            meta = frappe.get_meta(doctype)
            for f in candidates:
                if meta.get_field(f):
                    fieldname = f
                    break

            if fieldname:
                docs = frappe.get_all(
                    doctype,
                    filters={fieldname: project_name},
                    fields=["name"],
                    limit_page_length=2,
                    order_by="modified desc",
                )
                match_count = len(docs)
                first_name = docs[0]["name"] if docs else None
        except Exception:
            first_name = None
            match_count = 0

        out.append(
            {
                "label": template.get("requirement"),
                "doctype": doctype,
                "project_field": fieldname,
                "first_name": first_name,
                "match_count": match_count,
                "stage_name": template.get("stage_name"),
            }
        )

    return out


@frappe.whitelist()
def get_project_folder_tree(project_name):
    if not project_name:
        frappe.throw("Project is required.")

    root_file_name = f"Project - {project_name}"
    root_name = frappe.db.get_value(
        "File",
        {"is_folder": 1, "file_name": root_file_name, "folder": "Home"},
        "name",
    )
    if not root_name:
        return {"root": None, "children": []}

    def _children(parent_name):
        rows = frappe.get_all(
            "File",
            filters={"is_folder": 1, "folder": parent_name},
            fields=["name", "file_name", "folder", "creation", "modified"],
            order_by="file_name asc",
        )
        out = []
        for row in rows:
            out.append(
                {
                    "name": row["name"],
                    "file_name": row["file_name"],
                    "folder": row["folder"],
                    "creation": row["creation"],
                    "modified": row["modified"],
                    "children": _children(row["name"]),
                }
            )
        return out

    root_doc = frappe.get_doc("File", root_name)
    return {
        "root": {"name": root_doc.name, "file_name": root_doc.file_name},
        "children": _children(root_doc.name),
    }


@frappe.whitelist()
def get_project_google_drive_folders(project_name):
    if not project_name:
        frappe.throw("Project is required.")

    comments = frappe.get_all(
        "Comment",
        filters={
            "reference_doctype": "Project",
            "reference_name": project_name,
            "comment_type": "Comment",
        },
        fields=["name", "content", "creation", "owner"],
        order_by="creation desc",
        limit_page_length=200,
    )

    rows = []
    seen = set()
    link_pattern = re.compile(r'https?://drive\.google\.com/drive/folders/[A-Za-z0-9_-]+')
    name_pattern = re.compile(r"Google Drive folder created:\s*.*?>(.*?)</a>", re.IGNORECASE)

    for row in comments:
        content = row.get("content") or ""
        if "Google Drive folder created" not in content:
            continue

        link_match = link_pattern.search(content)
        if not link_match:
            continue
        folder_link = link_match.group(0)

        folder_name = "Google Drive Folder"
        name_match = name_pattern.search(content)
        if name_match and name_match.group(1).strip():
            folder_name = name_match.group(1).strip()

        key = f"{folder_name}|{folder_link}"
        if key in seen:
            continue
        seen.add(key)

        rows.append(
            {
                "folder_name": folder_name,
                "folder_link": folder_link,
                "created_on": row.get("creation"),
                "created_by": row.get("owner"),
            }
        )

    return rows


@frappe.whitelist()
def get_project_timesheet_monthly_hours(project_name=None, month=None, finance_approved_only=0):
    project_name = (project_name or "").strip()

    if project_name:
        frappe.get_doc("Project", project_name).check_permission("read")
    else:
        if not (
            frappe.has_permission("Timesheet", "read")
            or frappe.has_permission("Timesheet Submission", "read")
        ):
            frappe.throw("Not permitted")

    month = (month or "").strip()
    month_start = None
    month_end = None
    month_year_filter = None
    if month:
        month_date = _parse_month(month)
        month_start = get_first_day(month_date)
        month_end = get_last_day(month_date)
        month_year_filter = month_start.strftime("%m-%Y")

    submission_filters = {"workflow_state": ["!=", "Draft"], "docstatus": ["!=", 2]}
    if month_year_filter:
        submission_filters["month_year"] = month_year_filter

    finance_approved_only = frappe.utils.cint(finance_approved_only)
    if finance_approved_only:
        submission_filters["workflow_state"] = "Approved by Finance"

    submissions = frappe.get_all(
        "Timesheet Submission",
        filters=submission_filters,
        fields=["name", "employee", "employee_name", "month_year"],
        limit_page_length=100000,
    )
    submission_by_name = {row["name"]: row for row in submissions}
    submission_names = list(submission_by_name.keys())

    if not submission_names:
        return {
            "project_name": project_name or None,
            "month": month if month else None,
            "month_start": str(month_start) if month_start else None,
            "month_end": str(month_end) if month_end else None,
            "total_hours": 0.0,
            "timesheet_count": 0,
            "daily_hours": [],
            "employee_hours": [],
            "monthly_hours": [],
            "available_months": [],
            "project_hours": [],
            "finance_approved_only": finance_approved_only,
        }

    child_filters = {
        "parent": ["in", submission_names],
        "project": ["!=", ""],
    }
    if project_name:
        child_filters["project"] = project_name

    rows = frappe.get_all(
        "Timesheet Submission List",
        filters=child_filters,
        fields=["parent", "project", "project_name", "total_hours"],
        order_by="parent asc, idx asc",
        limit_page_length=200000,
    )

    total_hours = 0.0
    timesheet_set = set()
    employee_totals = {}
    project_totals = {}
    monthly_totals = {}

    for row in rows:
        parent = row.get("parent")
        submission = submission_by_name.get(parent)
        if not submission or not row.get("project"):
            continue

        hrs = float(row.get("total_hours") or 0)
        total_hours += hrs
        timesheet_set.add(parent)

        emp = submission.get("employee") or ""
        emp_name = submission.get("employee_name") or emp or "-"
        if emp not in employee_totals:
            employee_totals[emp] = {"employee": emp, "employee_name": emp_name, "total_hours": 0.0}
        employee_totals[emp]["total_hours"] += hrs

        proj = row.get("project") or "-"
        proj_display = row.get("project_name") or proj
        if proj not in project_totals:
            project_totals[proj] = {"project": proj, "project_display": proj_display, "total_hours": 0.0}
        project_totals[proj]["total_hours"] += hrs

        month_iso = _month_year_to_iso(submission.get("month_year"))
        if month_iso:
            monthly_totals[month_iso] = monthly_totals.get(month_iso, 0.0) + hrs

    employee_rows = sorted(
        [
            {
                "employee": v["employee"],
                "employee_name": v["employee_name"],
                "total_hours": round(v["total_hours"], 2),
            }
            for v in employee_totals.values()
        ],
        key=lambda x: (-x["total_hours"], x["employee_name"] or ""),
    )

    project_rows = sorted(
        [
            {
                "project": v["project"],
                "project_display": v["project_display"],
                "total_hours": round(v["total_hours"], 2),
            }
            for v in project_totals.values()
        ],
        key=lambda x: (-x["total_hours"], x["project_display"] or ""),
    )

    monthly_rows = [
        {"month": m, "total_hours": round(monthly_totals[m], 2)}
        for m in sorted(monthly_totals.keys(), reverse=True)
    ]

    return {
        "project_name": project_name or None,
        "month": month if month else None,
        "month_start": str(month_start) if month_start else None,
        "month_end": str(month_end) if month_end else None,
        "total_hours": round(total_hours, 2),
        "timesheet_count": len(timesheet_set),
        "daily_hours": [],
        "employee_hours": employee_rows,
        "monthly_hours": monthly_rows,
        "available_months": [row.get("month") for row in monthly_rows if row.get("month")],
        "project_hours": project_rows,
        "finance_approved_only": finance_approved_only,
    }


@frappe.whitelist()
def get_project_options():
    return frappe.get_all(
        "Project",
        fields=["name", "project_name"],
        order_by="project_name asc, name asc",
        limit_page_length=5000,
    )


def _parse_month(month):
    if not month:
        return getdate()

    try:
        return getdate(f"{month}-01")
    except Exception:
        frappe.throw("Month must be in YYYY-MM format.")


def _month_year_to_iso(month_year):
    if not month_year or "-" not in month_year:
        return None
    mm, yyyy = month_year.split("-", 1)
    if len(mm) != 2 or len(yyyy) != 4:
        return None
    return f"{yyyy}-{mm}"
