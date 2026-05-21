# Copyright (c) 2026, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import re
from datetime import datetime

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
                    "question": q.get("question_text"),
                    "help_text": q.get("help_text"),
                    "is_required": q.get("is_required"),
                    "response_fieldtype": q.get("response_fieldtype") or "Text Editor",
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

    questions = _get_active_template_rows(template_name)
    return {
        "template_name": template_name,
        "questions": [
            {
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
        "Monthly Reflection Template Question",
        filters={
            "parent": template_name,
            "parenttype": "Monthly Reflection Template",
            "is_active": 1,
        },
        fields=["question_text", "help_text", "is_required", "response_fieldtype", "display_order", "idx"],
        order_by="display_order asc, idx asc",
    )


def _strip_number_prefix(text):
    return re.sub(r"^\s*\d+\.\s*", "", (text or "")).strip()


def _normalize_question_key(text):
    key = _strip_number_prefix(text).strip().lower()
    key = re.sub(r"\s+", " ", key)
    key = re.sub(r"[\[\]\(\):;,.]", "", key)
    return key


@frappe.whitelist()
def get_monthly_reflection_dashboard_data(review_period=None):
    selected_review_period = (review_period or _default_review_period()).strip()

    employees = _get_active_employees()
    submitted_map = _get_submitted_map(selected_review_period)

    submitted_rows = []
    missing_rows = []

    for emp in employees:
        reflection = submitted_map.get(emp["name"])
        row = {
            "employee": emp["name"],
            "employee_name": emp.get("employee_name"),
            "department": emp.get("department"),
            "designation": emp.get("designation"),
            "supervisor": emp.get("custom_reports_to_name"),
            "review_period": selected_review_period,
            "reflection_name": reflection["name"] if reflection else None,
            "submitted_on": str(reflection["creation"]) if reflection else None,
            "workflow_state": reflection.get("workflow_state") if reflection else None,
        }
        if reflection:
            submitted_rows.append(row)
        else:
            missing_rows.append(row)

    return {
        "review_period": selected_review_period,
        "summary": {
            "total_active_staff": len(employees),
            "submitted_count": len(submitted_rows),
            "missing_count": len(missing_rows),
        },
        "submitted_rows": submitted_rows,
        "missing_rows": missing_rows,
    }


@frappe.whitelist()
def get_monthly_reflection_review_period_options(year=None):
    target_year = int(year) if year else datetime.now().year
    months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ]
    return [f"{month} {target_year}" for month in months]


def _default_review_period():
    return datetime.now().strftime("%B %Y")


def _get_active_employees():
    return frappe.get_all(
        "Employee",
        filters={"status": "Active"},
        fields=[
            "name",
            "employee_name",
            "department",
            "designation",
            "custom_reports_to_name",
        ],
        limit_page_length=1000,
        order_by="employee_name asc",
    )


def _get_submitted_map(review_period):
    rows = frappe.get_all(
        "Monthly Reflection",
        filters={
            "review_period": review_period,
            "docstatus": ["!=", 2],
        },
        fields=["name", "employee", "creation", "workflow_state"],
        order_by="creation desc",
        limit_page_length=10000,
    )

    out = {}
    for row in rows:
        employee = row.get("employee")
        if employee and employee not in out:
            out[employee] = row
    return out
