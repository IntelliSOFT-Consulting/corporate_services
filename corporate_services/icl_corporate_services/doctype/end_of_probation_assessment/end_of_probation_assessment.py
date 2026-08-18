# Copyright (c) 2026, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_months

SCORE_BANDS = [
	(40, 50, "Meets / exceeds probation standard", "Confirmed"),
	(30, 39, "Meets minimum standard but requires structured follow-up", "Confirmed with Development Plan"),
	(0, 29, "Does not meet probation confirmation standard", "Not Confirmed"),
]
MAX_SCORE = 50


class EndofProbationAssessment(Document):
	def validate(self):
		self.set_default_question_template()
		if not (self.ratings or []):
			self.sync_template_questions()

		self.set_default_probation_dates()
		self.calculate_score()

		if self.workflow_state and self.workflow_state != "Draft":
			self.validate_ratings_complete()

	def set_default_question_template(self):
		if self.question_template:
			return

		template_name = frappe.db.get_value(
			"Probation Assessment Template",
			{"is_active": 1},
			"name",
			order_by="modified desc",
		)
		if not template_name:
			frappe.throw(_("No active Probation Assessment Template found. Please contact HR/System Admin."))

		self.question_template = template_name

	def sync_template_questions(self):
		if not self.question_template:
			return

		questions = _get_active_template_rows(self.question_template)

		self.set(
			"ratings",
			[
				{"assessment_area": q.get("assessment_area"), "guidance": q.get("guidance")}
				for q in questions
			],
		)

	def set_default_probation_dates(self):
		if not self.probation_start_date and self.date_of_employment:
			self.probation_start_date = self.date_of_employment

		if not self.probation_end_date and self.probation_start_date:
			self.probation_end_date = add_months(self.probation_start_date, 3)

	def calculate_score(self):
		scored_rows = [int(row.rating) for row in self.ratings if row.rating]
		self.total_score = sum(scored_rows)
		self.percentage = (self.total_score / MAX_SCORE) * 100 if MAX_SCORE else 0

		self.probation_result = ""
		self.recommended_outcome = ""
		for low, high, result_label, outcome_label in SCORE_BANDS:
			if low <= self.total_score <= high:
				self.probation_result = result_label
				self.recommended_outcome = outcome_label
				break

	def validate_ratings_complete(self):
		missing = [row.assessment_area for row in self.ratings if not row.rating]
		if missing:
			frappe.throw(
				_("Please rate every assessment area before submitting:<br>{0}").format("<br>".join(missing))
			)
		if not self.supervisor_recommendation:
			frappe.throw(_("Please set the Supervisor Recommendation before submitting."))


@frappe.whitelist()
def get_active_template_questions(template_name=None):
	template_name = template_name or frappe.db.get_value(
		"Probation Assessment Template",
		{"is_active": 1},
		"name",
		order_by="modified desc",
	)

	if not template_name:
		return {"template_name": None, "questions": []}

	questions = _get_active_template_rows(template_name)
	return {
		"template_name": template_name,
		"questions": [
			{"assessment_area": q.get("assessment_area"), "guidance": q.get("guidance")} for q in questions
		],
	}


def _get_active_template_rows(template_name):
	return frappe.get_all(
		"Probation Assessment Template Question",
		filters={
			"parent": template_name,
			"parenttype": "Probation Assessment Template",
			"is_active": 1,
		},
		fields=["assessment_area", "guidance", "display_order", "idx"],
		order_by="display_order asc, idx asc",
	)
