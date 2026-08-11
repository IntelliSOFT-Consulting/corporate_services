# Copyright (c) 2026, ICL and contributors
# For license information, please see license.txt

import frappe
import requests
from frappe import _


def _to_datetime(value):
	if not value:
		return None
	return value[:19].replace("T", " ")


def _field_id_by_name(doc, target_name):
	"""Look up a Jira field's id by its display name (e.g. 'Start date', 'Sprint').

	Both fields are custom fields under the hood with site-specific ids, so we
	resolve them by name instead of requiring the id to be configured by hand.
	Returns None if the field doesn't exist on this Jira instance - that's fine,
	the corresponding data just won't be pulled.
	"""
	try:
		for f in doc._request("/rest/api/3/field"):
			if (f.get("name") or "").strip().lower() == target_name.strip().lower():
				return f.get("id")
	except requests.HTTPError:
		pass
	return None


def _current_sprint(value):
	"""Jira's Sprint field is a list of sprint objects (past to present); use the last one."""
	if not isinstance(value, list) or not value:
		return None
	last = value[-1]
	return last if isinstance(last, dict) else None


def _map_issue(issue, start_date_field_id=None, sprint_field_id=None):
	fields = issue.get("fields") or {}

	def name_of(key):
		obj = fields.get(key) or {}
		return obj.get("name") if isinstance(obj, dict) else None

	assignee = fields.get("assignee") or {}
	reporter = fields.get("reporter") or {}
	parent = fields.get("parent") or {}

	start_date = None
	if start_date_field_id:
		raw = fields.get(start_date_field_id)
		if isinstance(raw, str):
			start_date = raw[:10] or None

	sprint = _current_sprint(fields.get(sprint_field_id)) if sprint_field_id else None

	return {
		"issue_key": issue.get("key"),
		"issue_id": issue.get("id"),
		"summary": fields.get("summary"),
		"issue_type": name_of("issuetype"),
		"status": name_of("status"),
		"priority": name_of("priority"),
		"assignee": assignee.get("displayName"),
		"assignee_email": assignee.get("emailAddress"),
		"reporter": reporter.get("displayName"),
		"parent_key": parent.get("key"),
		"labels": ", ".join(fields.get("labels") or []),
		"resolution": name_of("resolution"),
		"created": _to_datetime(fields.get("created")),
		"updated": _to_datetime(fields.get("updated")),
		"start_date": start_date,
		"due_date": (fields.get("duedate") or "")[:10] or None,
		"sprint_id": sprint.get("id") if sprint else None,
		"sprint_name": sprint.get("name") if sprint else None,
		"sprint_state": sprint.get("state") if sprint else None,
		"sprint_board_id": sprint.get("boardId") if sprint else None,
		"sprint_start_date": ((sprint.get("startDate") or "")[:10] or None) if sprint else None,
		"sprint_end_date": ((sprint.get("endDate") or "")[:10] or None) if sprint else None,
		"sprint_goal": sprint.get("goal") if sprint else None,
	}


@frappe.whitelist()
def pull_issues(project_key):
	"""Fetch all issues for a Jira project and (re)sync them into the Jira Project's issues table."""
	project_key = (project_key or "").strip()
	if not project_key:
		frappe.throw(_("Project key is required."))
	if not frappe.db.exists("Jira Project", project_key):
		frappe.throw(_("Jira Project '{0}' not found. Pull projects first.").format(project_key))

	doc = frappe.get_single("Jira Settings")
	base = doc._base()
	start_date_field_id = _field_id_by_name(doc, "Start date")
	sprint_field_id = _field_id_by_name(doc, "Sprint")

	field_list = "summary,issuetype,status,priority,assignee,reporter,created,updated,duedate,resolution,labels,parent"
	for extra in (start_date_field_id, sprint_field_id):
		if extra:
			field_list += f",{extra}"
	# Jira Cloud's classic /rest/api/3/search was removed (410). The enhanced
	# endpoint /rest/api/3/search/jql uses token pagination and returns no total.
	next_token = None
	issues = []
	while True:
		params = {
			"jql": f'project = "{project_key}" ORDER BY updated DESC',
			"maxResults": 100,
			"fields": field_list,
		}
		if next_token:
			params["nextPageToken"] = next_token
		data = doc._request("/rest/api/3/search/jql", params=params)
		batch = data.get("issues", [])
		issues.extend(batch)
		next_token = data.get("nextPageToken")
		if data.get("isLast") or not next_token or not batch:
			break

	mapped = []
	for issue in issues:
		row = _map_issue(issue, start_date_field_id, sprint_field_id)
		row["url"] = f"{base}/browse/{row['issue_key']}" if row.get("issue_key") else None
		row["sprint"] = row.get("sprint_name")
		mapped.append(row)

	jp = frappe.get_doc("Jira Project", project_key)

	# Refresh project meta (lead/name/type) from Jira; /project/{key} returns lead by default.
	try:
		p = doc._request(f"/rest/api/3/project/{project_key}")
		jp.project_name = p.get("name") or jp.project_name
		jp.project_id = p.get("id") or jp.project_id
		jp.project_type = p.get("projectTypeKey") or jp.project_type
		jp.lead = (p.get("lead") or {}).get("displayName") or jp.lead
	except requests.HTTPError:
		pass

	jp.set("issues", [])
	for row in mapped:
		jp.append("issues", row)
	jp.save(ignore_permissions=True)

	sprints = _sync_sprints(project_key, mapped)
	tasks = _sync_issues_to_tasks(project_key, mapped)
	frappe.db.commit()

	return {"count": len(issues), "project": project_key, "tasks": tasks, "sprints": sprints}


def _sync_sprints(project_key, mapped):
	"""Upsert a Jira Sprint record for every distinct sprint seen on the pulled issues."""
	by_id = {}
	for row in mapped:
		sid = row.get("sprint_id")
		if sid is not None and sid not in by_id:
			by_id[sid] = row

	created = updated = 0
	for sid, row in by_id.items():
		name = str(sid)
		values = {
			"sprint_name": row.get("sprint_name"),
			"jira_project": project_key,
			"state": (row.get("sprint_state") or "").capitalize() or None,
			"board_id": row.get("sprint_board_id"),
			"start_date": row.get("sprint_start_date"),
			"end_date": row.get("sprint_end_date"),
			"goal": row.get("sprint_goal"),
		}
		if frappe.db.exists("Jira Sprint", name):
			sp = frappe.get_doc("Jira Sprint", name)
			sp.update(values)
			sp.save(ignore_permissions=True)
			updated += 1
		else:
			sp = frappe.get_doc({"doctype": "Jira Sprint", "sprint_id": name, **values})
			sp.insert(ignore_permissions=True)
			created += 1

	return {"created": created, "updated": updated}


# Map Jira issue status / priority onto ERPNext Task fields
_TASK_STATUS_MAP = {
	"done": "Completed",
	"completed": "Completed",
	"complete": "Completed",
	"closed": "Completed",
	"resolved": "Completed",
	"cancelled": "Cancelled",
	"canceled": "Cancelled",
	"in progress": "Working",
	"in review": "Pending Review",
	"review": "Pending Review",
}
_TASK_PRIORITY_MAP = {
	"highest": "Urgent",
	"high": "High",
	"medium": "Medium",
	"low": "Low",
	"lowest": "Low",
}


def _resolve_assignee(email):
	"""Map a Jira assignee's email to an Employee (by User ID) if one exists on the ERP.

	Falls back to storing the raw email on the Task when no matching Employee is found.
	"""
	if not email:
		return {"custom_allocate_to": None, "custom_jira_assignee_email": None}

	employee = frappe.db.get_value("Employee", {"user_id": email}, "name")
	if employee:
		return {"custom_allocate_to": employee, "custom_jira_assignee_email": None}

	return {"custom_allocate_to": None, "custom_jira_assignee_email": email}


def _sync_issues_to_tasks(project_key, mapped):
	"""Upsert ERPNext Tasks from Jira issues, linked to the ERP Project mapped to this Jira project."""
	project = frappe.db.get_value("Project", {"custom_jira_project": project_key}, "name")
	if not project:
		return {"created": 0, "updated": 0, "errors": 0, "linked_project": None}

	created = updated = errors = 0
	for row in mapped:
		key = row.get("issue_key")
		if not key:
			continue
		values = {
			"subject": (row.get("summary") or key)[:140],
			"project": project,
			"status": _TASK_STATUS_MAP.get((row.get("status") or "").lower(), "Open"),
			"priority": _TASK_PRIORITY_MAP.get((row.get("priority") or "").lower(), "Medium"),
			"exp_start_date": row.get("start_date"),
			"exp_end_date": row.get("due_date"),
			"custom_task_source": "Jira",
			"custom_jira_issue_key": key,
			"custom_jira_issue_url": row.get("url"),
			"custom_jira_sprint": str(row["sprint_id"]) if row.get("sprint_id") is not None else None,
		}
		values.update(_resolve_assignee(row.get("assignee_email")))
		try:
			existing = frappe.db.get_value("Task", {"custom_jira_issue_key": key}, "name")
			if existing:
				task = frappe.get_doc("Task", existing)
				task.update(values)
				task.save(ignore_permissions=True)
				updated += 1
			else:
				task = frappe.get_doc({"doctype": "Task", **values})
				task.insert(ignore_permissions=True)
				created += 1
		except Exception:
			frappe.log_error(title=f"Jira->Task sync failed for {key}")
			errors += 1

	return {"created": created, "updated": updated, "errors": errors, "linked_project": project}


@frappe.whitelist()
def get_project_jira_sprints(project):
	"""List Jira Sprints available for the Jira project linked to this ERPNext Project."""
	jira_project = frappe.db.get_value("Project", project, "custom_jira_project")
	if not jira_project:
		return []

	return frappe.get_all(
		"Jira Sprint",
		filters={"jira_project": jira_project},
		fields=["name", "sprint_name", "state"],
		order_by="start_date desc",
	)


@frappe.whitelist()
def get_assigned_jira_tasks(project=None, sprint=None, start_date=None, end_date=None):
	"""Return the current user's Jira-sourced Tasks, optionally filtered by project/sprint/date range."""
	employee = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "name")
	if not employee:
		return []

	filters = {
		"custom_task_source": "Jira",
		"custom_allocate_to": employee,
	}
	if project:
		filters["project"] = project
	if sprint:
		filters["custom_jira_sprint"] = sprint
	if start_date:
		filters["exp_end_date"] = [">=", start_date]
	if end_date:
		filters.setdefault("exp_start_date", ["<=", end_date])

	return frappe.get_all(
		"Task",
		filters=filters,
		fields=[
			"name",
			"subject",
			"project",
			"status",
			"custom_jira_issue_key",
			"custom_jira_issue_url",
			"custom_jira_sprint",
			"exp_start_date",
			"exp_end_date",
		],
		order_by="exp_start_date asc",
		limit_page_length=500,
	)
