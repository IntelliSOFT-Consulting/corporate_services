import frappe
from frappe.utils import get_url_to_form

from corporate_services.api.notification.notification_contacts import (
    get_hr_manager_emails,
    get_supervisor_contact,
    get_employee_contact,
)
from corporate_services.api.notification.dispatch_log import on_transition
from corporate_services.api.notification.mailer import send_email, build_email_body

HEADER = "Internship Completion Report"


def generate_message(doc, employee_name, email_type, sender_name=None):
    doc_url = get_url_to_form(doc.doctype, doc.name)
    messages = {
        "supervisor": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"{sender_name or employee_name} has submitted an {doc.doctype} for your review and approval.",
            action_line="You can view it",
            link_url=doc_url,
            signer=sender_name or employee_name,
            cta_text="here",
        ),
        "employee_approved_supervisor": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and approved by {sender_name or 'your supervisor'}, and submitted to HR for final review.",
            action_line="You can view it",
            link_url=doc_url,
            signer=sender_name or "Supervisor",
            cta_text="here",
        ),
        "employee_rejected_supervisor": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and rejected by {sender_name or 'your supervisor'}. Please review and resubmit if needed.",
            action_line="You can view it",
            link_url=doc_url,
            signer=sender_name or "Supervisor",
            cta_text="here",
        ),
        "hr": build_email_body(
            greeting="Dear HR Manager",
            intro=f"You have a new {doc.doctype} for {employee_name}, submitted for your review and approval.",
            action_line="You can view it",
            link_url=doc_url,
            signer=sender_name or "Supervisor",
            cta_text="here",
        ),
        "employee_rejected_hr": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and rejected by {sender_name or 'HR'}. Please review and resubmit if needed.",
            action_line="You can view it",
            link_url=doc_url,
            signer=sender_name or "HR Department",
            cta_text="here",
        ),
        "employee_approved_hr": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and approved by {sender_name or 'HR'}.",
            action_line="You can view it",
            link_url=doc_url,
            signer=sender_name or "HR Department",
            cta_text="here",
        ),
    }
    return messages[email_type]


def alert(doc, method):
    if not on_transition(doc):
        return
    watched_states = {
        "Submitted to Supervisor",
        "Submitted to HR",
        "Rejected By Supervisor",
        "Rejected By HR",
        "Approved by HR",
        "Approved By HR",
    }
    if doc.workflow_state not in watched_states:
        return

    employee = get_employee_contact(doc.intern)
    employee_name = employee.name
    actor_name = frappe.get_cached_value("User", frappe.session.user, "full_name") or frappe.session.user

    if doc.workflow_state == "Submitted to Supervisor":
        supervisor_contact = get_supervisor_contact(employee.employee)
        if not supervisor_contact or not supervisor_contact.email:
            return

        send_email(
            doc,
            recipients=[supervisor_contact.email],
            subject=frappe._("Internship Completion Report from {}".format(employee_name)),
            message=generate_message(
                doc,
                supervisor_contact.name,
                "supervisor",
                sender_name=actor_name,
            ),
            header=HEADER,
        )
        return

    if doc.workflow_state == "Submitted to HR":
        hr_manager_emails = get_hr_manager_emails()
        send_email(
            doc,
            recipients=hr_manager_emails,
            subject=frappe._("Internship Completion Report Pending HR Review"),
            message=generate_message(doc, employee_name, "hr", sender_name=actor_name),
            header=HEADER,
        )
        if employee.email:
            send_email(
                doc,
                recipients=[employee.email],
                subject=frappe._("Your Internship Completion Report has been Approved by Supervisor and Submitted to HR"),
                message=generate_message(doc, employee_name, "employee_approved_supervisor", sender_name=actor_name),
                header=HEADER,
            )
        return

    if not employee.email:
        return

    if doc.workflow_state == "Rejected By Supervisor":
        send_email(
            doc,
            recipients=[employee.email],
            subject=frappe._("Your Internship Completion Report has been Rejected by Supervisor"),
            message=generate_message(doc, employee_name, "employee_rejected_supervisor", sender_name=actor_name),
            header=HEADER,
        )
        return

    if doc.workflow_state == "Rejected By HR":
        send_email(
            doc,
            recipients=[employee.email],
            subject=frappe._("Your Internship Completion Report has been Rejected by HR"),
            message=generate_message(doc, employee_name, "employee_rejected_hr", sender_name=actor_name),
            header=HEADER,
        )
        return

    if doc.workflow_state in {"Approved by HR", "Approved By HR"}:
        send_email(
            doc,
            recipients=[employee.email],
            subject=frappe._("Your Internship Completion Report has been Approved by HR"),
            message=generate_message(doc, employee_name, "employee_approved_hr", sender_name=actor_name),
            header=HEADER,
        )
