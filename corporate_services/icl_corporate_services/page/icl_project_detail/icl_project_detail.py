import frappe
import re
from frappe.utils import add_to_date, get_first_day, get_last_day, getdate


@frappe.whitelist()
def get_project_details(project_name):
    if not project_name:
        frappe.throw("Project is required.")

    project = frappe.get_doc("Project", project_name)
    return {
        "name": project.name,
        "project_name": project.project_name,
        "status": project.status,
        "priority": project.priority,
        "percent_complete": project.percent_complete,
        "expected_start_date": project.expected_start_date,
        "expected_end_date": project.expected_end_date,
        "department": project.department,
        "project_type": project.project_type,
        "company": project.company,
        "customer": project.customer,
        "notes": project.notes,
        "creation": project.creation,
        "modified": project.modified,
    }


@frappe.whitelist()
def get_project_template_targets(project_name):
    if not project_name:
        frappe.throw("Project is required.")

    templates = frappe.get_all(
        "HIS Project Requirement Template",
        filters={"is_active": 1},
        fields=["requirement", "target_doctype", "display_order"],
        order_by="display_order asc, modified asc",
        limit_page_length=200,
    )

    candidates = ["project_name", "project", "project_id"]
    out = []

    for template in templates:
        doctype = template["target_doctype"]
        if not doctype:
            continue
        search_fields = candidates

        fieldname = None
        first_name = None
        match_count = 0

        try:
            meta = frappe.get_meta(doctype)
            for f in search_fields:
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
            # Keep the template visible even when the user lacks access
            fieldname = fieldname or None
            first_name = None
            match_count = 0

        out.append(
            {
                "label": template["requirement"],
                "doctype": doctype,
                "project_field": fieldname,
                "first_name": first_name,
                "match_count": match_count,
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
        # Enforce project-level read permission.
        frappe.get_doc("Project", project_name).check_permission("read")
    else:
        # Fallback permission gate for all-project aggregate mode.
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
        if not submission:
            continue

        # Only include rows explicitly linked to a Project (exclude activity-only rows).
        if not row.get("project"):
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

    daily_rows = []

    return {
        "project_name": project_name or None,
        "month": month if month else None,
        "month_start": str(month_start) if month_start else None,
        "month_end": str(month_end) if month_end else None,
        "total_hours": round(total_hours, 2),
        "timesheet_count": len(timesheet_set),
        "daily_hours": daily_rows,
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
        # Expected format: YYYY-MM
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
