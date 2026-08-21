import frappe
from frappe.utils import get_url_to_form
from corporate_services.api.notification.notification_contacts import (
    get_finance_team_emails,
    get_hr_manager_emails,
    get_employee_contact,
)
from corporate_services.api.notification.dispatch_log import on_transition
from corporate_services.api.notification.mailer import send_email, build_email_body

HEADER = "Travel Request Reconciliation"

def generate_message(doc, employee_name, email_type, supervisor_name=None):
    doctype_url = get_url_to_form(doc.doctype, doc.name)
    messages = {
        "submitted_to_finance": build_email_body(
            greeting="Dear Finance",
            intro=f"Travel Request Reconciliation has been submitted by <b>{employee_name}</b> to Finance for further review and approval. Thank you for your prompt attention.",
            action_line="You can view the details by clicking",
            link_url=doctype_url,
            signer="ERPNext Travel Module.",
            cta_text="here",
        ),
        "finance_approved": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and, it has been Approved by Finance.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="Finance Department",
            cta_text="here",
        ),
        "finance_rejected": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and, it has been Rejected by Finance.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="Finance Department",
            cta_text="here",
        ),
        "hr_finance_rejected": build_email_body(
            greeting="Dear HR",
            intro=f"{employee_name}, {doc.doctype} has been reviewed and, it has been Rejected by Finance.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="Finance Department",
            cta_text="here",
        ),
    }
    return messages[email_type]

def alert(doc, method):
    if not on_transition(doc):
        return
    if doc.workflow_state in [
        "Submitted to Finance", "Approved by Finance" , "Rejected by Finance"
    ]:
        
        travel_request_doc = frappe.get_doc("Travel Request", doc.travel_request)

        employee = get_employee_contact(travel_request_doc.employee)

        finance_team_emails = get_finance_team_emails()
        hr_manager_emails = get_hr_manager_emails()

        if doc.workflow_state == "Submitted to Finance":

            message_to_finance = generate_message(doc, employee.name, "submitted_to_finance")
            send_email(
                doc,
                recipients=finance_team_emails,
                subject=frappe._('Travel Request Reconciliation from {}'.format(employee.name)),
                message=message_to_finance,
                header=HEADER,
            )

        elif doc.workflow_state == "Approved by Finance":
            message_to_employee = generate_message(doc, employee.name, "finance_approved")
            send_email(
                doc,
                recipients=[employee.email],
                subject=frappe._('Your Travel Request Reconciliation has been Approved by Finance'),
                message=message_to_employee,
                header=HEADER,
            )

        elif doc.workflow_state == "Rejected by Finance":
            message_to_employee = generate_message(doc, employee.name, "finance_rejected")
            send_email(
                doc,
                recipients=[employee.email],
                subject=frappe._('Your Travel Request Reconciliation has been Rejected by Finance'),
                message=message_to_employee,
                header=HEADER,
            )

            message_to_hr = generate_message(doc, employee.name, "hr_finance_rejected")
            send_email(
                doc,
                recipients=hr_manager_emails,
                subject=frappe._('Travel Request Reconciliation Rejected by Finance'),
                message=message_to_hr,
                header=HEADER,
            )

doc_events = {
    "Travel Request Reconciliation": {
        "on_update": alert
    }
}
