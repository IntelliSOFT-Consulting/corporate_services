import frappe
from frappe.utils import get_url_to_form, get_fullname
from corporate_services.api.notification.notification_contacts import get_supervisor_contact


@frappe.whitelist()
def notify_supervisor_for_exit_interview(docname):
    doc = frappe.get_doc("OffBoarding Schedule", docname)

    if not doc.employee:
        frappe.throw("No employee linked to this OffBoarding Schedule.")

    employee = frappe.get_doc("Employee", doc.employee)

    if not employee.reports_to:
        frappe.throw(
            f"Employee <b>{employee.employee_name}</b> has no supervisor (Reports To) set."
        )

    supervisor_contact = get_supervisor_contact(employee)
    supervisor = supervisor_contact.employee
    supervisor_email = supervisor_contact.email

    if not supervisor_email:
        frappe.throw(
            f"No email address found for supervisor <b>{supervisor.employee_name}</b>."
        )

    # Link to existing Exit Interview for this employee, or pre-filled new form
    existing_exit_interview = frappe.db.get_value(
        "Exit Interview",
        {"employee": doc.employee},
        "name"
    )
    if existing_exit_interview:
        doc_url = get_url_to_form("Exit Interview", existing_exit_interview)
    else:
        doc_url = get_url_to_form("Exit Interview", "new-exit-interview-1") +                   f"?employee={doc.employee}"
    sender_name = get_fullname(frappe.session.user)

    message = """
        Dear {supervisor_name},<br><br>
        This is to inform you that <b>{employee_name}</b> is currently in the offboarding process
        and requires an <b>Exit Interview</b> to be conducted with you as their supervisor.<br><br>
        Please schedule and complete the exit interview at your earliest convenience.<br><br>
        You can view the Offboarding Schedule <a href="{doc_url}">here</a>.<br><br>
        Kind regards,<br>
        {sender_name}<br>
        HR Management
    """.format(
        supervisor_name=supervisor.employee_name,
        employee_name=employee.employee_name,
        doc_url=doc_url,
        sender_name=sender_name,
    )

    frappe.sendmail(
        recipients=[supervisor_email],
        subject=f"Exit Interview Required - {employee.employee_name}",
        message=message,
        header=("OffBoarding Schedule", "text/html"),
    )

    # System notification in ERPNext inbox
    frappe.get_doc({
        "doctype": "Notification Log",
        "subject": f"Exit Interview Required for {employee.employee_name}",
        "email_content": message,
        "for_user": supervisor_email,
        "type": "Alert",
        "document_type": doc.doctype,
        "document_name": doc.name,
        "from_user": frappe.session.user,
    }).insert(ignore_permissions=True)

    # Tick the supervisor_notification checkbox
    frappe.db.set_value(
        "OffBoarding Schedule",
        docname,
        "supervisor_notification",
        1,
    )
    frappe.db.commit()

    # Audit trail comment
    doc.add_comment(
        "Comment",
        f"Exit interview notification sent to supervisor "
        f"<b>{supervisor.employee_name}</b> by <b>{sender_name}</b>.",
    )

    return "Notification sent successfully."
