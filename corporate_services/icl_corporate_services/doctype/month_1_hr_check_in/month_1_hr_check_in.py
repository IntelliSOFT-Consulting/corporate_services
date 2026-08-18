# Copyright (c) 2026, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class Month1HRCheckIn(Document):
	def validate(self):
		self.set_default_question_template()
		if not (self.first_month_conversation or []):
			self.sync_template_questions()

	def set_default_question_template(self):
		if self.question_template:
			return

		template_name = frappe.db.get_value(
			"Month 1 Check-In Template",
			{"is_active": 1},
			"name",
			order_by="modified desc",
		)
		if not template_name:
			frappe.throw(_("No active Month 1 Check-In Template found. Please contact HR/System Admin."))

		self.question_template = template_name

	def sync_template_questions(self):
		if not self.question_template:
			return

		questions = _get_active_template_rows(self.question_template)

		self.set(
			"first_month_conversation",
			[
				{
					"area": q.get("area"),
					"conversation_prompt": q.get("conversation_prompt"),
				}
				for q in questions
			],
		)


@frappe.whitelist()
def get_active_template_questions(template_name=None):
	template_name = template_name or frappe.db.get_value(
		"Month 1 Check-In Template",
		{"is_active": 1},
		"name",
		order_by="modified desc",
	)

	if not template_name:
		return {"template_name": None, "questions": []}

	questions = _get_active_template_rows(template_name)
	return {
		"template_name": template_name,
		"questions": [{"area": q.get("area"), "conversation_prompt": q.get("conversation_prompt")} for q in questions],
	}


def _get_active_template_rows(template_name):
	return frappe.get_all(
		"Month 1 Check-In Template Question",
		filters={
			"parent": template_name,
			"parenttype": "Month 1 Check-In Template",
			"is_active": 1,
		},
		fields=["area", "conversation_prompt", "display_order", "idx"],
		order_by="display_order asc, idx asc",
	)
