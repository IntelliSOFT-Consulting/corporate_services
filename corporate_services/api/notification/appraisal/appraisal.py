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
    if doc.workflow_state in [
        "Submitted to Supervisor","Approved by Supervisor", "Rejected By Supervisor", "Submitted to HR", "Rejected By HR", "Approved by HR"
    ]:
        employee_id = doc.employee
        employee = frappe.get_doc("Employee", employee_id)
        employee_email = employee.company_email or employee.personal_email

        print_format = "Standard"
        pdf_content = frappe.get_print(doc.doctype, doc.name, print_format, as_pdf=True)

        if doc.workflow_state == "Submitted to Supervisor":
            if employee.reports_to:
                supervisor_id = employee.reports_to
                supervisor = frappe.get_doc("Employee", supervisor_id)
                supervisor_email = supervisor.company_email or supervisor.personal_email

                message = generate_message(doc, supervisor.employee_name, "supervisor")
                send_email(
                    recipients=[supervisor_email],
                    subject=frappe._('Appraisal from {}'.format(employee.employee_name)),
                    message=message,
                    pdf_content=pdf_content,
                    doc_name=doc.name
                )
        elif doc.workflow_state == "Approved by Supervisor":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_approve_supervisor")
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Appraisal has been Approved'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
        elif doc.workflow_state == "Rejected By Supervisor":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_rejected_supervisor")
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Appraisal has been Rejected'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
        elif doc.workflow_state == "Submitted to HR":
            hr_managers = frappe.get_all('Has Role', filters={'role': 'HR Manager'}, fields=['parent'])
            hr_manager_emails = [frappe.get_value('User', hr_manager.parent, 'email') for hr_manager in hr_managers]

            message = generate_message(doc, employee.employee_name, "hr")
            send_email(
                recipients=hr_manager_emails,
                subject=frappe._('Appraisal'),
                message=message,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
        elif doc.workflow_state == "Rejected By HR":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_rejected_hr")
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Appraisal has been Rejected'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
        elif doc.workflow_state == "Approved By HR":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_approved_hr")
            send_email(
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
