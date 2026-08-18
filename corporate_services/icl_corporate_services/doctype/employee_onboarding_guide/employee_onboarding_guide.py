# Copyright (c) 2026, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_months

STAGE_FIELD_MAP = {
	"Preboarding": "preboarding_milestones",
	"Day 1": "day_1_milestones",
	"Week 1": "week_1_milestones",
	"Month 1": "month_1_milestones",
	"Mid-probation": "mid_probation_milestones",
	"End of probation": "end_of_probation_milestones",
}


class EmployeeOnboardingGuide(Document):
	def validate(self):
		self.set_default_question_template()
		if not any(self.get(fieldname) for fieldname in STAGE_FIELD_MAP.values()):
			self.sync_template_questions()

		self.set_default_probation_end_date()

		if self.is_archived and not self.guide_archived_date:
			self.guide_archived_date = frappe.utils.nowdate()

	def set_default_question_template(self):
		if self.question_template:
			return

		template_name = frappe.db.get_value(
			"Onboarding Guide Template",
			{"is_active": 1},
			"name",
			order_by="modified desc",
		)
		if not template_name:
			frappe.throw(_("No active Onboarding Guide Template found. Please contact HR/System Admin."))

		self.question_template = template_name

	def sync_template_questions(self):
		if not self.question_template:
			return

		grouped = _get_active_template_rows_by_stage(self.question_template)
		for stage, fieldname in STAGE_FIELD_MAP.items():
			self.set(
				fieldname,
				[
					{
						"milestone": q.get("milestone"),
						"owner": q.get("owner"),
						"timing": q.get("timing"),
						"status": "🔴 Not Started",
					}
					for q in grouped.get(stage, [])
				],
			)

	def set_default_probation_end_date(self):
		if not self.probation_end_date and self.start_date:
			self.probation_end_date = add_months(self.start_date, 3)


@frappe.whitelist()
def get_active_template_questions(template_name=None):
	template_name = template_name or frappe.db.get_value(
		"Onboarding Guide Template",
		{"is_active": 1},
		"name",
		order_by="modified desc",
	)

	if not template_name:
		return {"template_name": None, "stages": {}}

	grouped = _get_active_template_rows_by_stage(template_name)
	return {
		"template_name": template_name,
		"stages": {
			stage: [
				{"milestone": q.get("milestone"), "owner": q.get("owner"), "timing": q.get("timing")}
				for q in rows
			]
			for stage, rows in grouped.items()
		},
	}


def _get_active_template_rows_by_stage(template_name):
	rows = frappe.get_all(
		"Onboarding Guide Template Question",
		filters={
			"parent": template_name,
			"parenttype": "Onboarding Guide Template",
			"is_active": 1,
		},
		fields=["stage", "milestone", "owner", "timing", "display_order", "idx"],
		order_by="display_order asc, idx asc",
	)

	grouped = {}
	for row in rows:
		grouped.setdefault(row.get("stage"), []).append(row)

	return grouped
