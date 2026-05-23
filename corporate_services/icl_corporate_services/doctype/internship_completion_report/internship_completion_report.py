import re

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate


class InternshipCompletionReport(Document):
    def validate(self):
        self.set_default_question_template()
        self.validate_internship_dates()
        if not (self.answers or []):
            self.sync_template_questions()
        self.validate_required_responses()

    def before_submit(self):
        self.validate_required_responses()

    def sync_template_questions(self):
        if not self.question_template:
            return

        existing_by_question = {}
        for row in (self.answers or []):
            q = (row.question or "").strip()
            if not q:
                continue
            existing_by_question[_normalize_question_key(q)] = row
            existing_by_question[_normalize_question_key(_strip_number_prefix(q))] = row

        new_rows = []
        active_questions = _get_active_template_rows(self.question_template)
        for q in active_questions:
            existing = existing_by_question.get(_normalize_question_key(q.get("question_text")))
            response = existing.response if existing else None
            new_rows.append(
                {
                    "section_title": q.get("section_title"),
                    "question": q.get("question_text"),
                    "help_text": q.get("help_text"),
                    "is_required": q.get("is_required"),
                    "response_fieldtype": q.get("response_fieldtype") or "Text Editor",
                    "response": response,
                }
            )

        self.set("answers", new_rows)

    def set_default_question_template(self):
        if self.question_template:
            return

        template_name = frappe.db.get_value(
            "Internship Completion Report Template",
            {"is_active": 1},
            "name",
            order_by="modified desc",
        )
        if not template_name:
            frappe.throw(_("No active Internship Completion Report Template found. Please contact HR/System Admin."))

        self.question_template = template_name

    def validate_required_responses(self):
        missing = []
        for idx, row in enumerate(self.answers or [], start=1):
            if row.is_required and not (row.response or "").strip():
                missing.append(f"Row {idx}: {row.question}")

        if missing:
            frappe.throw(
                _("Please answer all required questions before saving/submitting:<br>{0}").format(
                    "<br>".join(missing)
                )
            )

    def validate_internship_dates(self):
        if not self.internship_start_date or not self.internship_end_date:
            return

        internship_start = getdate(self.internship_start_date)
        internship_end = getdate(self.internship_end_date)

        if internship_end < internship_start:
            frappe.throw(_("Internship End Date cannot be earlier than Internship Start Date."))


@frappe.whitelist()
def get_active_template_questions(template_name=None):
    template_name = template_name or frappe.db.get_value(
        "Internship Completion Report Template",
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
            {
                "section_title": q.get("section_title"),
                "question_text": q.get("question_text"),
                "help_text": q.get("help_text"),
                "is_required": q.get("is_required"),
                "response_fieldtype": q.get("response_fieldtype") or "Text Editor",
            }
            for q in questions
        ],
    }


def _get_active_template_rows(template_name):
    return frappe.get_all(
        "Internship Completion Report Template Question",
        filters={
            "parent": template_name,
            "parenttype": "Internship Completion Report Template",
            "is_active": 1,
        },
        fields=[
            "section_title",
            "question_text",
            "help_text",
            "is_required",
            "response_fieldtype",
            "display_order",
            "idx",
        ],
        order_by="display_order asc, idx asc",
    )


def _strip_number_prefix(text):
    return re.sub(r"^\s*\d+\.\s*", "", (text or "")).strip()


def _normalize_question_key(text):
    key = _strip_number_prefix(text).strip().lower()
    key = re.sub(r"\s+", " ", key)
    key = re.sub(r"[\[\]\(\):;,.]", "", key)
    return key
