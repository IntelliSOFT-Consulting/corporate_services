# Copyright (c) 2026, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import re

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_url_to_form


class ProjectManagementLessonsLearned(Document):
    def validate(self):
        self.set_default_question_template()
        if not (self.answers or []):
            self.sync_template_questions()
        self.validate_required_responses()

    def before_submit(self):
        self.validate_required_responses()

    def on_update(self):
        previous = self.get_doc_before_save()
        prev_state = getattr(previous, "workflow_state", None) if previous else None
        curr_state = self.workflow_state
        if prev_state and prev_state != curr_state:
            _send_workflow_notification(self, prev_state, curr_state)

    def set_default_question_template(self):
        if self.question_template:
            return

        template_name = frappe.db.get_value(
            "Lessons Learned Template",
            {"is_active": 1},
            "name",
            order_by="modified desc",
        )
        if not template_name:
            frappe.throw(_("No active Lessons Learned Template found. Please contact HR/System Admin."))

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
        for q in _get_active_template_rows(self.question_template):
            existing = existing_by_question.get(_normalize_question_key(q.get("question_text")))
            new_rows.append(
                {
                    "question": q.get("question_text"),
                    "help_text": q.get("help_text"),
                    "is_required": q.get("is_required"),
                    "response_fieldtype": q.get("response_fieldtype") or "Text Editor",
                    "response": existing.response if existing else None,
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


@frappe.whitelist()
def get_active_template_questions(template_name=None):
    template_name = template_name or frappe.db.get_value(
        "Lessons Learned Template",
        {"is_active": 1},
        "name",
        order_by="modified desc",
    )

    if not template_name:
        return {"template_name": None, "questions": []}

    return {
        "template_name": template_name,
        "questions": [
            {
                "question_text": q.get("question_text"),
                "help_text": q.get("help_text"),
                "is_required": q.get("is_required"),
                "response_fieldtype": q.get("response_fieldtype") or "Text Editor",
            }
            for q in _get_active_template_rows(template_name)
        ],
    }


def _get_active_template_rows(template_name):
    return frappe.get_all(
        "Lessons Learned Template Question",
        filters={
            "parent": template_name,
            "parenttype": "Lessons Learned Template",
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


# ── Workflow notifications ────────────────────────────────────────────────────

def _get_employee_email(employee_id):
    if not employee_id:
        return None
    data = frappe.db.get_value(
        "Employee", employee_id, ["company_email", "personal_email"], as_dict=True
    )
    if not data:
        return None
    return data.get("company_email") or data.get("personal_email")


def _send_workflow_notification(doc, from_state, to_state):
    doc_url = get_url_to_form("Project Management Lessons Learned", doc.name)
    project = doc.project_title or doc.project or ""

    if to_state == "Submitted to Supervisor":
        _notify_supervisor(doc, doc_url, project, resubmit=(from_state == "Needs Clarification"))
    elif to_state == "Approved":
        _notify_reporter(doc, doc_url, project, state="Approved")
    elif to_state == "Rejected":
        _notify_reporter(doc, doc_url, project, state="Rejected")
    elif to_state == "Needs Clarification":
        _notify_reporter(doc, doc_url, project, state="Needs Clarification")


def _notify_supervisor(doc, doc_url, project, resubmit=False):
    supervisor_id = frappe.db.get_value("Employee", doc.employee, "reports_to")
    if not supervisor_id:
        return

    supervisor_email = _get_employee_email(supervisor_id)
    if not supervisor_email:
        return

    supervisor_name = frappe.db.get_value("Employee", supervisor_id, "employee_name") or supervisor_id
    reporter = doc.reporter_name or doc.employee or "An employee"
    action = "resubmitted" if resubmit else "submitted"

    subject = f"Lessons Learned Report {doc.name} {action} for review"
    message = f"""
        Dear {supervisor_name},<br><br>
        {reporter} has {action} a Lessons Learned report for your review.<br><br>
        <b>Report:</b> {doc.name}<br>
        <b>Project:</b> {project}<br><br>
        Please review it here: <a href="{doc_url}">{doc_url}</a><br><br>
        Regards,<br>
        Project Management System
    """
    frappe.sendmail(recipients=[supervisor_email], subject=subject, message=message)


def _notify_reporter(doc, doc_url, project, state):
    reporter_email = _get_employee_email(doc.employee)
    if not reporter_email:
        return

    reporter = doc.reporter_name or doc.employee or "Employee"

    state_messages = {
        "Approved": (
            "Congratulations - your Lessons Learned report has been <b>approved</b>.",
            "green",
        ),
        "Rejected": (
            "Your Lessons Learned report has been <b>rejected</b>. "
            "Please contact your supervisor for further guidance.",
            "red",
        ),
        "Needs Clarification": (
            "Your Lessons Learned report requires <b>clarification</b>. "
            "Please open the report, address the comments, and resubmit.",
            "orange",
        ),
    }

    body, _ = state_messages.get(state, ("Your report status has been updated.", "blue"))
    subject = f"Lessons Learned Report {doc.name} - {state}"
    message = f"""
        Dear {reporter},<br><br>
        {body}<br><br>
        <b>Report:</b> {doc.name}<br>
        <b>Project:</b> {project}<br><br>
        View your report here: <a href="{doc_url}">{doc_url}</a><br><br>
        Regards,<br>
        Project Management System
    """
    frappe.sendmail(recipients=[reporter_email], subject=subject, message=message)
