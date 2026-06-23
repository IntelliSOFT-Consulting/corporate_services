import frappe
from frappe.utils import get_url_to_form
from corporate_services.api.helpers.print_formats import get_default_print_format
from corporate_services.api.notification.notification_contacts import get_hr_manager_emails
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
        header=("Employee Grievance", "text/html")
    )

def generate_message(doc, employee_name, email_type, supervisor_name=None):
    doctype_url = get_url_to_form(doc.doctype, doc.name)
    messages = {
        "hr": """
            Dear HR Manager,<br><br>
            You have a new {} from {}, submitted for your review and approval. You can view it <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(doc.doctype,employee_name, doctype_url, employee_name),
        
        "rejected_by_hr": """
            Dear {},<br><br>
            Your {} has been reviewed and unfortunately, it has been rejected. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            HR Department
        """.format(employee_name, doc.doctype, doctype_url),
        
        "approved_by_hr": """
            Dear {},<br><br>
            Your {} has been reviewed and, it has been Approved By HR. You will be notified once the Grievance has been resolved. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            HR Department
        """.format(employee_name, doc.doctype, doctype_url),
        
    }
    return messages[email_type]

def alert(doc, method):
    if not on_transition(doc):
        return
    if doc.workflow_state in [
        "Submitted to HR", "Approved by HR", "Rejected By HR"
    ]:
        employee_id = doc.raised_by
        employee = frappe.get_doc("Employee", employee_id)
        employee_email = employee.company_email or employee.personal_email

        pdf_content = frappe.get_print(
            doc.doctype, doc.name, get_default_print_format(doc.doctype), as_pdf=True
        )
             
        if doc.workflow_state == "Submitted to HR":
            hr_manager_emails = get_hr_manager_emails()

            message = generate_message(doc, employee.employee_name, "hr")
            send_email(
                doc,
                recipients=hr_manager_emails,
                subject=frappe._('Employee Grievance'),
                message=message,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
            
        elif doc.workflow_state == "Approved by HR":
            message_to_employee = generate_message(doc, employee.employee_name, "approved_by_hr")
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your Grievance has been Approved by HR'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
            
        elif doc.workflow_state == "Rejected By HR":
            message_to_employee = generate_message(doc, employee.employee_name, "rejected_by_hr")
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your Grievance has been Rejected'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
       

doc_events = {
    "Employee Grievance": {
        "on_update": alert
    }
}
