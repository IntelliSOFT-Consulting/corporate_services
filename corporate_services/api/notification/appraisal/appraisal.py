import frappe
from frappe.utils import get_url_to_form
from corporate_services.api.notification.notification_contacts import get_hr_manager_emails, get_supervisor_contact
from corporate_services.api.notification.dispatch_log import on_transition
from corporate_services.api.notification.mailer import send_email, build_email_body, pdf_attachment

HEADER = "Appraisal"

def generate_message(doc, employee_name, email_type):
    doctype_url = get_url_to_form(doc.doctype, doc.name)
    messages = {
        "supervisor": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"I have submitted my {doc.doctype} as part of the appraisal process for your review and feedback. This marks the first stage of the appraisal, and I look forward to your insights and the next steps, including the appraisal discussion.",
            action_line="You can view the document",
            link_url=doctype_url,
            signer=employee_name,
            cta_text="here",
        ),
        "employee_approve_supervisor": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and approved by your supervisor. Congratulations on moving to the next stage of the appraisal process.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="Supervisor",
            cta_text="here",
        ),
        "employee_rejected_supervisor": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed by your supervisor but unfortunately, it has been rejected. We encourage you to address the feedback and resubmit.",
            action_line="You can view the feedback and details",
            link_url=doctype_url,
            signer="Supervisor",
            cta_text="here",
        ),
        "hr": build_email_body(
            greeting="Dear HR Manager",
            intro=f"A new {doc.doctype} for {employee_name} has been submitted and reviewed by the supervisor. It is now awaiting your review and approval. Please proceed with the next steps in the appraisal process.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer=employee_name,
            cta_text="here",
        ),
        "employee_rejected_hr": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed by the HR department but unfortunately, it has been rejected. Please review the feedback carefully and take the necessary steps to address the concerns.",
            action_line="You can view the details and feedback",
            link_url=doctype_url,
            signer="HR Department",
            cta_text="here",
        ),
        "employee_approved_hr": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and approved by the HR department. Congratulations on completing this stage of the appraisal process.",
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
                    subject=frappe._('Appraisal from {}'.format(employee.employee_name)),
                    message=message,
                    header=HEADER,
                    attachments=attachments,
                )
        elif doc.workflow_state == "Approved by Supervisor":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_approve_supervisor")
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your Appraisal has been Approved'),
                message=message_to_employee,
                header=HEADER,
                attachments=attachments,
            )
        elif doc.workflow_state == "Rejected By Supervisor":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_rejected_supervisor")
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your Appraisal has been Rejected'),
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
                subject=frappe._('Appraisal'),
                message=message,
                header=HEADER,
                attachments=attachments,
            )
        elif doc.workflow_state == "Rejected By HR":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_rejected_hr")
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your Appraisal has been Rejected'),
                message=message_to_employee,
                header=HEADER,
                attachments=attachments,
            )
        elif doc.workflow_state == "Approved By HR":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_approved_hr")
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your Appraisal has been Approved by HR'),
                message=message_to_employee,
                header=HEADER,
                attachments=attachments,
            )

doc_events = {
    "Appraisal": {
        "on_update": alert
    }
}
