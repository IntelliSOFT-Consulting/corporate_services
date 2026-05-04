# Copyright (c) 2026, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint


class OnboardingSchedule(Document):
	def before_insert(self):
		self._sync_from_job_applicant()

	def validate(self):
		if self.is_new():
			self._sync_from_job_applicant()
		self._validate_single_schedule_per_employee()

	def _sync_from_job_applicant(self):
		if not self.employee:
			return

		job_applicant = self.job_applicant or frappe.db.get_value(
			"Employee", self.employee, "job_applicant"
		)
		if not job_applicant:
			return

		self.job_applicant = job_applicant

		ja = frappe.get_doc("Job Applicant", job_applicant)

		if cint(ja.get("custom_contract_signed")) or cint(ja.get("custom_nda_signed")):
			self.send_contract_nda = 1

		if cint(ja.get("custom_background_reference_check_completed")):
			self.conduct_background_checks_if_applicable = 1

	def _validate_single_schedule_per_employee(self):
		if not self.employee:
			return

		existing = frappe.db.exists(
			"Onboarding Schedule",
			{
				"employee": self.employee,
				"name": ["!=", self.name],
			},
		)

		if existing:
			frappe.throw(
				_("Employee {0} already has an Onboarding Schedule: {1}").format(
					self.employee, existing
				)
			)
