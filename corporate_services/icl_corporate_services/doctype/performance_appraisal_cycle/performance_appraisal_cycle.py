# Copyright (c) 2026, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

from frappe.model.document import Document
from corporate_services.api.performance_appraisal.performance_appraisal import (
	create_appraisals_for_cycle,
)


class PerformanceAppraisalCycle(Document):
	def on_submit(self):
		create_appraisals_for_cycle(self)
