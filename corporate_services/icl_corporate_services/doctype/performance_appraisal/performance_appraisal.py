# Copyright (c) 2026, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

from frappe.model.document import Document
from corporate_services.api.performance_appraisal.performance_appraisal import grade_appraisal


class PerformanceAppraisal(Document):
	def validate(self):
		grade_appraisal(self)
