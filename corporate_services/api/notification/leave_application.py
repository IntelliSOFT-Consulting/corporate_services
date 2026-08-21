import frappe
from frappe.utils import get_url_to_form
from corporate_services.api.notification.notification_contacts import (
    get_hr_manager_emails,
    get_supervisor_contact,
    get_employee_contact,
)
from corporate_services.api.notification.dispatch_log import on_transition
from corporate_services.api.notification.mailer import send_email, build_email_body

HEADER = "Leave Application"

def generate_message(doc, employee_name, email_type, sender_name=None):
    doctype_url = get_url_to_form(doc.doctype, doc.name)
    messages = {
        "supervisor": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"I have submitted my {doc.doctype} for your review and approval.",
            action_line="You can view it",
            link_url=doctype_url,
            signer=sender_name or employee_name,
            cta_text="here",
        ),
        "employee_approve_supervisor": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and approved by your supervisor, and it has now been submitted to HR for final review.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="Supervisor",
            cta_text="here",
        ),
        "employee_approved_supervisor": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and approved by your supervisor.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="Supervisor",
            cta_text="here",
        ),
        "employee_rejected_supervisor": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and unfortunately, it has been rejected.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="Supervisor",
            cta_text="here",
        ),
        "hr": build_email_body(
            greeting="Dear HR Manager",
            intro=f"You have a new {doc.doctype} for {employee_name}, submitted for your review and approval.",
            action_line="You can view it",
            link_url=doctype_url,
            signer=employee_name,
            cta_text="here",
        ),
        "employee_rejected_hr": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and unfortunately, it has been rejected.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="HR Department",
            cta_text="here",
        ),
        "employee_approved_hr": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and, it has been Approved By HR.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="HR Department",
            cta_text="here",
        ),
    }

    return messages[email_type]

def alert(doc, method):
    if not on_transition(doc):
        return
    if doc.workflow_state in [
        "Submitted to Supervisor", "Approved by Supervisor", "Rejected By Supervisor", "Submitted to HR", "Rejected By HR", "Approved By HR", "Approved by HR"
    ]:
        employee = get_employee_contact(doc.employee)

        if doc.workflow_state == "Submitted to Supervisor":
            supervisor_contact = get_supervisor_contact(employee.employee)
            if supervisor_contact:
                message = generate_message(
                    doc,
                    supervisor_contact.name,
                    "supervisor",
                    sender_name=employee.name
                )
                send_email(
                    doc,
                    recipients=[supervisor_contact.email],
                    subject=frappe._('Leave Application from {}'.format(employee.name)),
                    message=message,
                    header=HEADER,
                )

        elif doc.workflow_state == "Approved by Supervisor":
            message_to_employee = generate_message(doc, employee.name, "employee_approved_supervisor")
            send_email(
                doc,
                recipients=[employee.email],
                subject=frappe._('Your Leave Application has been Approved by Supervisor'),
                message=message_to_employee,
                header=HEADER,
            )
        elif doc.workflow_state == "Rejected By Supervisor":
            message_to_employee = generate_message(doc, employee.name, "employee_rejected_supervisor")
            send_email(
                doc,
                recipients=[employee.email],
                subject=frappe._('Your Leave Application has been Rejected'),
                message=message_to_employee,
                header=HEADER,
            )
        elif doc.workflow_state == "Submitted to HR":
            hr_manager_emails = get_hr_manager_emails()

            message_to_hr = generate_message(doc, employee.name, "hr")
            send_email(
                doc,
                recipients=hr_manager_emails,
                subject=frappe._('Leave Application'),
                message=message_to_hr,
                header=HEADER,
            )

            message_to_employee = generate_message(doc, employee.name, "employee_approve_supervisor")
            send_email(
                doc,
                recipients=[employee.email],
                subject=frappe._('Your Leave Application has been Approved by Supervisor and Submitted to HR'),
                message=message_to_employee,
                header=HEADER,
            )
        elif doc.workflow_state == "Rejected By HR":
            message_to_employee = generate_message(doc, employee.name, "employee_rejected_hr")
            send_email(
                doc,
                recipients=[employee.email],
                subject=frappe._('Your Leave Application has been Rejected'),
                message=message_to_employee,
                header=HEADER,
            )
        elif doc.workflow_state in ["Approved By HR", "Approved by HR"]:
            message_to_employee = generate_message(doc, employee.name, "employee_approved_hr")
            send_email(
                doc,
                recipients=[employee.email],
                subject=frappe._('Your Leave Application has been Approved by HR'),
                message=message_to_employee,
                header=HEADER,
            )

doc_events = {
    "Leave Application": {
        "on_update": alert
    }
}
