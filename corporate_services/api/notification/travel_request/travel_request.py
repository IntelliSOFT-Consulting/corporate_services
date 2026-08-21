import frappe
from frappe.utils import get_url_to_form
from corporate_services.api.notification.notification_contacts import (
    get_finance_team_emails,
    get_hr_manager_emails,
    get_supervisor_contact,
)
from corporate_services.api.workflow.auto_skip import skip_supervisor_for_ceo
from corporate_services.api.notification.dispatch_log import on_transition
from corporate_services.api.notification.mailer import send_email, build_email_body

HEADER = "Travel Request"

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
        "supervisor_rejected": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and unfortunately, it has been rejected.",
            action_line="You can view the reason and details",
            link_url=doctype_url,
            signer=supervisor_name,
            cta_text="here",
        ),
        "submitted_to_finance": build_email_body(
            greeting="Dear Finance",
            intro=f"{employee_name}, {doc.doctype} has been reviewed and, it has been Approved by their Supervisor.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="System",
            cta_text="here",
        ),
        "submitted_to_finance_ceo": build_email_body(
            greeting="Dear Finance",
            intro=f"{employee_name}, {doc.doctype} has been submitted directly to Finance.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="System",
            cta_text="here",
        ),
        "finance_approved": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and, it has been Approved by Finance.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="Finance Department",
            cta_text="here",
        ),
        "finance_rejected": build_email_body(
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
    skip_supervisor_for_ceo(
        doc=doc,
        from_state="Submitted to Supervisor",
        to_state=None,
        employee_field="employee",
    )

    if doc.workflow_state in [
        "Submitted to Supervisor","Approved by Supervisor", "Rejected By Supervisor",  "Approved by HR", "Submitted to Finance", "Approved by Finance" , "Rejected by Finance"
    ]:
        employee_id = doc.employee
        employee = frappe.get_doc("Employee", employee_id)
        employee_email = employee.company_email or employee.personal_email
        is_ceo = bool(
            employee.user_id
            and frappe.db.exists(
                "Has Role",
                {"parenttype": "User", "parent": employee.user_id, "role": "CEO"},
            )
        )


        supervisor_contact = get_supervisor_contact(employee)
        supervisor_email = supervisor_contact.email if supervisor_contact else None
        supervisor_name = supervisor_contact.name if supervisor_contact else None

        finance_team_emails = get_finance_team_emails()
        hr_manager_emails = get_hr_manager_emails()

        if doc.workflow_state == "Submitted to Supervisor":
            if employee.reports_to:
                
                message_to_supervisor = generate_message(doc, employee.employee_name, "supervisor", supervisor_name )
                send_email(
                    doc,
                    recipients=[supervisor_email],
                    subject=frappe._('Travel Request from {}'.format(employee.employee_name)),
                    message=message_to_supervisor,
                    header=HEADER,
                )
             
        elif doc.workflow_state == "Approved by Supervisor":
            message_to_employee = generate_message(doc, employee.employee_name, "approved_by_supervisor", supervisor_name)
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your Travel Request has been Approved by the supervisor'),
                message=message_to_employee,
                header=HEADER,
            )     

        elif doc.workflow_state == "Rejected By Supervisor":
            message_to_employee = generate_message(doc, employee.employee_name, "supervisor_rejected", supervisor_name)
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your Travel Request has been Rejected'),
                message=message_to_employee,
                header=HEADER,
            )
          
        elif doc.workflow_state == "Submitted to Finance":
            
            message_to_finance = generate_message(
                doc,
                employee.employee_name,
                "submitted_to_finance_ceo" if is_ceo else "submitted_to_finance",
            )
            send_email(
                doc,
                recipients=finance_team_emails,
                subject=frappe._('Travel Request from {}'.format(employee.employee_name)),
                message=message_to_finance,
                header=HEADER,
            )

            if supervisor_email and not is_ceo:
                message_to_supervisor = generate_message(doc, employee.employee_name, "supervisor", supervisor_name)
                send_email(
                    doc,
                    recipients=[supervisor_email],
                    subject=frappe._('Submission of Travel Request for {}'.format(employee.employee_name)),
                    message=message_to_supervisor,
                    header=HEADER,
                )
       
        elif doc.workflow_state == "Approved by Finance":
            message_to_employee = generate_message(doc, employee.employee_name, "finance_approved")
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your Travel Request has been Approved by Finance'),
                message=message_to_employee,
                header=HEADER,
            )
          
        elif doc.workflow_state == "Rejected by Finance":
            message_to_employee = generate_message(doc, employee.employee_name, "finance_rejected")
            send_email(
                doc,
                recipients=[employee_email],
                subject=frappe._('Your Travel Request has been Rejected by Finance'),
                message=message_to_employee,
                header=HEADER,
            )

            message_to_hr = generate_message(doc, employee.employee_name, "hr_finance_rejected")
            send_email(
                doc,
                recipients= hr_manager_emails,
                subject=frappe._('Travel Request Rejected by Finance'),
                message=message_to_hr,
                header=HEADER,
            )

doc_events = {
    "Travel Request": {
        "on_update": alert
    }
}
