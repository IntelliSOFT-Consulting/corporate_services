# Copyright (c) 2024, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _

from corporate_services.api.timesheet.project_manager_approval import (
	get_approval_comment_owners,
	get_submission_project_ids,
	get_submission_timesheet_template,
	is_short_term_consultant_submission,
	validate_current_user_is_submission_project_manager,
	validate_project_manager_approval_comments,
)


class TimesheetSubmission(Document):
	def before_validate(self):
		self.set_timesheet_template()
		self.cleanup_timesheet_rows_before_validation()

	def before_insert(self):
		# Keep first save in Draft; workflow actions should move state explicitly.
		self.workflow_state = "Draft"

	def before_cancel(self):
		self.delete_linked_timesheets()

	def on_trash(self):
		self.delete_linked_timesheets()

	def validate(self):
		self.check_duplicate_submission()
		self.validate_workflow_requirements()

	def validate_workflow_requirements(self):
		previous_doc = self.get_doc_before_save()
		previous_state = previous_doc.workflow_state if previous_doc else None
		current_state = self.workflow_state

		if previous_state == current_state:
			return

		if current_state in ["Submitted to Supervisor", "Submitted to Project Manager"]:
			total_hours = float(self.total_working_hours or 0)
			if total_hours <= 0:
				frappe.throw(
					_(
						"Total Working Hours must be greater than 0 before submitting to the supervisor for {0}."
					).format(self.name)
				)

			has_generated_timesheets = bool(
				frappe.db.exists(
					"Timesheet",
					{"custom_timesheet_submission": self.name, "docstatus": ("!=", 2)},
				)
			)
			if not has_generated_timesheets:
				frappe.throw(
					_(
						"You must insert timesheet entries in the system before submitting to the supervisor for {0}."
					).format(self.name)
				)

		if current_state == "Submitted to Project Manager":
			self.validate_project_managers_configured()

		if current_state == "Submitted to Supervisor":
			self.validate_supervisor_configured()

		if (
			previous_state == "Submitted to Project Manager"
			and current_state == "Submitted to Supervisor"
			and is_short_term_consultant_submission(self)
		):
			self.validate_current_project_manager_approval_comment()

		if (
			previous_state == "Submitted to Project Manager"
			and current_state == "Draft"
			and is_short_term_consultant_submission(self)
		):
			validate_current_user_is_submission_project_manager(self)

		if (
			previous_state == "Submitted to Supervisor"
			and current_state == "Submitted to Finance"
			and is_short_term_consultant_submission(self)
		):
			validate_project_manager_approval_comments(self)

	def set_timesheet_template(self):
		if self.employee and self.meta.has_field("timesheet_template"):
			self.timesheet_template = get_submission_timesheet_template(self)

	def validate_project_managers_configured(self):
		project_ids = get_submission_project_ids(self)
		if not project_ids:
			frappe.throw(
				_("No project is linked to this submission. Add at least one project before submitting to Project Manager.")
			)

		pm_count = frappe.db.count(
			"Project Manager",
			{
				"parenttype": "Project",
				"parentfield": "custom_project_managers",
				"parent": ["in", project_ids],
			},
		)
		if pm_count <= 0:
			frappe.throw(
				_("None of the linked projects has a Project Manager configured. Please set Project Manager(s) on the linked project(s).")
			)

	def validate_supervisor_configured(self):
		employee = frappe.get_doc("Employee", self.employee)
		if not employee.reports_to:
			frappe.throw(
				_("Employee {0} does not have a Supervisor configured in Reports To.").format(self.employee_name or self.employee)
			)

	def validate_current_project_manager_approval_comment(self):
		validate_current_user_is_submission_project_manager(self)

		if frappe.session.user not in get_approval_comment_owners(self):
			frappe.throw(
				_(
					"Add a comment confirming your Project Manager approval before approving this timesheet submission."
				)
			)

	def check_duplicate_submission(self):
		existing = frappe.db.get_value(
			"Timesheet Submission",
			{
				"employee": self.employee,
				"month_year": self.month_year,
				"name": ("!=", self.name),
				"docstatus": ("!=", 2),  # exclude cancelled
			},
			"name",
		)
		if existing:
			frappe.throw(
				f"A timesheet submission for employee <b>{self.employee_name or self.employee}</b> "
				f"for <b>{self.month_year}</b> already exists: {existing}. "
				"Each employee can only have one timesheet submission per month.",
				title="Duplicate Timesheet Submission",
			)

	def cleanup_timesheet_rows_before_validation(self):
		"""
		Avoid link-validation errors from stale/missing Timesheet links in child rows.
		This runs before standard validation.
		"""
		rows = list(self.get("timesheet_per_project") or [])
		if not rows:
			return

		valid_rows = []
		for row in rows:
			ts_name = row.get("timesheet")
			if not ts_name:
				valid_rows.append(row)
				continue
			if frappe.db.exists("Timesheet", ts_name):
				valid_rows.append(row)
		self.set("timesheet_per_project", valid_rows)

	def delete_linked_timesheets(self):
		"""Cancel+delete linked timesheets for this submission."""
		linked = frappe.get_all(
			"Timesheet",
			filters={
				"custom_timesheet_submission": self.name,
				"docstatus": ["!=", 2],
			},
			fields=["name", "docstatus"],
		)

		for row in linked:
			ts = frappe.get_doc("Timesheet", row["name"])
			if ts.docstatus == 1:
				ts.cancel()
			frappe.delete_doc("Timesheet", ts.name, force=True, ignore_permissions=True)


@frappe.whitelist()
def bulk_delete_submissions(names):
	"""Bulk delete Timesheet Submissions from list action."""
	if isinstance(names, str):
		names = frappe.parse_json(names)
	names = [n for n in (names or []) if n]
	if not names:
		return {"message": "No records selected."}

	deleted = 0
	skipped = []

	for name in names:
		if not frappe.has_permission("Timesheet Submission", "delete", name):
			skipped.append(f"{name} (no delete permission)")
			continue
		try:
			doc = frappe.get_doc("Timesheet Submission", name)
			if doc.docstatus == 1:
				if not frappe.has_permission("Timesheet Submission", "cancel", name):
					skipped.append(f"{name} (no cancel permission)")
					continue
				doc.cancel()
			frappe.delete_doc("Timesheet Submission", name, ignore_permissions=True)
			deleted += 1
		except Exception as exc:
			skipped.append(f"{name} ({str(exc)})")

	msg = f"Deleted {deleted} record(s)."
	if skipped:
		msg += " Skipped: " + "; ".join(skipped[:10])
		if len(skipped) > 10:
			msg += f" ... and {len(skipped) - 10} more."
	return {"message": msg, "deleted": deleted, "skipped": skipped}


@frappe.whitelist()
def bulk_cancel_submissions(names):
	"""Bulk cancel Timesheet Submissions from list action."""
	if isinstance(names, str):
		names = frappe.parse_json(names)
	names = [n for n in (names or []) if n]
	if not names:
		return {"message": "No records selected."}

	cancelled = 0
	skipped = []

	for name in names:
		if not frappe.has_permission("Timesheet Submission", "cancel", name):
			skipped.append(f"{name} (no cancel permission)")
			continue
		try:
			doc = frappe.get_doc("Timesheet Submission", name)
			if doc.docstatus != 1:
				skipped.append(f"{name} (not submitted)")
				continue
			doc.cancel()
			cancelled += 1
		except Exception as exc:
			skipped.append(f"{name} ({str(exc)})")

	msg = f"Cancelled {cancelled} record(s)."
	if skipped:
		msg += " Skipped: " + "; ".join(skipped[:10])
		if len(skipped) > 10:
			msg += f" ... and {len(skipped) - 10} more."
	return {"message": msg, "cancelled": cancelled, "skipped": skipped}
