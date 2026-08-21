import frappe
from frappe.utils import get_url_to_form
from corporate_services.api.notification.notification_contacts import (
    get_finance_team_emails,
    get_hr_manager_emails,
    get_supervisor_contact,
    get_employee_contact,
)
from corporate_services.api.notification.dispatch_log import on_transition
from corporate_services.api.notification.mailer import send_email as _mailer_send_email, build_email_body, pdf_attachment

HEADER = "General Requisition Form"


def send_email(doc, recipients, subject, message, attachments):
    _mailer_send_email(
        doc,
        recipients,
        subject,
        message,
        header=HEADER,
        attachments=attachments,
    )

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
        "submitted_to_finance": build_email_body(
            greeting="Dear Finance",
            intro=f"{employee_name}, {doc.doctype} has been reviewed and, it has been Approved by {supervisor_name}.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer=supervisor_name,
            cta_text="here",
        ),
        "employee_approved_finance": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and, it has been Approved by Finance.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="Finance Department",
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
        "employee_rejected_finance": build_email_body(
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
        "Submitted to Supervisor", "Approved by Supervisor", "Rejected By Supervisor","Submitted to HR","Approved By HR", "Rejected By HR", "Submitted to Finance", "Approved by Finance" , "Rejected by Finance"
    ]:
        employee_id = doc.requested_by

        employee = frappe.get_doc("Employee", employee_id)
        employee_email = get_employee_contact(employee).email


        supervisor_contact = get_supervisor_contact(employee)
        supervisor_email = supervisor_contact.email if supervisor_contact else None
        supervisor_name = supervisor_contact.name if supervisor_contact else None


        attachments = pdf_attachment(doc)

        if doc.workflow_state == "Submitted to Supervisor":
            if employee.reports_to:
                
                message_to_supervisor = generate_message(doc, employee.employee_name, "supervisor", supervisor_name )
                send_email(
                    doc,
                    recipients=[supervisor_email],
                    subject=frappe._('General Requisition Form from {}'.format(employee.employee_name)),
                    message=message_to_supervisor,
                    attachments=attachments
                )
             
        elif doc.workflow_state == "Approved by Supervisor":
            message_to_employee = generate_message(doc, employee.employee_name, "approved_by_supervisor", supervisor_name)
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your General Requisition Form has been Approved by the supervisor'),
                message=message_to_employee,
                attachments=attachments
            )     
             
        elif doc.workflow_state == "Rejected By Supervisor":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_rejected_supervisor", supervisor_name)
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your General Requisition Form has been Rejected'),
                message=message_to_employee,
                attachments=attachments
            )
        elif doc.workflow_state == "Submitted to HR":
            hr_manager_emails = get_hr_manager_emails()

            message = generate_message(doc, employee.employee_name, "hr")
            send_email(
                doc,
                recipients=hr_manager_emails,
                subject=frappe._('General Requisition Form'),
                message=message,
                attachments=attachments
            )
        elif doc.workflow_state == "Rejected By HR":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_rejected_hr")
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your General Requisition Form has been Rejected'),
                message=message_to_employee,
                attachments=attachments
            )

        elif doc.workflow_state == "Approved By HR":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_approved_hr")
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your Timesheet has been Approved by HR'),
                message=message_to_employee,
                attachments=attachments
            )
   
        elif doc.workflow_state == "Submitted to Finance":
            finance_team_emails = get_finance_team_emails()
            message_to_finance = generate_message(doc, employee.employee_name, "submitted_to_finance", supervisor_name)
            send_email(
                doc,
                recipients=finance_team_emails,
                subject=frappe._('General Requisition Form from {}'.format(employee.employee_name)),
                message=message_to_finance,
                attachments=attachments
            )
       
        elif doc.workflow_state == "Approved by Finance":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_approved_finance")
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your General Requisition Form has been Approved by Finance'),
                message=message_to_employee,
                attachments=attachments
            )
           
        elif doc.workflow_state == "Rejected by Finance":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_rejected_finance")
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your General Requisition Form has been Rejected by Finance'),
                message=message_to_employee,
                attachments=attachments
            )

            hr_manager_emails = get_hr_manager_emails()
            message_to_hr = generate_message(doc, employee.employee_name, "hr_finance_rejected")
            send_email(
                doc,
                recipients= hr_manager_emails,
                subject=frappe._('General Requisition Form Rejected by Finance'),
                message=message_to_hr,
                attachments=attachments
            )


       
            
       
        


doc_events = {
    "General Requisition Form": {
        "on_update": alert
    }
}
