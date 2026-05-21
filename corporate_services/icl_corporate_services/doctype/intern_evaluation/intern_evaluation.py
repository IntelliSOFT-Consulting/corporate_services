# Copyright (c) 2026, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import re

import frappe
from frappe import _
from frappe.model.document import Document


class InternEvaluation(Document):
    def validate(self):
        self.set_default_question_template()
        if not (self.answers or []):
            self.sync_template_questions()
        self.validate_required_responses()

    def before_submit(self):
        self.validate_required_responses()

    def set_default_question_template(self):
        if self.question_template:
            return

        template_name = frappe.db.get_value(
            "Intern Evaluation Template",
            {"is_active": 1},
            "name",
            order_by="modified desc",
        )
        if not template_name:
            frappe.throw(_("No active Intern Evaluation Template found. Please contact HR/System Admin."))

        self.question_template = template_name

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
            new_rows.append(
                {
                    "question": q.get("question_text"),
                    "help_text": q.get("help_text"),
                    "is_required": q.get("is_required"),
                    "response_fieldtype": q.get("response_fieldtype") or "Select",
                    "response_options": q.get("response_options") or "",
                    "rating": existing.rating if existing else None,
                    "comment": existing.comment if existing else None,
                }
            )

        self.set("answers", new_rows)

    def validate_required_responses(self):
        missing = []
        for idx, row in enumerate(self.answers or [], start=1):
            if row.is_required and not (row.rating or "").strip():
                missing.append(f"Row {idx}: {row.question}")

        if missing:
            frappe.throw(
                _("Please rate all required characteristics before saving/submitting:<br>{0}").format(
                    "<br>".join(missing)
                )
            )


@frappe.whitelist()
def get_active_template_questions(template_name=None):
    template_name = template_name or frappe.db.get_value(
        "Intern Evaluation Template",
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
                "question_text": q.get("question_text"),
                "help_text": q.get("help_text"),
                "is_required": q.get("is_required"),
                "response_fieldtype": q.get("response_fieldtype") or "Select",
                "response_options": q.get("response_options") or "",
            }
            for q in questions
        ],
    }


def _get_active_template_rows(template_name):
    return frappe.get_all(
        "Intern Evaluation Template Question",
        filters={
            "parent": template_name,
            "parenttype": "Intern Evaluation Template",
            "is_active": 1,
        },
        fields=[
            "question_text",
            "help_text",
            "is_required",
            "response_fieldtype",
            "response_options",
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
