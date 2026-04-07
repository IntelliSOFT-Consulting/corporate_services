# Copyright (c) 2024, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class TimesheetSubmission(Document):
	def validate(self):
		self.check_duplicate_submission()

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
