import frappe
from frappe.utils import getdate, nowdate

from corporate_services.api.project import _get_project_visibility_filters
from corporate_services.api.project.permissions import get_bypass_roles

CLOSED_TASK_STATUSES = {"Completed", "Cancelled"}


def _current_employee():
	return frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "name")


def _task_visibility_filters():
	"""Return Task filters scoping to the current user's allocated tasks, unless they hold a bypass role."""
	if set(frappe.get_roles(frappe.session.user)) & get_bypass_roles():
		return {}

	employee = _current_employee()
	if not employee:
		return None

	return {"custom_allocate_to": employee}


def _is_all_view():
	return bool(set(frappe.get_roles(frappe.session.user)) & get_bypass_roles())


@frappe.whitelist()
def get_my_projects():
	filters = _get_project_visibility_filters()
	if filters.get("name") == ["in", []]:
		return []

	return frappe.get_all(
		"Project",
		filters=filters,
		fields=[
			"name",
			"project_name",
			"status",
			"percent_complete",
			"expected_end_date",
			"custom_jira_project",
		],
		order_by="modified desc",
	)


@frappe.whitelist()
def get_my_tasks(project=None, page=1, page_length=20):
	page = max(frappe.utils.cint(page), 1)
	page_length = max(frappe.utils.cint(page_length), 1)

	filters = _task_visibility_filters()
	if filters is None:
		return {"tasks": [], "total": 0}

	if project:
		filters["project"] = project

	total = frappe.db.count("Task", filters=filters)

	tasks = frappe.get_all(
		"Task",
		filters=filters,
		fields=[
			"name",
			"subject",
			"project",
			"status",
			"priority",
			"exp_start_date",
			"exp_end_date",
			"custom_task_source",
			"custom_jira_issue_key",
			"custom_jira_issue_url",
			"custom_jira_sprint",
			"custom_allocate_to",
		],
		order_by="custom_jira_sprint asc, exp_end_date asc",
		limit_start=(page - 1) * page_length,
		limit_page_length=page_length,
	)

	project_names = {t["project"] for t in tasks if t.get("project")}
	project_labels = {}
	if project_names:
		for p in frappe.get_all(
			"Project", filters={"name": ["in", list(project_names)]}, fields=["name", "project_name"]
		):
			project_labels[p["name"]] = p.get("project_name") or p["name"]

	employee_names = {t["custom_allocate_to"] for t in tasks if t.get("custom_allocate_to")}
	employee_labels = {}
	if employee_names:
		for e in frappe.get_all(
			"Employee", filters={"name": ["in", list(employee_names)]}, fields=["name", "employee_name"]
		):
			employee_labels[e["name"]] = e.get("employee_name") or e["name"]

	sprint_names = {t["custom_jira_sprint"] for t in tasks if t.get("custom_jira_sprint")}
	sprint_labels = {}
	if sprint_names:
		for s in frappe.get_all(
			"Jira Sprint", filters={"name": ["in", list(sprint_names)]}, fields=["name", "sprint_name", "state"]
		):
			sprint_labels[s["name"]] = s.get("sprint_name") or s["name"]

	today = getdate()
	for t in tasks:
		t["project_name"] = project_labels.get(t.get("project"), t.get("project"))
		t["allocated_to_name"] = employee_labels.get(t.get("custom_allocate_to"))
		t["sprint_name"] = sprint_labels.get(t.get("custom_jira_sprint"))
		t["is_overdue"] = bool(
			t.get("exp_end_date") and getdate(t["exp_end_date"]) < today and t.get("status") not in CLOSED_TASK_STATUSES
		)

	return {"tasks": tasks, "total": total, "page": page, "page_length": page_length}


@frappe.whitelist()
def get_my_task_stats(project=None):
	filters = _task_visibility_filters()
	empty = {
		"status_counts": [],
		"priority_counts": [],
		"sprint_counts": [],
		"project_counts": [],
		"assignee_counts": [],
		"is_all_view": _is_all_view(),
	}
	if filters is None:
		return empty

	if project:
		filters["project"] = project

	status_rows = frappe.get_all(
		"Task", filters=filters, group_by="status", fields=["status", "count(name) as count"]
	)
	status_counts = [{"label": r["status"] or "No Status", "count": r["count"]} for r in status_rows]

	priority_rows = frappe.get_all(
		"Task", filters=filters, group_by="priority", fields=["priority", "count(name) as count"]
	)
	priority_counts = [{"label": r["priority"] or "No Priority", "count": r["count"]} for r in priority_rows]

	sprint_status_rows = frappe.get_all(
		"Task",
		filters=filters,
		group_by="custom_jira_sprint, status",
		fields=["custom_jira_sprint", "status", "count(name) as count"],
	)
	sprint_totals = {}
	for r in sprint_status_rows:
		key = r["custom_jira_sprint"] or ""
		entry = sprint_totals.setdefault(key, {"total": 0, "completed": 0})
		entry["total"] += r["count"]
		if r["status"] == "Completed":
			entry["completed"] += r["count"]

	sprint_names = [k for k in sprint_totals if k]
	sprint_meta = {}
	if sprint_names:
		for s in frappe.get_all(
			"Jira Sprint", filters={"name": ["in", sprint_names]}, fields=["name", "sprint_name", "goal"]
		):
			sprint_meta[s["name"]] = {"label": s.get("sprint_name") or s["name"], "goal": s.get("goal")}

	sprint_counts = []
	for key, totals in sprint_totals.items():
		meta = sprint_meta.get(key, {})
		sprint_counts.append(
			{
				"sprint": key or None,
				"label": meta.get("label", "No Sprint") if key else "No Sprint",
				"goal": meta.get("goal"),
				"total": totals["total"],
				"completed": totals["completed"],
				"count": totals["total"],
			}
		)

	project_counts = []
	if not project:
		project_rows = frappe.get_all(
			"Task", filters=filters, group_by="project", fields=["project", "count(name) as count"]
		)
		project_names = {r["project"] for r in project_rows if r.get("project")}
		project_labels = {}
		if project_names:
			for p in frappe.get_all(
				"Project", filters={"name": ["in", list(project_names)]}, fields=["name", "project_name"]
			):
				project_labels[p["name"]] = p.get("project_name") or p["name"]
		project_counts = [
			{"label": project_labels.get(r["project"], r["project"]) if r.get("project") else "No Project", "count": r["count"]}
			for r in project_rows
		]

	assignee_counts = []
	if _is_all_view():
		assignee_rows = frappe.get_all(
			"Task", filters=filters, group_by="custom_allocate_to", fields=["custom_allocate_to", "count(name) as count"]
		)
		employee_names = {r["custom_allocate_to"] for r in assignee_rows if r.get("custom_allocate_to")}
		employee_labels = {}
		if employee_names:
			for e in frappe.get_all(
				"Employee", filters={"name": ["in", list(employee_names)]}, fields=["name", "employee_name"]
			):
				employee_labels[e["name"]] = e.get("employee_name") or e["name"]
		assignee_counts = [
			{
				"label": employee_labels.get(r["custom_allocate_to"], r["custom_allocate_to"]) if r.get("custom_allocate_to") else "Unassigned",
				"count": r["count"],
			}
			for r in assignee_rows
		]
		assignee_counts.sort(key=lambda x: x["count"], reverse=True)

	return {
		"status_counts": status_counts,
		"priority_counts": priority_counts,
		"sprint_counts": sprint_counts,
		"project_counts": project_counts,
		"assignee_counts": assignee_counts,
		"is_all_view": _is_all_view(),
	}


def _pm_project_names(employee):
	if not employee:
		return []
	return frappe.get_all(
		"Project Manager",
		filters={"employee": employee, "parenttype": "Project", "parentfield": "custom_project_managers"},
		pluck="parent",
	)


@frappe.whitelist()
def get_unmapped_jira_assignees(page=1, page_length=20):
	"""Tasks synced from Jira whose assignee email didn't match any Employee.

	Bypass-role users (System Manager, etc.) see all such tasks; everyone else sees
	only those on projects where they're listed as a Project Manager.
	"""
	page = max(frappe.utils.cint(page), 1)
	page_length = max(frappe.utils.cint(page_length), 1)

	filters = {
		"custom_task_source": "Jira",
		"custom_allocate_to": ["is", "not set"],
		"custom_jira_assignee_email": ["is", "set"],
	}

	if not _is_all_view():
		pm_projects = _pm_project_names(_current_employee())
		if not pm_projects:
			return {"rows": [], "total": 0, "page": page, "page_length": page_length}
		filters["project"] = ["in", pm_projects]

	total = frappe.db.count("Task", filters=filters)

	rows = frappe.get_all(
		"Task",
		filters=filters,
		fields=["name", "subject", "project", "custom_jira_issue_key", "custom_jira_assignee_email"],
		order_by="modified desc",
		limit_start=(page - 1) * page_length,
		limit_page_length=page_length,
	)

	return {"rows": rows, "total": total, "page": page, "page_length": page_length}
