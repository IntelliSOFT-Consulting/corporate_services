# Copyright (c) 2026, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class HRConfig(Document):
	def validate(self):
		self.validate_monthly_reflection_reminder_day()
		self.validate_monthly_reflection_overdue_weekday()
		self.validate_weekly_progress_reminder_settings()
		self.validate_reminder_rules()

	def validate_monthly_reflection_reminder_day(self):
		if not self.enable_monthly_reflection_reminder:
			return

		day = frappe.utils.cint(self.monthly_reflection_reminder_day)
		if day < 1 or day > 7:
			frappe.throw(
				_("Monthly Reflection Reminder Day must be between 1 and 7.")
			)

	def validate_monthly_reflection_overdue_weekday(self):
		if not self.enable_monthly_reflection_overdue_reminder:
			return

		allowed = {
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
			"Sunday",
		}

		if self.monthly_reflection_overdue_weekday not in allowed:
			frappe.throw(
				_("Please select a valid Monthly Reflection Overdue Reminder Weekday.")
			)

	def validate_weekly_progress_reminder_settings(self):
		if not self.enable_weekly_progress_reminder:
			return

		allowed = {
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
			"Sunday",
		}
		if self.weekly_progress_reminder_weekday not in allowed:
			frappe.throw(_("Please select a valid Weekly Progress Reminder Weekday."))

		if not self.weekly_progress_reminder_time:
			frappe.throw(_("Please set Weekly Progress Reminder Time when reminders are enabled."))

	def validate_reminder_rules(self):
		seen = set()
		for row in self.reminder_rules or []:
			if row.sla_hours is not None and row.sla_hours <= 0:
				frappe.throw(_("Row #{0}: SLA (Hours) must be greater than 0.").format(row.idx))

			if row.allow_submitter_nudge and row.nudge_cooldown_hours is not None and row.nudge_cooldown_hours < 0:
				frappe.throw(_("Row #{0}: Nudge Cooldown (Hours) cannot be negative.").format(row.idx))

			key = (row.reference_doctype, row.pending_workflow_state)
			if key in seen:
				frappe.throw(
					_("Row #{0}: Duplicate Reminder Rule for {1} / {2}.").format(
						row.idx, row.reference_doctype, row.pending_workflow_state
					)
				)
			seen.add(key)
