import frappe
from frappe.utils import get_url_to_form
from frappe import _
from corporate_services.api.notification.notification_contacts import (
    get_procurement_team_emails,
    get_hr_manager_emails,
    get_finance_team_emails,
    get_supervisor_contact,
    get_employee_contact,
)
from corporate_services.api.notification.dispatch_log import on_transition
from corporate_services.api.notification.mailer import send_email as _mailer_send_email, build_email_body

HEADER = "Asset Requisition"


def send_email(doc, recipients, subject, message, cc=None):
    _mailer_send_email(doc, recipients, subject, message, header=HEADER, cc=cc)

def generate_message(doc, employee_name, email_type, supervisor_name=None):
    doctype_url = get_url_to_form(doc.doctype, doc.name)
    messages = {
        "supervisor": build_email_body(
            greeting=f"Dear {supervisor_name}",
            intro=f"I have submitted my {doc.doctype} for your review and approval.",
            action_line="You can view it",
            link_url=doctype_url,
            signer=employee_name,
            cta_text="here",
        ),
        "approved_by_supervisor": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and Approved by your supervisor.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer=supervisor_name,
            cta_text="here",
        ),
        "employee_rejected_supervisor": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and unfortunately, it has been rejected.",
            action_line="You can view the reason and details",
            link_url=doctype_url,
            signer=supervisor_name,
            cta_text="here",
        ),
        "submitted_to_procurement": build_email_body(
            greeting="Dear Procurement Team",
            intro=f"{employee_name}, {doc.doctype} has been reviewed and, it has been Approved by {supervisor_name}.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer=supervisor_name,
            cta_text="here",
        ),
        "employee_approved_procurement": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and, it has been Approved by Procurement.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="Procurement Department",
            cta_text="here",
        ),
        "employee_rejected_procurement": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and, it has been Rejected by Procurement.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="Procurement Department",
            cta_text="here",
        ),
        "hr_procurement_rejected": build_email_body(
            greeting="Dear HR",
            intro=f"{employee_name}, {doc.doctype} has been reviewed and, it has been Rejected by Procurement.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="Procurement Department",
            cta_text="here",
        ),
    }
    return messages[email_type]

def alert(doc, method):
    if not on_transition(doc):
        return
    if doc.workflow_state in [
        "Submitted to Supervisor", "Rejected By Supervisor", "Submitted to Procurement", "Approved by Procurement", "Rejected by Procurement"
    ]:
        employee_id = doc.requested_by
        employee = frappe.get_doc("Employee", employee_id)
        employee_email = get_employee_contact(employee).email


        supervisor_contact = get_supervisor_contact(employee)
        supervisor_email = supervisor_contact.email if supervisor_contact else None
        supervisor_name = supervisor_contact.name if supervisor_contact else None


        if doc.workflow_state == "Submitted to Supervisor":
            if employee.reports_to:
                
                message_to_supervisor = generate_message(doc, employee.employee_name, "supervisor", supervisor_name )
                send_email(
                    doc,
                    recipients=[supervisor_email],
                    subject=frappe._('Asset Requisition from {}'.format(employee.employee_name)),
                    message=message_to_supervisor
                )
             
        elif doc.workflow_state == "Rejected By Supervisor":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_rejected_supervisor", supervisor_name)
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your Asset Requisition has been Rejected'),
                message=message_to_employee
            )

        elif doc.workflow_state == "Submitted to Procurement":
            message_to_employee = generate_message(doc, employee.employee_name, "approved_by_supervisor", supervisor_name)
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Asset Requisition Approval by the supervisor'),
                message=message_to_employee
            )

            procurement_team_emails = get_procurement_team_emails()
            message_to_procurement = generate_message(doc, employee.employee_name, "submitted_to_procurement", supervisor_name)
            send_email(
                doc,
                recipients=procurement_team_emails,
                subject=frappe._('Asset Requisition from {}'.format(employee.employee_name)),
                message=message_to_procurement
            )

        elif doc.workflow_state == "Approved by Procurement":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_approved_procurement")
            send_email(
                doc,
                recipients=[employee_email],
                cc=get_hr_manager_emails() + get_finance_team_emails(),
                subject=frappe._('Your Asset Requisition has been Approved by Procurement'),
                message=message_to_employee
            )

        elif doc.workflow_state == "Rejected by Procurement":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_rejected_procurement")
            send_email(
                doc,
                recipients=[employee_email],
                cc=get_hr_manager_emails(),
                subject=frappe._('Your Asset Requisition has been Rejected by Procurement'),
                message=message_to_employee
            )

            hr_manager_emails = get_hr_manager_emails()
            message_to_hr = generate_message(doc, employee.employee_name, "hr_procurement_rejected")
            send_email(
                doc,
                recipients=hr_manager_emails,
                subject=frappe._('Asset Requisition Rejected by Procurement'),
                message=message_to_hr
            )

doc_events = {
    "Asset Requisition": {
        "on_update": alert
    }
}
