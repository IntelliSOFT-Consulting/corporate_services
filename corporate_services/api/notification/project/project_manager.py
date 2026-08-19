import frappe
from frappe.utils import get_url_to_form
from corporate_services.api.notification.notification_contacts import get_employee_contact
from corporate_services.api.notification.mailer import send_email, pdf_attachment

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
                employee = get_employee_contact(row.employee)

                message = generate_message(doc, employee.name, "project_manager")

                send_email(
                    doc,
                    recipients=[employee.email],
                    subject=frappe._('Project Manager Role for {}'.format(doc.project_name)),
                    message=message,
                    header="Project",
                    attachments=pdf_attachment(doc),
                    dedup=False,
                )
                frappe.db.set_value(
                    row.doctype, row.name, "email_sent", 1, update_modified=False
                )

doc_events = {
    "Project": {
        "on_update": alert
    }
}
