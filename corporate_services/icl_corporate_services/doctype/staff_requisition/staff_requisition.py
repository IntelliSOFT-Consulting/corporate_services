# Copyright (c) 2026, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class StaffRequisition(Document):
	def validate(self):
		self._validate_rejection_reason()
		self._validate_clarification_response()

	def _validate_rejection_reason(self):
		workflow_state = (self.workflow_state or "").lower()
		status = (self.status or "").upper()
		is_rejected = "rejected" in workflow_state or status == "REJECTED"

		if is_rejected and not (self.rejection_reason or "").strip():
			frappe.throw("Rejection Reason is mandatory when rejecting this requisition.")

	def _validate_clarification_response(self):
		# Require a response when resubmitting to HR from Needs Clarification.
		if self.workflow_state != "Submitted to HR":
			return

		previous_doc = self.get_doc_before_save()
		if not previous_doc:
			return

		if previous_doc.workflow_state == "Needs Clarification" and not (self.clarification_response or "").strip():
			frappe.throw("Please provide Clarification Response before submitting to HR.")
