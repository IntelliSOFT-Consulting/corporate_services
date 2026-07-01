import frappe
from frappe.utils import get_url_to_form
from corporate_services.api.helpers.print_formats import get_default_print_format

def send_email(recipients, subject, message, pdf_content, doc_name):
    frappe.sendmail(
        recipients=recipients,
        subject=subject,
        message=message,
        attachments=[{
            'fname': '{}.pdf'.format(doc_name),
            'fcontent': pdf_content
        }],
        header=("Project", "text/html")
    )

def generate_message(doc, employee_name, email_type):
    doctype_url = get_url_to_form(doc.doctype, doc.name)
    messages = {
        "project_manager": """
            Dear {},<br><br>
            You have been assigned the Project Manager role on {}. You can view it <a href="{}">here</a>.<br><br>
            
        """.format(employee_name, doc.project_name, doctype_url),
    }
    return messages[email_type]

def alert(doc, method):
    if not getattr(doc, "_email_sent", False):
        for row in doc.custom_project_managers:
            if row.email_sent == 0:
                employee_id = row.employee
                employee = frappe.get_doc("Employee", employee_id)
                employee_email = employee.company_email or employee.personal_email
                
                pdf_content = frappe.get_print(
                    doc.doctype, doc.name, get_default_print_format(doc.doctype), as_pdf=True
                )

                message = generate_message(doc, employee.employee_name, "project_manager")
                
                send_email(
                    recipients=[employee_email],
                    subject=frappe._('Project Manager Role for {}'.format(doc.project_name)),
                    message=message,
                    pdf_content=pdf_content,
                    doc_name=doc.name
                )
                frappe.db.set_value(
                    row.doctype, row.name, "email_sent", 1, update_modified=False
                )

doc_events = {
    "Project": {
        "on_update": alert
    }
}
