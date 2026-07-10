# Submitted to smt - send a notification to the SMT members- these are the users with the role "SMT" or users on the doctype SMT Members.
# Needs Clarification - send a notification to the employee who created the Status report, telling then that the report needs clarification.
# Reviewed - send a notification to the employee who created the Status report, telling them that the report has been reviewed.
# Approved - send a notification to the employee who created the Status report, telling them that the report has been approved.
# Rejected - send a notification to the employee who created the Status report, telling them that the report has been rejected.

import frappe
from frappe.utils import get_url_to_form, escape_html

from corporate_services.api.notification.dispatch_log import on_transition, filter_recipients
from corporate_services.api.notification.notification_contacts import get_user_contact


def get_smt_emails() -> list[str]:
    emails = frappe.get_all(
        "Has Role", filters={"role": "SMT", "parenttype": "User"}, pluck="parent"
    )
    emails += frappe.get_all("SMT Members", pluck="email")

    return list(dict.fromkeys(email for email in emails if email))


def _send_workflow_email(doc, recipients, subject, message):
    recipients = filter_recipients(doc, list(dict.fromkeys([r for r in recipients if r])))
    if not recipients:
        return

    frappe.sendmail(
        recipients=recipients,
        subject=subject,
        message=message,
        header=("Project Status Report", "text/html"),
    )


def alert(doc, method):
    watched_states = {
        "Submitted to SMT",
        "Needs Clarification",
        "Reviewed",
        "Approved",
        "Rejected",
    }

    if doc.workflow_state not in watched_states:
        return

    if not on_transition(doc):
        return

    doc_link = get_url_to_form(doc.doctype, doc.name)
    creator = get_user_contact(doc.owner)
    creator_name = creator.name if creator else doc.owner

    if doc.workflow_state == "Submitted to SMT":
        smt_emails = get_smt_emails()
        _send_workflow_email(
            doc,
            recipients=smt_emails,
            subject=f"Project Status Report submitted for review - {doc.project_name}",
            message=f"""
                <p>Dear SMT Member,</p>
                <p>{escape_html(creator_name)} has submitted a Project Status Report for {escape_html(doc.project_name or "")} for your review.</p>
                <p><a href="{doc_link}">Open Project Status Report</a></p>
                <p>Kind regards,<br><strong>Project Management</strong></p>
            """,
        )
        return

    if not creator or not creator.email:
        return

    state_subject_map = {
        "Needs Clarification": f"Clarification needed on your Project Status Report - {doc.project_name}",
        "Reviewed": f"Your Project Status Report has been reviewed - {doc.project_name}",
        "Approved": f"Your Project Status Report has been approved - {doc.project_name}",
        "Rejected": f"Your Project Status Report has been rejected - {doc.project_name}",
    }
    state_intro_map = {
        "Needs Clarification": "Your Project Status Report needs clarification before it can proceed.",
        "Reviewed": "Your Project Status Report has been reviewed by the SMT.",
        "Approved": "Your Project Status Report has been approved by the SMT.",
        "Rejected": "Your Project Status Report has been rejected by the SMT.",
    }

    _send_workflow_email(
        doc,
        recipients=[creator.email],
        subject=state_subject_map.get(doc.workflow_state, "Project Status Report Update"),
        message=f"""
            <p>Dear {escape_html(creator_name)},</p>
            <p>{state_intro_map.get(doc.workflow_state, "Your Project Status Report has been updated.")}</p>
            <p><a href="{doc_link}">Open Project Status Report</a></p>
            <p>Kind regards,<br><strong>Project Management</strong></p>
        """,
    )
