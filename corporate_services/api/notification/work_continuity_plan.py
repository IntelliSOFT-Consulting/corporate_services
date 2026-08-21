import frappe
from frappe.utils import get_url_to_form
from corporate_services.api.notification.notification_contacts import get_hr_manager_emails, get_supervisor_contact
from corporate_services.api.notification.dispatch_log import on_transition
from corporate_services.api.notification.mailer import send_email, build_email_body, pdf_attachment

HEADER = "Work Continuity Plan"

def generate_message(doc, employee_name, email_type, doc_owner=None):
    doctype_url = get_url_to_form(doc.doctype, doc.name)
    messages = {
        "supervisor": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"I have submitted my {doc.doctype} for your review and approval.",
            action_line="You can view it",
            link_url=doctype_url,
            signer=employee_name,
            cta_text="here",
        ),
        "employee_approve_supervisor": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and Approved by the Supervisor.",
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
            intro=f"The {doc.doctype} has been submitted for your review and approval.",
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
        "employee_work_continuity": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"You have been assigned some task on {doc.doctype}, by {doc_owner}.",
            action_line="You can view it",
            link_url=doctype_url,
            signer=doc_owner,
            cta_text="here",
        ),
    }
    return messages[email_type]

def alert(doc, method):
    if not on_transition(doc):
        return
    if doc.workflow_state in [
        "Submitted to Supervisor","Approved by Supervisor", "Rejected By Supervisor", "Submitted to HR", "Rejected By HR", "Approved by HR"
    ]:
        employee_id = doc.employee
        employee = frappe.get_doc("Employee", employee_id)
        employee_email = employee.company_email or employee.personal_email

        attachments = pdf_attachment(doc)

        if doc.workflow_state == "Submitted to Supervisor":
            if employee.reports_to:
                supervisor_contact = get_supervisor_contact(employee)

                message = generate_message(doc, supervisor_contact.name, "supervisor")
                send_email(
                    doc,
                    recipients=[supervisor_contact.email],
                    subject=frappe._('Work Continuity Plan from {}'.format(employee.employee_name)),
                    message=message,
                    header=HEADER,
                    attachments=attachments,
                )
                
                
                # send email notification to the reliever 
        if doc.work_continuity:
            for child in doc.get("work_continuity"):
                responsibility_id = child.responsibility
                responsibility = frappe.get_doc("Employee", responsibility_id)
                employee_email = responsibility.company_email or responsibility.personal_email
                
                doc_owner_id = frappe.get_doc("Employee", doc.employee)
                doc_owner = doc_owner_id.employee_name
                
                employee_work_continuity = generate_message(doc, responsibility.employee_name, "employee_work_continuity",doc_owner)

                send_email(
                    doc,
                    recipients=[employee_email],
                    subject=frappe._('Work Continuity Plan from {}'.format(doc_owner)),
                    message=employee_work_continuity,
                    header=HEADER,
                    attachments=attachments,
                )       
                
                
                
        elif doc.workflow_state == "Approved by Supervisor":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_approve_supervisor")
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your Work Continuity Plan has been Approved'),
                message=message_to_employee,
                header=HEADER,
                attachments=attachments,
            )
        elif doc.workflow_state == "Rejected By Supervisor":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_rejected_supervisor")
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your Work Continuity Plan has been Rejected'),
                message=message_to_employee,
                header=HEADER,
                attachments=attachments,
            )
        elif doc.workflow_state == "Submitted to HR":
            hr_manager_emails = get_hr_manager_emails()

            message = generate_message(doc, employee.employee_name, "hr")
            send_email(
                doc,
                recipients=hr_manager_emails,
                subject=frappe._('Work Continuity Plan'),
                message=message,
                header=HEADER,
                attachments=attachments,
            )
        elif doc.workflow_state == "Rejected By HR":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_rejected_hr")
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your Work Continuity Plan has been Rejected'),
                message=message_to_employee,
                header=HEADER,
                attachments=attachments,
            )
        elif doc.workflow_state == "Approved By HR":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_approved_hr")
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your Timesheet has been Approved by HR'),
                message=message_to_employee,
                header=HEADER,
                attachments=attachments,
            )
        
        
                
                


doc_events = {
    "Work Continuity Plan": {
        "on_update": alert
    }
}
