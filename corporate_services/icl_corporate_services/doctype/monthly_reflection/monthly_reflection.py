# Copyright (c) 2026, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import re

import frappe
from frappe import _
from frappe.model.document import Document

REVIEW_PERIOD_PATTERN = re.compile(
    r"^(January|February|March|April|May|June|July|August|September|October|November|December)\s\d{4}$"
)


class MonthlyReflection(Document):
    def validate(self):
        self.set_default_question_template()
        self.validate_review_period()
        self.validate_unique_employee_review_period()
        if not (self.answers or []):
            self.sync_template_questions()
        self.validate_required_responses()

    def before_submit(self):
        self.validate_required_responses()

    def set_default_question_template(self):
        if self.question_template:
            return

        template_name = frappe.db.get_value(
            "Monthly Reflection Template",
            {"is_active": 1},
            "name",
            order_by="modified desc",
        )
        if not template_name:
            frappe.throw(_("No active Monthly Reflection Template found. Please contact HR/System Admin."))

        self.question_template = template_name

    def sync_template_questions(self):
        if not self.question_template:
            return

        template = frappe.get_doc("Monthly Reflection Template", self.question_template)
        existing_by_question = {}
        for row in (self.answers or []):
            q = (row.question or "").strip()
            if not q:
                continue
            existing_by_question[_normalize_question_key(q)] = row
            existing_by_question[_normalize_question_key(_strip_number_prefix(q))] = row

        new_rows = []
        active_questions = sorted(
            [q for q in (template.questions or []) if q.is_active],
            key=lambda x: (x.display_order or 0, x.idx or 0),
        )

        for q in active_questions:
            existing = existing_by_question.get(_normalize_question_key(q.question_text))
            response = existing.response if existing else None
            new_rows.append(
                {
                    "question": q.question_text,
                    "help_text": q.help_text,
                    "is_required": q.is_required,
                    "response_fieldtype": q.response_fieldtype or "Text Editor",
                    "response": response,
                }
            )

        self.set("answers", new_rows)

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

    def validate_review_period(self):
        if not self.review_period:
            return

        if not REVIEW_PERIOD_PATTERN.fullmatch(self.review_period.strip()):
            frappe.throw(_("Review Period must be selected in the format 'March 2026'."))

    def validate_unique_employee_review_period(self):
        if not self.employee or not self.review_period:
            return

        existing = frappe.db.exists(
            "Monthly Reflection",
            {
                "employee": self.employee,
                "review_period": self.review_period,
                "name": ["!=", self.name],
            },
        )

        if existing:
            frappe.throw(
                _("Employee {0} already has a Monthly Reflection for review period {1}: {2}").format(
                    self.employee, self.review_period, existing
                )
            )


@frappe.whitelist()
def get_active_template_questions(template_name=None):
    template_name = template_name or frappe.db.get_value(
        "Monthly Reflection Template",
        {"is_active": 1},
        "name",
        order_by="modified desc",
    )

    if not template_name:
        return {"template_name": None, "questions": []}

    template = frappe.get_doc("Monthly Reflection Template", template_name)
    questions = sorted(
        [q for q in (template.questions or []) if q.is_active],
        key=lambda x: (x.display_order or 0, x.idx or 0),
    )
    return {
        "template_name": template_name,
        "questions": [
            {
                "question_text": q.question_text,
                "help_text": q.help_text,
                "is_required": q.is_required,
                "response_fieldtype": q.response_fieldtype or "Text Editor",
            }
            for q in questions
        ],
    }


def _strip_number_prefix(text):
    return re.sub(r"^\s*\d+\.\s*", "", (text or "")).strip()


def _normalize_question_key(text):
    key = _strip_number_prefix(text).strip().lower()
    key = re.sub(r"\s+", " ", key)
    key = re.sub(r"[\[\]\(\):;,.]", "", key)
    return key
