# Copyright (c) 2024, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from corporate_services.api.timesheet.timesheet_generation_export import (
	DEFAULT_TEMPLATE,
	get_employee_timesheet_template,
)


class TimesheetSubmission(Document):
	def before_validate(self):
		self.cleanup_timesheet_rows_before_validation()

	def before_insert(self):
		# Keep first save in Draft; workflow actions should move state explicitly.
		self.workflow_state = "Draft"

	def before_cancel(self):
		self.delete_linked_timesheets()

	def on_trash(self):
		self.delete_linked_timesheets()

	def validate(self):
		self.set_timesheet_template()
		self.check_duplicate_submission()
		self.handle_import_clear()

	def set_timesheet_template(self):
		if self.employee:
			self.timesheet_template = get_employee_timesheet_template(self.employee)
		else:
			self.timesheet_template = DEFAULT_TEMPLATE

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

	def handle_import_clear(self):
		"""
		If the imported timesheet attachment is cleared, remove all linked
		timesheets for this submission and reset derived totals/tables.
		"""
		if self.is_new():
			return

		previous = self.get_doc_before_save()
		if not previous:
			return

		was_set = bool(previous.get("timesheet"))
		is_cleared = not bool(self.get("timesheet"))
		if not (was_set and is_cleared):
			return

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

		# Reset child table + computed totals/finance fields.
		self.set("timesheet_per_project", [])
		self.total_working_hours = 0
		self.total_billable_hours = 0
		self.salary_per_hour = 0
		self.timesheet_imported = 0

	def cleanup_timesheet_rows_before_validation(self):
		"""
		Avoid link-validation errors from stale/missing Timesheet links in child rows.
		This runs before standard validation.
		"""
		rows = list(self.get("timesheet_per_project") or [])
		if not rows:
			return

		previous = None if self.is_new() else self.get_doc_before_save()
		if previous and previous.get("timesheet") and not self.get("timesheet"):
			self.set("timesheet_per_project", [])
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
