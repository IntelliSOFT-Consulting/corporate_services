import frappe
from frappe.utils import get_url_to_form
from corporate_services.api.notification.notification_contacts import get_corporate_services_head_email, get_employee_contact
from corporate_services.api.notification.dispatch_log import on_transition
from corporate_services.api.notification.mailer import send_email, build_email_body, pdf_attachment

HEADER = "Employee Grievance"

def generate_message(doc, employee_name, email_type, supervisor_name=None):
    doctype_url = get_url_to_form(doc.doctype, doc.name)
    messages = {
        "hr": build_email_body(
            greeting="Dear Head of Corporate Services",
            intro=f"You have a new {doc.doctype} from {employee_name}, submitted for your review and approval.",
            action_line="You can view it",
            link_url=doctype_url,
            signer=employee_name,
            cta_text="here",
        ),

        "rejected_by_hr": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and unfortunately, it has been rejected.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="Office of the Head of Corporate Services",
            cta_text="here",
        ),

        "approved_by_hr": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and, it has been Approved By HR.",
            extra="<p>You will be notified once the Grievance has been resolved.</p>",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="Office of the Head of Corporate Services",
            cta_text="here",
        ),

    }
    return messages[email_type]

def alert(doc, method):
    if not on_transition(doc):
        return
    if doc.workflow_state in [
        "Submitted to HR", "Approved by HR", "Rejected By HR"
    ]:
        employee = get_employee_contact(doc.raised_by)

        attachments = pdf_attachment(doc)

        if doc.workflow_state == "Submitted to HR":
            corporate_services_head_email = get_corporate_services_head_email()

            message = generate_message(doc, employee.name, "hr")
            send_email(
                doc,
                recipients=corporate_services_head_email,
                subject=frappe._('Employee Grievance'),
                message=message,
                header=HEADER,
                attachments=attachments,
            )

        elif doc.workflow_state == "Approved by HR":
            message_to_employee = generate_message(doc, employee.name, "approved_by_hr")
            send_email(
                doc,
                recipients=[employee.email],
                subject=frappe._('Your Grievance has been Approved by HR'),
                message=message_to_employee,
                header=HEADER,
                attachments=attachments,
            )

        elif doc.workflow_state == "Rejected By HR":
            message_to_employee = generate_message(doc, employee.name, "rejected_by_hr")
            send_email(
                doc,
                recipients=[employee.email],
                subject=frappe._('Your Grievance has been Rejected'),
                message=message_to_employee,
                header=HEADER,
                attachments=attachments,
            )
       

doc_events = {
    "Employee Grievance": {
        "on_update": alert
    }
}
