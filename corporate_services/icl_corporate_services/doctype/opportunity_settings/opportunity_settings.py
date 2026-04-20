# Copyright (c) 2026, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint


class OpportunitySettings(Document):
	def validate(self):
		if cint(self.notify_on_almost_due_opportunities):
			days_before_due = cint(self.almost_due_notification_days_before)
			if days_before_due <= 0:
				frappe.throw(
					_("Set a value greater than 0 for Days Before Due when notifications are enabled.")
				)
