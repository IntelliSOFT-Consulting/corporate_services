# Copyright (c) 2026, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate
import re


class WeeklyProgressReport(Document):
    def validate(self):
        self.set_default_question_template()
        self.validate_week_window()
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
            "Weekly Report Template",
            {"is_active": 1},
            "name",
            order_by="modified desc",
        )
        if not template_name:
            frappe.throw(_("No active Weekly Report Template found. Please contact HR/System Admin."))

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

    def validate_week_window(self):
        if not self.week_window_start or not self.week_window_end:
            return

        week_start = getdate(self.week_window_start)
        week_end = getdate(self.week_window_end)

        if week_end < week_start:
            frappe.throw(_("Week Window End cannot be earlier than Week Window Start."))

        # Monday=0 ... Sunday=6
        if week_start.weekday() != 0 or week_end.weekday() != 4 or (week_end - week_start).days != 4:
            frappe.throw(_("Week Window must be weekdays only: Monday to Friday."))


@frappe.whitelist()
def get_active_template_questions(template_name=None):
    template_name = template_name or frappe.db.get_value(
        "Weekly Report Template",
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
        "Weekly Report Template Question",
        filters={
            "parent": template_name,
            "parenttype": "Weekly Report Template",
            "is_active": 1,
        },
        fields=["question_text", "help_text", "is_required", "response_fieldtype", "display_order", "idx"],
        order_by="display_order asc, idx asc",
    )


def _strip_number_prefix(text):
    return re.sub(r"^\s*\d+\.\s*", "", (text or "")).strip()


def _normalize_question_key(text):
    key = _strip_number_prefix(text).strip().lower()
    # collapse whitespace and remove visual punctuation differences
    key = re.sub(r"\s+", " ", key)
    key = re.sub(r"[\[\]\(\):;,.]", "", key)
    return key


def get_permission_query_conditions(user=None):
    user = user or frappe.session.user
    if not user:
        return "1=0"

    if user == "Administrator" or _user_has_any_role(user, {"System Manager", "HR Manager"}):
        return ""

    current_employee = _get_employee_for_user(user)
    if not current_employee:
        return "1=0"

    current_employee_escaped = frappe.db.escape(current_employee)
    subordinate_filters = [f"reports_to = {current_employee_escaped}"]
    if _employee_has_custom_reports_to():
        subordinate_filters.append(f"custom_reports_to = {current_employee_escaped}")

    return f"""(
        `tabWeekly Progress Report`.intern = {current_employee_escaped}
        OR `tabWeekly Progress Report`.intern IN (
            SELECT name FROM `tabEmployee`
            WHERE {" OR ".join(subordinate_filters)}
        )
    )"""


def has_permission(doc, user=None, permission_type=None):
    user = user or frappe.session.user
    if not user:
        return False

    if user == "Administrator" or _user_has_any_role(user, {"System Manager", "HR Manager"}):
        return True

    current_employee = _get_employee_for_user(user)
    if not current_employee:
        return False

    if doc.intern == current_employee:
        return True

    direct_report_filters = [
        {
            "name": doc.intern,
            "reports_to": current_employee,
        }
    ]
    if _employee_has_custom_reports_to():
        direct_report_filters.append(
            {
                "name": doc.intern,
                "custom_reports_to": current_employee,
            }
        )

    return any(frappe.db.exists("Employee", filters) for filters in direct_report_filters)


def _get_employee_for_user(user):
    return frappe.db.get_value("Employee", {"user_id": user}, "name")


def _user_has_any_role(user, roles):
    user_roles = set(frappe.get_roles(user))
    return bool(user_roles.intersection(set(roles)))


def _employee_has_custom_reports_to():
    return frappe.db.has_column("Employee", "custom_reports_to")
