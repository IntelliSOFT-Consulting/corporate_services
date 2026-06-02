import frappe


def sync_timesheet_submission_project_name(doc, method=None):
	"""Keep copied project names in Timesheet Submission rows current."""
	project_name = doc.project_name or doc.name

	rows = frappe.get_all(
		"Timesheet Submission List",
		filters={"project": doc.name},
		fields=["name", "project_name"],
	)

	for row in rows:
		if row.project_name == project_name:
			continue

		frappe.db.set_value(
			"Timesheet Submission List",
			row.name,
			"project_name",
			project_name,
			update_modified=False,
		)


@frappe.whitelist()
def sync_all_timesheet_submission_project_names():
	"""Backfill copied project names for existing Timesheet Submission rows."""
	rows = frappe.get_all(
		"Timesheet Submission List",
		filters={"project": ["is", "set"]},
		fields=["name", "project", "project_name"],
	)
	project_ids = list({row.project for row in rows if row.project})
	if not project_ids:
		return {"updated": 0}

	project_names = {
		project.name: project.project_name or project.name
		for project in frappe.get_all(
			"Project",
			filters={"name": ["in", project_ids]},
			fields=["name", "project_name"],
		)
	}

	updated = 0
	for row in rows:
		project_name = project_names.get(row.project)
		if not project_name or row.project_name == project_name:
			continue

		frappe.db.set_value(
			"Timesheet Submission List",
			row.name,
			"project_name",
			project_name,
			update_modified=False,
		)
		updated += 1

	return {"updated": updated}
