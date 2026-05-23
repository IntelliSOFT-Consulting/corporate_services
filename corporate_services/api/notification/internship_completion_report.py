import frappe
from frappe.utils import get_url_to_form

from corporate_services.api.notification.notification_contacts import (
    get_hr_manager_emails,
    get_supervisor_contact,
)


def send_email(recipients, subject, message):
    if not recipients:
        return

    clean_recipients = [r for r in dict.fromkeys(recipients) if r]
    if not clean_recipients:
        return

    frappe.sendmail(
        recipients=clean_recipients,
        subject=subject,
        message=message,
        header=("Internship Completion Report", "text/html"),
    )


def generate_message(doc, employee_name, email_type, sender_name=None):
    doc_url = get_url_to_form(doc.doctype, doc.name)
    messages = {
        "supervisor": """
            Dear {},<br><br>
            {} has submitted an {} for your review and approval. You can view it <a href=\"{}\">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(employee_name, sender_name or employee_name, doc.doctype, doc_url, sender_name or employee_name),
        "employee_approved_supervisor": """
            Dear {},<br><br>
            Your {} has been reviewed and approved by {}, and submitted to HR for final review. You can view it <a href=\"{}\">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(employee_name, doc.doctype, sender_name or "your supervisor", doc_url, sender_name or "Supervisor"),
        "employee_rejected_supervisor": """
            Dear {},<br><br>
            Your {} has been reviewed and rejected by {}. Please review and resubmit if needed. You can view it <a href=\"{}\">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(employee_name, doc.doctype, sender_name or "your supervisor", doc_url, sender_name or "Supervisor"),
        "hr": """
            Dear HR Manager,<br><br>
            You have a new {} for {}, submitted for your review and approval. You can view it <a href=\"{}\">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(doc.doctype, employee_name, doc_url, sender_name or "Supervisor"),
        "employee_rejected_hr": """
            Dear {},<br><br>
            Your {} has been reviewed and rejected by {}. Please review and resubmit if needed. You can view it <a href=\"{}\">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(employee_name, doc.doctype, sender_name or "HR", doc_url, sender_name or "HR Department"),
        "employee_approved_hr": """
            Dear {},<br><br>
            Your {} has been reviewed and approved by {}. You can view it <a href=\"{}\">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(employee_name, doc.doctype, sender_name or "HR", doc_url, sender_name or "HR Department"),
    }
    return messages[email_type]


def alert(doc, method):
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

    employee = frappe.get_doc("Employee", doc.intern)
    employee_name = employee.employee_name or employee.name
    employee_email = employee.company_email or employee.personal_email
    actor_name = frappe.get_cached_value("User", frappe.session.user, "full_name") or frappe.session.user

    if doc.workflow_state == "Submitted to Supervisor":
        if not employee.reports_to:
            return

        supervisor_contact = get_supervisor_contact(employee)
        if not supervisor_contact or not supervisor_contact.email:
            return

        send_email(
            recipients=[supervisor_contact.email],
            subject=frappe._("Internship Completion Report from {}".format(employee_name)),
            message=generate_message(
                doc,
                supervisor_contact.name,
                "supervisor",
                sender_name=actor_name,
            ),
        )
        return

    if doc.workflow_state == "Submitted to HR":
        hr_manager_emails = get_hr_manager_emails()
        send_email(
            recipients=hr_manager_emails,
            subject=frappe._("Internship Completion Report Pending HR Review"),
            message=generate_message(doc, employee_name, "hr", sender_name=actor_name),
        )
        if employee_email:
            send_email(
                recipients=[employee_email],
                subject=frappe._("Your Internship Completion Report has been Approved by Supervisor and Submitted to HR"),
                message=generate_message(doc, employee_name, "employee_approved_supervisor", sender_name=actor_name),
            )
        return

    if not employee_email:
        return

    if doc.workflow_state == "Rejected By Supervisor":
        send_email(
            recipients=[employee_email],
            subject=frappe._("Your Internship Completion Report has been Rejected by Supervisor"),
            message=generate_message(doc, employee_name, "employee_rejected_supervisor", sender_name=actor_name),
        )
        return

    if doc.workflow_state == "Rejected By HR":
        send_email(
            recipients=[employee_email],
            subject=frappe._("Your Internship Completion Report has been Rejected by HR"),
            message=generate_message(doc, employee_name, "employee_rejected_hr", sender_name=actor_name),
        )
        return

    if doc.workflow_state in {"Approved by HR", "Approved By HR"}:
        send_email(
            recipients=[employee_email],
            subject=frappe._("Your Internship Completion Report has been Approved by HR"),
            message=generate_message(doc, employee_name, "employee_approved_hr", sender_name=actor_name),
        )
