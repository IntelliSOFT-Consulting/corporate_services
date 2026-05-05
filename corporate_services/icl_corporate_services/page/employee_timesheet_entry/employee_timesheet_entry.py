import frappe
import json
from datetime import datetime, timedelta
from collections import OrderedDict
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

from corporate_services.api.timesheet.timesheet_generation_export import get_timesheet_period
from corporate_services.api.timesheet.timesheet_import import (
    create_timesheet,
    create_timesheet_detail_entry,
    save_timesheets,
    get_default_activity_type,
    get_activity_field_mapping,
)

def _ensure_private_activity_fields():
    """Ensure Activity Type has a private flag field."""
    meta = frappe.get_meta("Activity Type")
    if meta.has_field("custom_is_private"):
        return
    create_custom_fields(
        {
            "Activity Type": [
                {
                    "fieldname": "custom_is_private",
                    "label": "Is Private",
                    "fieldtype": "Check",
                    "default": "0",
                    "insert_after": "disabled",
                }
            ]
        },
        update=True,
    )


def _append_submission_row(submission_doc, ts_doc, project_name_override=None):
    submission_doc.append(
        "timesheet_per_project",
        {
            "timesheet": ts_doc.name,
            "timesheet_type": ts_doc.custom_timesheet_type,
            "project": ts_doc.parent_project,
            "project_name": project_name_override or ts_doc.custom_project_name or "",
            "month": ts_doc.custom_month,
            "total_hours": ts_doc.total_hours,
            "status": ts_doc.status,
        },
    )


def _get_employee_day_start_time(employee, submission_doc, date_str):
    """
    Return a safe start time for this employee/date:
    - first entry: 08:00
    - subsequent entries: last to_time + 1 second
    across submissions, considering submission creation order.
    """
    day_start = datetime.strptime(date_str + " 00:00:00", "%Y-%m-%d %H:%M:%S")
    day_end = datetime.strptime(date_str + " 23:59:59", "%Y-%m-%d %H:%M:%S")
    base_start = datetime.strptime(date_str + " 08:00:00", "%Y-%m-%d %H:%M:%S")

    existing = frappe.db.sql(
        """
        SELECT MAX(td.to_time)
        FROM `tabTimesheet Detail` td
        INNER JOIN `tabTimesheet` ts ON ts.name = td.parent
        INNER JOIN `tabTimesheet Submission` tss ON tss.name = ts.custom_timesheet_submission
        WHERE ts.employee = %(employee)s
          AND ts.docstatus != 2
          AND tss.creation < %(submission_creation)s
          AND td.from_time >= %(day_start)s
          AND td.from_time <= %(day_end)s
        """,
        {
            "employee": employee,
            "submission_creation": submission_doc.creation,
            "day_start": day_start,
            "day_end": day_end,
        },
    )
    max_to_time = existing[0][0] if existing and existing[0] else None
    if max_to_time and max_to_time > base_start:
        return max_to_time + timedelta(seconds=1)
    return base_start


def _get_submission_sections(submission_name):
    ts_meta = frappe.get_meta("Timesheet")
    activity_field = "custom_activity_type" if ts_meta.has_field("custom_activity_type") else None
    if not activity_field and ts_meta.has_field("activity_type"):
        activity_field = "activity_type"
    activity_name_field = "custom_activity_name" if ts_meta.has_field("custom_activity_name") else None

    ts_fields = ["name", "parent_project", "custom_project_name"]
    if activity_field:
        ts_fields.append(activity_field)
    if activity_name_field:
        ts_fields.append(activity_name_field)

    timesheets = frappe.get_all(
        "Timesheet",
        filters={
            "custom_timesheet_submission": submission_name,
            "docstatus": ["!=", 2],
        },
        fields=ts_fields,
        order_by="creation asc",
    )
    if not timesheets:
        return []

    project_names = {}
    project_ids = [t["parent_project"] for t in timesheets if t.get("parent_project")]
    if project_ids:
        for p in frappe.get_all("Project", filters={"name": ["in", project_ids]}, fields=["name", "project_name"]):
            project_names[p["name"]] = p.get("project_name") or p["name"]

    sections = OrderedDict()
    for ts in timesheets:
        ts_name = ts["name"]
        project_id = ts.get("parent_project")
        activity_type = ts.get(activity_name_field) if activity_name_field else None
        if not activity_type:
            activity_type = ts.get(activity_field) if activity_field else None

        if project_id:
            section_key = ("project", ts.get("custom_project_name") or project_names.get(project_id, project_id))
        else:
            if not activity_type:
                # Fallback for cases where parent activity field is blank:
                # derive label from the first detail row activity type.
                detail_activity = frappe.db.get_value(
                    "Timesheet Detail",
                    {"parent": ts_name},
                    "activity_type",
                    order_by="idx asc",
                )
                activity_type = detail_activity
            section_key = ("activity", activity_type or "Other Activities")

        if section_key not in sections:
            sections[section_key] = OrderedDict()

        logs = frappe.get_all(
            "Timesheet Detail",
            filters={"parent": ts_name},
            fields=["custom_tasks", "from_time", "hours"],
            order_by="from_time asc, idx asc",
        )
        for log in logs:
            task_name = (log.get("custom_tasks") or "").strip() or "No Task"
            if task_name not in sections[section_key]:
                sections[section_key][task_name] = {}

            dt = log.get("from_time")
            if dt:
                date_key = dt.date().isoformat()
                sections[section_key][task_name][date_key] = float(log.get("hours") or 0)

    payload = []
    for (sec_type, sec_name), tasks in sections.items():
        payload.append(
            {
                "type": sec_type,
                "name": sec_name,
                "tasks": [{"task": task, "hours": hours_map} for task, hours_map in tasks.items()],
            }
        )
    return payload


@frappe.whitelist()
def get_timesheet_context(submission_name):
    doc = frappe.get_doc("Timesheet Submission", submission_name)

    month_year = doc.month_year
    parts = month_year.split("-")
    month = int(parts[0])
    year = int(parts[1])

    start_date, end_date = get_timesheet_period(month, year)

    dates = []
    current = start_date
    while current <= end_date:
        weekday = current.weekday()
        is_weekend = weekday >= 5
        dates.append({
            "date": current.isoformat(),
            "day": current.strftime("%A"),
            "day_short": current.strftime("%a"),
            "date_num": current.strftime("%d"),
            "is_weekend": is_weekend,
        })
        current += timedelta(days=1)

    employee = doc.employee
    employee_name = frappe.db.get_value("Employee", employee, "employee_name")
    employee_user_id = frappe.db.get_value("Employee", employee, "user_id")

    # Prefer the current session user's project assignments for prefill.
    # Fall back to the submission employee's linked user if needed.
    assignment_users = []
    if frappe.session.user and frappe.session.user != "Guest":
        assignment_users.append(frappe.session.user)
    if employee_user_id and employee_user_id not in assignment_users:
        assignment_users.append(employee_user_id)

    assigned_project_names = []
    assigned_project_map = {}
    for assignment_user in assignment_users:
        project_links = frappe.get_all(
            "Project User",
            filters={"user": assignment_user},
            fields=["parent"],
        )
        for link in project_links:
            project_docname = link.get("parent")
            if not project_docname or project_docname in assigned_project_map:
                continue
            project_name = frappe.db.get_value("Project", project_docname, "project_name")
            if project_name:
                assigned_project_map[project_docname] = {
                    "name": project_docname,
                    "project_name": project_name,
                }

    assigned_project_names = list(assigned_project_map.values())

    all_projects = frappe.get_all("Project", fields=["name", "project_name"], order_by="project_name asc")

    _ensure_private_activity_fields()
    raw_activity_types = frappe.get_all(
        "Activity Type",
        filters={"disabled": 0},
        fields=["activity_type", "custom_is_private", "owner"],
    )
    activity_types = []
    for row in raw_activity_types:
        name = (row.get("activity_type") or "").strip()
        if not name:
            continue
        if name.lower() == "projects":
            continue
        is_private = int(row.get("custom_is_private") or 0) == 1
        if is_private and row.get("owner") != frappe.session.user:
            continue
        activity_types.append(name)
    activity_types = sorted(set(activity_types))

    already_imported = bool(
        frappe.db.exists(
            "Timesheet",
            {
                "custom_timesheet_submission": submission_name,
                "docstatus": ["!=", 2],
            },
        )
    )

    existing_sections = _get_submission_sections(submission_name)

    submissions = frappe.get_all(
        "Timesheet Submission",
        filters={"employee": employee, "docstatus": ["!=", 2]},
        fields=["name", "month_year", "creation"],
        order_by="creation desc",
    )

    workflow_state = doc.get("workflow_state") or "Draft"
    workflow_style = (
        frappe.db.get_value("Workflow State", {"workflow_state_name": workflow_state}, "style")
        or ""
    )

    return {
        "employee": employee,
        "employee_name": employee_name,
        "submission_name": submission_name,
        "month_year": month_year,
        "workflow_state": workflow_state,
        "workflow_style": workflow_style,
        "dates": dates,
        "projects": assigned_project_names,
        "all_projects": all_projects,
        "activity_types": activity_types,
        "already_imported": already_imported,
        "existing_sections": existing_sections,
        "submissions": submissions,
    }


@frappe.whitelist()
def create_activity_type(name):
    cleaned = (name or "").strip()
    if not cleaned:
        frappe.throw("Activity type name is required.")
    if cleaned.lower() == "projects":
        frappe.throw("Activity type name cannot be Projects.")

    _ensure_private_activity_fields()
    existing_any = frappe.get_value(
        "Activity Type",
        {"activity_type": cleaned},
        ["name", "custom_is_private", "owner"],
        as_dict=True,
    )
    if existing_any:
        is_private = int(existing_any.get("custom_is_private") or 0) == 1
        if is_private and existing_any.get("owner") == frappe.session.user:
            return {"name": cleaned, "created": False}
        if not is_private:
            return {"name": cleaned, "created": False}
        frappe.throw("This activity type name already exists as another user's private type.")

    existing = frappe.db.exists(
        "Activity Type",
        {"activity_type": cleaned, "custom_is_private": 1, "owner": frappe.session.user},
    )
    if existing:
        return {"name": cleaned, "created": False}

    doc = frappe.get_doc(
        {
            "doctype": "Activity Type",
            "activity_type": cleaned,
            "disabled": 0,
            "custom_is_private": 1,
        }
    )
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"name": doc.name, "created": True}


@frappe.whitelist()
def save_web_timesheet(submission_name, sections):
    doc = frappe.get_doc("Timesheet Submission", submission_name)

    if isinstance(sections, str):
        sections = json.loads(sections)

    ts_meta = frappe.get_meta("Timesheet")
    activity_parent_field = "custom_activity_type" if ts_meta.has_field("custom_activity_type") else None
    if not activity_parent_field and ts_meta.has_field("activity_type"):
        activity_parent_field = "activity_type"

    ts_fields = ["name", "docstatus", "parent_project", "custom_project_name", "custom_activity_name"]
    if activity_parent_field:
        ts_fields.append(activity_parent_field)

    existing_timesheets = frappe.get_all(
        "Timesheet",
        filters={
            "custom_timesheet_submission": submission_name,
            "docstatus": ["!=", 2],
        },
        fields=ts_fields,
    )

    # Do not mutate submissions that already contain submitted timesheets.
    submitted_linked = [ts for ts in existing_timesheets if int(ts.get("docstatus") or 0) == 1]
    if submitted_linked:
        return {
            "status": "locked",
            "message": "This submission has submitted timesheets and cannot be edited from this page.",
        }

    # Reuse draft timesheets by section key so links remain stable.
    existing_by_key = {}
    for row in existing_timesheets:
        if row.get("parent_project"):
            key = ("project", row.get("custom_project_name") or row.get("parent_project"))
        else:
            key = ("activity", row.get("custom_activity_name") or (row.get(activity_parent_field) if activity_parent_field else None))
        if key[1]:
            existing_by_key[key] = frappe.get_doc("Timesheet", row["name"])

    activity_field_mapping = get_activity_field_mapping()

    project_timesheets = {}
    activity_timesheets = {}
    total_hours = 0.0
    # Keep one running cursor per date across all sections so time windows
    # never overlap between projects/activities on the same day.
    day_time_cursor = {}

    # Reset mapped parent activity-hour fields on reused timesheets.
    mapped_parent_fields = {f for f in (activity_field_mapping or {}).values() if f}
    active_timesheets = []

    for section in sections:
        sec_type = section.get("type")
        sec_name = section.get("name")
        tasks = section.get("tasks", [])

        if sec_type == "project":
            project_doc_name = frappe.db.get_value("Project", {"project_name": sec_name}, "name") or sec_name
            section_key = ("project", sec_name)
            ts = existing_by_key.pop(section_key, None)
            if not ts:
                ts = create_timesheet(doc, project=project_doc_name, month_name=doc.month_year)
            else:
                ts.custom_month = doc.month_year
                ts.custom_timesheet_submission = doc.name
                ts.parent_project = project_doc_name
                if hasattr(ts, "custom_project_name"):
                    ts.custom_project_name = sec_name
                ts.custom_timesheet_type = "Project Based"
                ts.set("time_logs", [])
                for fieldname in mapped_parent_fields:
                    if hasattr(ts, fieldname):
                        ts.set(fieldname, 0)
            active_timesheets.append(ts)

            for task_row in tasks:
                task_desc = task_row.get("task", "")
                hours_map = task_row.get("hours", {})
                for date_str, hours in hours_map.items():
                    hours = float(hours)
                    if hours <= 0:
                        continue
                    date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
                    if date_str not in day_time_cursor:
                        day_time_cursor[date_str] = _get_employee_day_start_time(doc.employee, doc, date_str)
                    from_time = day_time_cursor[date_str]
                    to_time = from_time + timedelta(hours=hours)
                    day_time_cursor[date_str] = to_time + timedelta(seconds=1)

                    create_timesheet_detail_entry(
                        ts,
                        from_time=from_time,
                        to_time=to_time,
                        activity_type="Projects",
                        task=task_desc,
                        day=date_obj.isoformat(),
                        hours=hours,
                        project=sec_name,
                        activity_field_mapping=activity_field_mapping,
                    )
                    total_hours += hours

            project_timesheets[sec_name] = ts

        elif sec_type == "activity":
            section_key = ("activity", sec_name)
            ts = existing_by_key.pop(section_key, None)
            if not ts:
                ts = create_timesheet(doc, activity_type=sec_name, month_name=doc.month_year)
            else:
                ts.custom_month = doc.month_year
                ts.custom_timesheet_submission = doc.name
                if hasattr(ts, "custom_activity_type"):
                    ts.custom_activity_type = sec_name
                if hasattr(ts, "activity_type"):
                    ts.activity_type = sec_name
                if hasattr(ts, "custom_activity_name"):
                    ts.custom_activity_name = sec_name
                ts.custom_timesheet_type = "Other Activities"
                ts.set("time_logs", [])
                for fieldname in mapped_parent_fields:
                    if hasattr(ts, fieldname):
                        ts.set(fieldname, 0)
            active_timesheets.append(ts)

            for task_row in tasks:
                task_desc = task_row.get("task", "")
                hours_map = task_row.get("hours", {})
                for date_str, hours in hours_map.items():
                    hours = float(hours)
                    if hours <= 0:
                        continue
                    date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
                    if date_str not in day_time_cursor:
                        day_time_cursor[date_str] = _get_employee_day_start_time(doc.employee, doc, date_str)
                    from_time = day_time_cursor[date_str]
                    to_time = from_time + timedelta(hours=hours)
                    day_time_cursor[date_str] = to_time + timedelta(seconds=1)

                    create_timesheet_detail_entry(
                        ts,
                        from_time=from_time,
                        to_time=to_time,
                        activity_type=sec_name,
                        task=task_desc,
                        day=date_obj.isoformat(),
                        hours=hours,
                        project=None,
                        activity_field_mapping=activity_field_mapping,
                    )
                    total_hours += hours

            activity_timesheets[sec_name] = ts

    # Sections removed in UI: delete now-orphaned draft timesheets.
    for orphan in existing_by_key.values():
        frappe.delete_doc("Timesheet", orphan.name, force=True, ignore_permissions=True)

    # Reused timesheets can still have old DB child rows until save. Clear them
    # first to prevent overlap validation against stale time windows.
    reused_names = [
        ts.name
        for ts in list(project_timesheets.values()) + list(activity_timesheets.values())
        if ts.name
    ]
    if reused_names:
        frappe.db.delete("Timesheet Detail", {"parent": ["in", reused_names]})

    minimum_hours = frappe.db.get_value("Employee", doc.employee, "custom_hrs_per_month") or 0
    # Do not block empty drafts; only validate minimum once hours exist.
    if total_hours > 0 and total_hours < float(minimum_hours):
        frappe.throw(
            f"Total hours ({total_hours:.1f}) is less than the minimum required hours ({minimum_hours}) for this employee."
        )

    # Save in-place timesheets; remove empty ones to avoid stale records.
    persisted_projects = {}
    persisted_activities = {}
    for label, ts in project_timesheets.items():
        if not ts.time_logs:
            if ts.name:
                frappe.delete_doc("Timesheet", ts.name, force=True, ignore_permissions=True)
            continue
        if ts.name:
            ts.save(ignore_permissions=True)
        else:
            ts.insert(ignore_permissions=True)
        persisted_projects[label] = ts

    for label, ts in activity_timesheets.items():
        if not ts.time_logs:
            if ts.name:
                frappe.delete_doc("Timesheet", ts.name, force=True, ignore_permissions=True)
            continue
        if ts.name:
            ts.save(ignore_permissions=True)
        else:
            ts.insert(ignore_permissions=True)
        persisted_activities[label] = ts

    # Keep Timesheet Submission child table in sync with autosave-created
    # timesheets so the same "Timesheet Per project" table remains usable.
    doc.set("timesheet_per_project", [])
    for ts in persisted_projects.values():
        _append_submission_row(doc, ts)
    for activity_label, ts in persisted_activities.items():
        _append_submission_row(doc, ts, project_name_override=activity_label)

    doc.total_working_hours = total_hours
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {"status": "success", "total_hours": total_hours}
