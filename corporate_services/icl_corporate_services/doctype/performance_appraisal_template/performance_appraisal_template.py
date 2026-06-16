# Copyright (c) 2026, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class PerformanceAppraisalTemplate(Document):
	def validate(self):
		if self.is_active:
			# Only one active template at a time
			frappe.db.set_value(
				"Performance Appraisal Template",
				{"name": ["!=", self.name], "is_active": 1},
				"is_active",
				0,
			)
