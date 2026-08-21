# Copyright (c) 2026, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class MidProbationCheckIn(Document):
	def validate(self):
		self.set_default_question_template()
		if not (self.checklist or []):
			self.sync_template_questions()

	def before_submit(self):
		missing = [row.check_area for row in self.checklist if not row.status]
		if missing:
			frappe.throw(
				_("Please mark On Track / Concern for every check area before submitting:<br>{0}").format(
					"<br>".join(missing)
				)
			)

	def set_default_question_template(self):
		if self.question_template:
			return

		template_name = frappe.db.get_value(
			"Mid-Probation Check-In Template",
			{"is_active": 1},
			"name",
			order_by="modified desc",
		)
		if not template_name:
			frappe.throw(_("No active Mid-Probation Check-In Template found. Please contact HR/System Admin."))

		self.question_template = template_name

	def sync_template_questions(self):
		if not self.question_template:
			return

		questions = _get_active_template_rows(self.question_template)

		self.set(
			"checklist",
			[{"check_area": q.get("check_area")} for q in questions],
		)


@frappe.whitelist()
def get_active_template_questions(template_name=None):
	template_name = template_name or frappe.db.get_value(
		"Mid-Probation Check-In Template",
		{"is_active": 1},
		"name",
		order_by="modified desc",
	)

	if not template_name:
		return {"template_name": None, "questions": []}

	questions = _get_active_template_rows(template_name)
	return {
		"template_name": template_name,
		"questions": [{"check_area": q.get("check_area")} for q in questions],
	}


def _get_active_template_rows(template_name):
	return frappe.get_all(
		"Mid-Probation Check-In Template Question",
		filters={
			"parent": template_name,
			"parenttype": "Mid-Probation Check-In Template",
			"is_active": 1,
		},
		fields=["check_area", "display_order", "idx"],
		order_by="display_order asc, idx asc",
	)
