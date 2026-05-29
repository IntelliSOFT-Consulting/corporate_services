import frappe
from frappe import _
from frappe.utils import strip_html

DEFAULT_TEMPLATE = "Default"
SHORT_TERM_CONSULTANT_TEMPLATE = "Short Term Consultant"


def get_employee_timesheet_template(employee):
	contract_type = frappe.db.get_value("Employee", employee, "custom_contract_type")
	if not contract_type:
		return DEFAULT_TEMPLATE

	return (
		frappe.db.get_value("Contract Type", contract_type, "timesheet_template")
		or DEFAULT_TEMPLATE
	)


def get_submission_timesheet_template(doc):
	if getattr(doc, "employee", None):
		return get_employee_timesheet_template(doc.employee)

	return getattr(doc, "timesheet_template", None) or DEFAULT_TEMPLATE


def is_short_term_consultant_submission(doc):
	return get_submission_timesheet_template(doc) == SHORT_TERM_CONSULTANT_TEMPLATE


@frappe.whitelist()
def sync_all_submission_timesheet_templates():
	updated = 0
	submissions = frappe.get_all(
		"Timesheet Submission",
		filters={"docstatus": ["!=", 2]},
		fields=["name", "employee", "timesheet_template"],
	)

	for submission in submissions:
		template = get_employee_timesheet_template(submission.employee)
		if submission.timesheet_template == template:
			continue

		frappe.db.set_value(
			"Timesheet Submission",
			submission.name,
			"timesheet_template",
			template,
			update_modified=False,
		)
		updated += 1

	return {"updated": updated}


def get_submission_project_ids(doc):
	return list(
		dict.fromkeys(
			row.project
			for row in (doc.get("timesheet_per_project") or [])
			if getattr(row, "project", None)
		)
	)


def get_project_pm_user_map(project_ids):
	if not project_ids:
		return {}

	pm_rows = frappe.get_all(
		"Project Manager",
		filters={
			"parenttype": "Project",
			"parentfield": "custom_project_managers",
			"parent": ["in", project_ids],
		},
		fields=["parent", "employee", "employee_name"],
	)
	if not pm_rows:
		return {}

	employee_ids = list({row.employee for row in pm_rows if row.employee})
	employee_user_map = {}
	if employee_ids:
		for employee in frappe.get_all(
			"Employee",
			filters={"name": ["in", employee_ids]},
			fields=["name", "employee_name", "user_id"],
		):
			employee_user_map[employee.name] = employee

	project_name_map = {
		project.name: project.project_name or project.name
		for project in frappe.get_all(
			"Project",
			filters={"name": ["in", project_ids]},
			fields=["name", "project_name"],
		)
	}

	pm_by_project = {}
	for row in pm_rows:
		employee = employee_user_map.get(row.employee)
		user_id = employee.user_id if employee else None
		if not user_id:
			continue

		pm_by_project.setdefault(
			row.parent,
			{
				"project_name": project_name_map.get(row.parent, row.parent),
				"project_managers": [],
			},
		)
		pm_by_project[row.parent]["project_managers"].append(
			frappe._dict(
				employee=row.employee,
				employee_name=(employee.employee_name if employee else None)
				or row.employee_name
				or row.employee,
				user_id=user_id,
			)
		)

	return pm_by_project


def get_approval_comment_owners(doc):
	comments = frappe.get_all(
		"Comment",
		filters={
			"reference_doctype": doc.doctype,
			"reference_name": doc.name,
			"comment_type": "Comment",
		},
		fields=["owner", "content"],
	)

	approved_by = set()
	for comment in comments:
		content = strip_html(comment.content or "").lower()
		if "approv" in content:
			approved_by.add(comment.owner)

	return approved_by


def validate_project_manager_approval_comments(doc):
	project_ids = get_submission_project_ids(doc)
	pm_by_project = get_project_pm_user_map(project_ids)
	approved_by = get_approval_comment_owners(doc)

	missing_projects = []
	for project_id in project_ids:
		project_info = pm_by_project.get(project_id)
		if not project_info or not project_info["project_managers"]:
			missing_projects.append(project_id)
			continue

		if not any(pm.user_id in approved_by for pm in project_info["project_managers"]):
			missing_projects.append(project_info["project_name"])

	if missing_projects:
		frappe.throw(
			_(
				"Project Manager approval comments are required before the supervisor can approve this short-term consultant timesheet. Missing approval comment for: {0}."
			).format(", ".join(missing_projects))
		)


def validate_current_user_is_submission_project_manager(doc):
	project_ids = get_submission_project_ids(doc)
	pm_by_project = get_project_pm_user_map(project_ids)
	pm_users = {
		pm.user_id
		for project_info in pm_by_project.values()
		for pm in project_info["project_managers"]
	}

	if frappe.session.user not in pm_users:
		frappe.throw(_("Only a Project Manager assigned to one of the linked projects can act on this submission."))
