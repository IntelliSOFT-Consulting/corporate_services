import frappe
from frappe.utils import get_url_to_form

def send_email(recipients, subject, message, pdf_content, doc_name):
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
    if doc.workflow_state in [
        "Submitted to HR", "Approved by HR", "Rejected By HR"
    ]:
        employee_id = doc.raised_by
        employee = frappe.get_doc("Employee", employee_id)
        employee_email = employee.company_email or employee.personal_email

        print_format = "Standard"
        pdf_content = frappe.get_print(doc.doctype, doc.name, print_format, as_pdf=True)
             
        if doc.workflow_state == "Submitted to HR":
            hr_managers = frappe.get_all('Has Role', filters={'role': 'HR Manager'}, fields=['parent'])
            hr_manager_emails = [frappe.get_value('User', hr_manager.parent, 'email') for hr_manager in hr_managers]

            message = generate_message(doc, employee.employee_name, "hr")
            send_email(
                recipients=hr_manager_emails,
                subject=frappe._('Employee Grievance'),
                message=message,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
            
        elif doc.workflow_state == "Approved by HR":
            message_to_employee = generate_message(doc, employee.employee_name, "approved_by_hr")
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Grievance has been Approved by HR'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
            
        elif doc.workflow_state == "Rejected By HR":
            message_to_employee = generate_message(doc, employee.employee_name, "rejected_by_hr")
            send_email(
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
