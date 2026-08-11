import frappe
from frappe import _
from frappe.utils import add_days, get_url, get_url_to_form, getdate

from corporate_services.api.notification.project.common import notify
from corporate_services.api.project import (
	get_last_report_date,
	get_project_manager_users,
	get_report_frequency_days,
)


def _active_projects(extra_fields=None):
	fields = ["name", "project_name", "creation"] + (extra_fields or [])
	return frappe.get_all("Project", filters={"status": "Open"}, fields=fields)


@frappe.whitelist()
def send_status_report_reminders():
	tomorrow = add_days(getdate(), 1)

	for project in _active_projects(["custom_project_report_frequency"]):
		freq_days = get_report_frequency_days(project.get("custom_project_report_frequency"))
		if not freq_days:
			continue

		last = get_last_report_date(project["name"])
		baseline = getdate(last) if last else getdate(project["creation"])
		if add_days(baseline, freq_days) != tomorrow:
			continue

		pm_users = get_project_manager_users(project["name"])
		if not pm_users:
			continue

		title = project.get("project_name") or project["name"]
		url = f"{get_url()}/app/project-update/new?project={project['name']}"
		subject = _("Status report due tomorrow for {0}").format(title)
		message = _(
			"A status report for <strong>{0}</strong> is due tomorrow.<br><br>"
			"<a href=\"{1}\">Create the report</a>."
		).format(title, url)
		notify(pm_users, subject, message, "Project", project["name"])


@frappe.whitelist()
def send_milestone_alerts():
	today = getdate()
	tasks = frappe.get_all(
		"Task",
		filters={
			"is_milestone": 1,
			"project": ["is", "set"],
			"exp_end_date": ["is", "set"],
			"status": ["not in", ["Completed", "Cancelled"]],
		},
		fields=["name", "subject", "project", "exp_end_date", "custom_last_milestone_alert_date"],
	)

	for task in tasks:
		due = getdate(task["exp_end_date"])
		days_to_due = (due - today).days
		last_alert = task.get("custom_last_milestone_alert_date")

		if days_to_due in (3, 1):
			should_notify = last_alert != today
		elif days_to_due < 0:
			should_notify = not last_alert or (today - getdate(last_alert)).days >= 2
		else:
			should_notify = False

		if not should_notify:
			continue

		pm_users = get_project_manager_users(task["project"])
		if not pm_users:
			continue

		project_title = frappe.db.get_value("Project", task["project"], "project_name") or task["project"]
		task_title = task.get("subject") or task["name"]
		url = get_url_to_form("Task", task["name"])

		if days_to_due < 0:
			subject = _("Milestone overdue: {0}").format(task_title)
			message = _(
				"Milestone <strong>{0}</strong> on {1} is {2} day(s) overdue.<br><br>"
				"<a href=\"{3}\">View task</a>."
			).format(task_title, project_title, abs(days_to_due), url)
		else:
			subject = _("Milestone due in {0} day(s): {1}").format(days_to_due, task_title)
			message = _(
				"Milestone <strong>{0}</strong> on {1} is due in {2} day(s).<br><br>"
				"<a href=\"{3}\">View task</a>."
			).format(task_title, project_title, days_to_due, url)

		notify(pm_users, subject, message, "Task", task["name"])
		frappe.db.set_value("Task", task["name"], "custom_last_milestone_alert_date", today, update_modified=False)

	frappe.db.commit()


def _render_digest_html(projects, milestones, overdue_tasks, high_risks, action_points, today, week_end):
	def _list_or_none(items, render):
		if not items:
			return "<p><em>None.</em></p>"
		return "<ul>" + "".join(f"<li>{render(i)}</li>" for i in items) + "</ul>"

	html = [f"<h3>Your Weekly PM Digest &ndash; {today.strftime('%d %b %Y')}</h3>"]

	html.append("<h4>Active Projects</h4>")
	html.append(
		_list_or_none(
			projects,
			lambda p: f"{p.get('project_name') or p['name']} &ndash; {p.get('status') or '-'}",
		)
	)

	html.append(f"<h4>Milestones Due This Week ({today} &ndash; {week_end})</h4>")
	html.append(
		_list_or_none(
			milestones,
			lambda m: f"{m.get('subject') or m['name']} &ndash; due {m.get('exp_end_date')}",
		)
	)

	html.append("<h4>Overdue Items</h4>")
	html.append(
		_list_or_none(
			overdue_tasks,
			lambda t: f"{t.get('subject') or t['name']} &ndash; was due {t.get('exp_end_date')}",
		)
	)

	html.append("<h4>Open High-Impact Risks</h4>")
	html.append(_list_or_none(high_risks, lambda r: r.get("risk") or "-"))

	html.append("<h4>Recent Meeting Action Points (last 7 days)</h4>")
	html.append(_list_or_none(action_points, lambda a: a.get("action_points") or "-"))

	return "".join(html)


@frappe.whitelist()
def send_weekly_pm_digest():
	today = getdate()
	week_end = add_days(today, 7)

	pm_projects = {}
	for project in _active_projects(["status"]):
		for pm_user in get_project_manager_users(project["name"]):
			pm_projects.setdefault(pm_user, []).append(project)

	for pm_user, projects in pm_projects.items():
		project_names = [p["name"] for p in projects]

		milestones = frappe.get_all(
			"Task",
			filters={
				"project": ["in", project_names],
				"is_milestone": 1,
				"status": ["not in", ["Completed", "Cancelled"]],
				"exp_end_date": ["between", [today, week_end]],
			},
			fields=["name", "subject", "exp_end_date"],
		)

		overdue_tasks = frappe.get_all(
			"Task",
			filters={
				"project": ["in", project_names],
				"status": ["not in", ["Completed", "Cancelled"]],
				"exp_end_date": ["<", today],
			},
			fields=["name", "subject", "exp_end_date"],
		)

		assessment_names = frappe.get_all(
			"Project Risk Assessment", filters={"project": ["in", project_names]}, pluck="name"
		)
		high_risks = []
		if assessment_names:
			high_risks = frappe.get_all(
				"Risk Assessment List",
				filters={
					"parent": ["in", assessment_names],
					"risk_impact": "High",
					"status": ["not in", ["Mitigated", "Closed"]],
				},
				fields=["risk"],
			)

		meeting_names = frappe.get_all(
			"Project Meeting Minutes",
			filters={"project": ["in", project_names], "meeting_date": [">=", add_days(today, -7)]},
			pluck="name",
		)
		action_points = []
		if meeting_names:
			action_points = frappe.get_all(
				"Project Meeting Agenda",
				filters={"parent": ["in", meeting_names], "action_points": ["is", "set"]},
				fields=["agenda", "action_points"],
			)

		message = _render_digest_html(
			projects, milestones, overdue_tasks, high_risks, action_points, today, week_end
		)
		subject = _("Your Weekly PM Digest - {0}").format(today.strftime("%d %b %Y"))
		notify([pm_user], subject, message)


def _render_my_tasks_digest_html(due_soon, overdue, today, week_end):
	def _list_or_none(items, render):
		if not items:
			return "<p><em>None.</em></p>"
		return "<ul>" + "".join(f"<li>{render(i)}</li>" for i in items) + "</ul>"

	def _render_task(t):
		title = t.get("subject") or t["name"]
		project_title = t.get("project_name") or t.get("project") or "-"
		jira = f" ({t['custom_jira_issue_key']})" if t.get("custom_jira_issue_key") else ""
		return f"{title}{jira} &ndash; {project_title}, due {t.get('exp_end_date')}"

	html = [f"<h3>Your Tasks Due Soon &ndash; {today.strftime('%d %b %Y')}</h3>"]
	html.append(f"<h4>Overdue</h4>")
	html.append(_list_or_none(overdue, _render_task))
	html.append(f"<h4>Due This Week ({today} &ndash; {week_end})</h4>")
	html.append(_list_or_none(due_soon, _render_task))

	return "".join(html)


@frappe.whitelist()
def send_my_tasks_due_soon_digest():
	"""Daily per-developer digest of their overdue and soon-due tasks (ERPNext + Jira-synced)."""
	today = getdate()
	week_end = add_days(today, 7)

	tasks = frappe.get_all(
		"Task",
		filters={
			"custom_allocate_to": ["is", "set"],
			"status": ["not in", ["Completed", "Cancelled"]],
			"exp_end_date": ["<", week_end],
		},
		fields=["name", "subject", "project", "exp_end_date", "custom_allocate_to", "custom_jira_issue_key"],
	)
	if not tasks:
		return

	project_names = {t["project"] for t in tasks if t.get("project")}
	project_labels = {}
	if project_names:
		for p in frappe.get_all("Project", filters={"name": ["in", list(project_names)]}, fields=["name", "project_name"]):
			project_labels[p["name"]] = p.get("project_name") or p["name"]
	for t in tasks:
		t["project_name"] = project_labels.get(t.get("project"))

	employee_names = {t["custom_allocate_to"] for t in tasks}
	employee_users = {
		e["name"]: e["user_id"]
		for e in frappe.get_all("Employee", filters={"name": ["in", list(employee_names)]}, fields=["name", "user_id"])
		if e.get("user_id")
	}

	tasks_by_employee = {}
	for t in tasks:
		tasks_by_employee.setdefault(t["custom_allocate_to"], []).append(t)

	for employee, employee_tasks in tasks_by_employee.items():
		user = employee_users.get(employee)
		if not user:
			continue

		overdue = [t for t in employee_tasks if getdate(t["exp_end_date"]) < today]
		due_soon = [t for t in employee_tasks if getdate(t["exp_end_date"]) >= today]

		message = _render_my_tasks_digest_html(due_soon, overdue, today, week_end)
		subject = _("Your Tasks Due Soon - {0}").format(today.strftime("%d %b %Y"))
		notify([user], subject, message)


@frappe.whitelist()
def send_overdue_invoice_escalations():
	today = getdate()
	invoices = frappe.get_all(
		"Sales Invoice",
		filters={
			"docstatus": 1,
			"outstanding_amount": [">", 0],
			"project": ["is", "set"],
			"due_date": ["<", today],
		},
		fields=["name", "project", "customer", "due_date", "outstanding_amount"],
	)
	if not invoices:
		return

	finance_contact = frappe.db.get_single_value("Project Management Settings", "finance_escalation_contact")
	finance_role_users = frappe.get_all("Has Role", filters={"role": "Finance"}, pluck="parent")
	ceo_users = frappe.get_all("Has Role", filters={"role": "CEO"}, pluck="parent")

	for invoice in invoices:
		days_overdue = (today - getdate(invoice["due_date"])).days
		if days_overdue < 7:
			continue

		pm_users = get_project_manager_users(invoice["project"])
		project_title = frappe.db.get_value("Project", invoice["project"], "project_name") or invoice["project"]
		url = get_url_to_form("Sales Invoice", invoice["name"])

		if days_overdue >= 45:
			subject = _("Invoice {0} is {1} days overdue - escalation").format(invoice["name"], days_overdue)
			message = _(
				"Invoice <strong>{0}</strong> for {1} ({2}) is {3} days overdue "
				"(outstanding: {4}).<br><br>"
				"<a href=\"{5}\">View invoice</a> and update the project's expected payment dates if needed."
			).format(
				invoice["name"],
				project_title,
				invoice.get("customer") or "-",
				days_overdue,
				invoice["outstanding_amount"],
				url,
			)
			notify(list(set(ceo_users + pm_users)), subject, message, "Sales Invoice", invoice["name"])
		else:
			subject = _("Invoice {0} is {1} days overdue").format(invoice["name"], days_overdue)
			message = _(
				"Invoice <strong>{0}</strong> for {1} ({2}) is {3} days overdue "
				"(outstanding: {4}).<br><br><a href=\"{5}\">View invoice</a>."
			).format(
				invoice["name"],
				project_title,
				invoice.get("customer") or "-",
				days_overdue,
				invoice["outstanding_amount"],
				url,
			)
			recipients = set(pm_users) | set(finance_role_users)
			if finance_contact:
				recipients.add(finance_contact)
			notify(list(recipients), subject, message, "Sales Invoice", invoice["name"])
