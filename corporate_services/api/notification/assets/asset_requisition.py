import frappe
from frappe.utils import get_url_to_form
from frappe import _
from corporate_services.api.helpers.print_formats import get_default_print_format
from corporate_services.api.notification.notification_contacts import (
    get_procurement_team_emails,
    get_hr_manager_emails,
    get_finance_team_emails,
    get_supervisor_contact,
)
from corporate_services.api.notification.dispatch_log import on_transition, filter_recipients

def send_email(doc, recipients, subject, message, pdf_content, doc_name, cc=None):
    recipients = filter_recipients(doc, recipients)
    if not recipients:
        return
    frappe.sendmail(
        recipients=recipients,
        cc=cc,
        subject=subject,
        message=message,
        header=("Asset Requisition", "text/html")
    )

def generate_message(doc, employee_name, email_type, supervisor_name=None):
    doctype_url = get_url_to_form(doc.doctype, doc.name)
    messages = {
        "supervisor": """
            Dear {},<br><br>
            I have submitted my {} for your review and approval. You can view it <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(supervisor_name, doc.doctype, doctype_url, employee_name),
        
        "approved_by_supervisor": """
            Dear {},<br><br>
            Your {} has been reviewed and Approved by your supervisor. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(employee_name, doc.doctype, doctype_url, supervisor_name),

        "employee_rejected_supervisor": """
            Dear {},<br><br>
            Your {} has been reviewed and unfortunately, it has been rejected. You can view the reason and details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(employee_name, doc.doctype, doctype_url, supervisor_name),

        "submitted_to_procurement": """
            Dear Procurement Team,<br><br>
            {}, {} has been reviewed and, it has been Approved by {}. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(employee_name, doc.doctype, supervisor_name, doctype_url, supervisor_name ),

        "employee_approved_procurement": """
            Dear {},<br><br>
            Your {} has been reviewed and, it has been Approved by Procurement. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            Procurement Department
        """.format(employee_name, doc.doctype, doctype_url),

        "employee_rejected_procurement": """
            Dear {},<br><br>
            Your {} has been reviewed and, it has been Rejected by Procurement. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            Procurement Department
        """.format(employee_name, doc.doctype, doctype_url),

        "hr_procurement_rejected": """
            Dear HR,<br><br>
            {}, {} has been reviewed and, it has been Rejected by Procurement. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            Procurement Department
        """.format(employee_name, doc.doctype, doctype_url),
    }
    return messages[email_type]

def alert(doc, method):
    if not on_transition(doc):
        return
    if doc.workflow_state in [
        "Submitted to Supervisor", "Rejected By Supervisor", "Submitted to Procurement", "Approved by Procurement", "Rejected by Procurement"
    ]:
        employee_id = doc.requested_by
        employee = frappe.get_doc("Employee", employee_id)
        employee_email = employee.company_email or employee.personal_email


        supervisor_contact = get_supervisor_contact(employee)
        supervisor_email = supervisor_contact.email if supervisor_contact else None
        supervisor_name = supervisor_contact.name if supervisor_contact else None


        pdf_content = frappe.get_print(
            doc.doctype, doc.name, get_default_print_format(doc.doctype), as_pdf=True
        )

        if doc.workflow_state == "Submitted to Supervisor":
            if employee.reports_to:
                
                message_to_supervisor = generate_message(doc, employee.employee_name, "supervisor", supervisor_name )
                send_email(
                    doc,
                    recipients=[supervisor_email],
                    subject=frappe._('Asset Requisition from {}'.format(employee.employee_name)),
                    message=message_to_supervisor,
                    pdf_content=pdf_content,
                    doc_name=doc.name
                )
             
        elif doc.workflow_state == "Rejected By Supervisor":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_rejected_supervisor", supervisor_name)
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your Asset Requisition has been Rejected'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )

        elif doc.workflow_state == "Submitted to Procurement":
            message_to_employee = generate_message(doc, employee.employee_name, "approved_by_supervisor", supervisor_name)
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Asset Requisition Approval by the supervisor'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )

            procurement_team_emails = get_procurement_team_emails()
            message_to_procurement = generate_message(doc, employee.employee_name, "submitted_to_procurement", supervisor_name)
            send_email(
                doc,
                recipients=procurement_team_emails,
                subject=frappe._('Asset Requisition from {}'.format(employee.employee_name)),
                message=message_to_procurement,
                pdf_content=pdf_content,
                doc_name=doc.name
            )

        elif doc.workflow_state == "Approved by Procurement":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_approved_procurement")
            send_email(
                doc,
                recipients=[employee_email],
                cc=get_hr_manager_emails() + get_finance_team_emails(),
                subject=frappe._('Your Asset Requisition has been Approved by Procurement'),
                message=message_to_employee,
                pdf_content=None,
                doc_name=doc.name
            )

        elif doc.workflow_state == "Rejected by Procurement":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_rejected_procurement")
            send_email(
                doc,
                recipients=[employee_email],
                cc=get_hr_manager_emails(),
                subject=frappe._('Your Asset Requisition has been Rejected by Procurement'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )

            hr_manager_emails = get_hr_manager_emails()
            message_to_hr = generate_message(doc, employee.employee_name, "hr_procurement_rejected")
            send_email(
                doc,
                recipients=hr_manager_emails,
                subject=frappe._('Asset Requisition Rejected by Procurement'),
                message=message_to_hr,
                pdf_content=pdf_content,
                doc_name=doc.name
            )

doc_events = {
    "Asset Requisition": {
        "on_update": alert
    }
}
