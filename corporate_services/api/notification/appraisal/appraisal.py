import frappe
from frappe.utils import get_url_to_form
from corporate_services.api.helpers.print_formats import get_default_print_format
from corporate_services.api.notification.notification_contacts import get_hr_manager_emails, get_supervisor_contact
from corporate_services.api.notification.dispatch_log import on_transition, filter_recipients

def send_email(doc, recipients, subject, message, pdf_content, doc_name):
    recipients = filter_recipients(doc, recipients)
    if not recipients:
        return
    frappe.sendmail(
        recipients=recipients,
        subject=subject,
        message=message,
        attachments=[{
            'fname': '{}.pdf'.format(doc_name),
            'fcontent': pdf_content
        }],
        header=("Appraisal", "text/html")
    )

def generate_message(doc, employee_name, email_type):
    doctype_url = get_url_to_form(doc.doctype, doc.name)
    messages = {
        "supervisor": """
            Dear {},<br><br>
            I have submitted my {} as part of the appraisal process for your review and feedback. You can view the document <a href="{}">here</a>. This marks the first stage of the appraisal, and I look forward to your insights and the next steps, including the appraisal discussion.<br><br>
            Kind regards,<br>
            {}
        """.format(employee_name, doc.doctype, doctype_url, employee_name),

        "employee_approve_supervisor": """
            Dear {},<br><br>
            Your {} has been reviewed and approved by your supervisor. You can view the details <a href="{}">here</a>.<br><br>
            Congratulations on moving to the next stage of the appraisal process.<br><br>
            Kind regards,<br>
            Supervisor
        """.format(employee_name, doc.doctype, doctype_url),


        "employee_rejected_supervisor": """
            Dear {},<br><br>
            Your {} has been reviewed by your supervisor but unfortunately, it has been rejected. You can view the feedback and details <a href="{}">here</a>. We encourage you to address the feedback and resubmit.<br><br>
            Kind regards,<br>
            Supervisor
        """.format(employee_name, doc.doctype, doctype_url),


        "hr": """
            Dear HR Manager,<br><br>
            A new {} for {} has been submitted and reviewed by the supervisor. It is now awaiting your review and approval. You can view the details <a href="{}">here</a>.<br><br>
            Please proceed with the next steps in the appraisal process.<br><br>
            Kind regards,<br>
            {}
        """.format(doc.doctype, employee_name, doctype_url, employee_name),


        "employee_rejected_hr": """
            Dear {},<br><br>
            Your {} has been reviewed by the HR department but unfortunately, it has been rejected. You can view the details and feedback <a href="{}">here</a>. Please review the feedback carefully and take the necessary steps to address the concerns.<br><br>
            Kind regards,<br>
            HR Department
        """.format(employee_name, doc.doctype, doctype_url),


        "employee_approved_hr": """
            Dear {},<br><br>
            Your {} has been reviewed and approved by the HR department. You can view the details <a href="{}">here</a>.<br><br>
            Congratulations on completing this stage of the appraisal process.<br><br>
            Kind regards,<br>
            HR Department
        """.format(employee_name, doc.doctype, doctype_url),

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

        pdf_content = frappe.get_print(
            doc.doctype, doc.name, get_default_print_format(doc.doctype), as_pdf=True
        )

        if doc.workflow_state == "Submitted to Supervisor":
            if employee.reports_to:
                supervisor_contact = get_supervisor_contact(employee)

                message = generate_message(doc, supervisor_contact.name, "supervisor")
                send_email(
                    doc,
                    recipients=[supervisor_contact.email],
                    subject=frappe._('Appraisal from {}'.format(employee.employee_name)),
                    message=message,
                    pdf_content=pdf_content,
                    doc_name=doc.name
                )
        elif doc.workflow_state == "Approved by Supervisor":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_approve_supervisor")
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your Appraisal has been Approved'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
        elif doc.workflow_state == "Rejected By Supervisor":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_rejected_supervisor")
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your Appraisal has been Rejected'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
        elif doc.workflow_state == "Submitted to HR":
            hr_manager_emails = get_hr_manager_emails()

            message = generate_message(doc, employee.employee_name, "hr")
            send_email(
                doc,
                recipients=hr_manager_emails,
                subject=frappe._('Appraisal'),
                message=message,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
        elif doc.workflow_state == "Rejected By HR":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_rejected_hr")
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your Appraisal has been Rejected'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
        elif doc.workflow_state == "Approved By HR":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_approved_hr")
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your Appraisal has been Approved by HR'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )

doc_events = {
    "Appraisal": {
        "on_update": alert
    }
}
