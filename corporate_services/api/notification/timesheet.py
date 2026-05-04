import frappe
from frappe.utils import escape_html, get_url_to_form
from corporate_services.api.helpers.print_formats import get_default_print_format
from corporate_services.api.notification.notification_contacts import (
    get_finance_team_emails,
    get_hr_manager_emails,
    get_project_manager_contact,
    get_supervisor_contact,
)
from corporate_services.api.timesheet.timesheet_generation_export import (
    SHORT_TERM_CONSULTANT_TEMPLATE,
)


def get_project_owner_contacts_for_employee(employee):
    """Return project owner contacts for projects linked to the employee user."""
    user_id = getattr(employee, "user_id", None)
    if not user_id:
        return []

    linked_project_ids = frappe.get_all(
        "Project User",
        filters={"user": user_id, "parenttype": "Project"},
        pluck="parent",
    )
    if not linked_project_ids:
        return []

    projects = frappe.get_all(
        "Project",
        filters={"name": ["in", linked_project_ids]},
        fields=["name", "project_name", "owner"],
    )
    if not projects:
        return []

    owner_to_projects = {}
    for project in projects:
        owner = project.get("owner")
        if not owner:
            continue
        owner_to_projects.setdefault(owner, []).append(
            project.get("project_name") or project.get("name")
        )

    owner_contacts = []
    for owner, project_names in owner_to_projects.items():
        user_info = frappe.db.get_value(
            "User", owner, ["email", "full_name"], as_dict=True
        ) or {}
        email = user_info.get("email") or (owner if "@" in owner else None)
        if not email:
            continue
        owner_contacts.append(
            frappe._dict(
                user_id=owner,
                email=email,
                name=user_info.get("full_name") or owner,
                projects=project_names,
            )
        )

    return owner_contacts


def get_project_manager_contacts_for_submission(doc):
    """Return unique Project Manager contacts tied to projects in this submission."""
    project_ids = []
    for row in doc.get("timesheet_per_project") or []:
        project_id = getattr(row, "project", None)
        if project_id:
            project_ids.append(project_id)

    project_ids = list(dict.fromkeys(project_ids))
    if not project_ids:
        return []

    project_manager_rows = frappe.get_all(
        "Project Manager",
        filters={
            "parenttype": "Project",
            "parentfield": "custom_project_managers",
            "parent": ["in", project_ids],
        },
        fields=["parent", "employee", "employee_name"],
    )
    if not project_manager_rows:
        return []

    project_name_map = {
        p["name"]: p.get("project_name") or p["name"]
        for p in frappe.get_all("Project", filters={"name": ["in", project_ids]}, fields=["name", "project_name"])
    }

    contacts_by_email = {}
    for row in project_manager_rows:
        employee_id = row.get("employee")
        if not employee_id:
            continue
        employee_doc = frappe.db.get_value(
            "Employee",
            employee_id,
            ["employee_name", "company_email", "personal_email"],
            as_dict=True,
        ) or {}
        email = employee_doc.get("company_email") or employee_doc.get("personal_email")
        if not email:
            continue

        project_name = project_name_map.get(row.get("parent"), row.get("parent"))
        if email not in contacts_by_email:
            contacts_by_email[email] = frappe._dict(
                email=email,
                name=employee_doc.get("employee_name") or row.get("employee_name") or employee_id,
                projects=[],
            )
        if project_name and project_name not in contacts_by_email[email].projects:
            contacts_by_email[email].projects.append(project_name)

    return list(contacts_by_email.values())


def send_email(recipients, subject, message, pdf_content, doc_name):
    attachments = []
    if pdf_content:
        attachments = [{'fname': '{}.pdf'.format(doc_name), 'fcontent': pdf_content}]
    frappe.sendmail(
        recipients=recipients,
        subject=subject,
        message=message,
        attachments=attachments,
        header=("Timesheet Submission", "text/html")
    )

def generate_message(doc, employee_name, email_type, supervisor_name=None, project_manager_name=None):
    doctype_url = get_url_to_form(doc.doctype, doc.name)
    supervisor_name = supervisor_name or "Supervisor"
    project_manager_name = project_manager_name or "Project Manager"
    messages = {
        "project_manager": """
            Dear {},<br><br>
            I have submitted my {} for your review and approval. You can view it <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(project_manager_name, doc.doctype, doctype_url, employee_name),
        "supervisor": """
            Dear {},<br><br>
            I have submitted my {} for your review and approval. You can view it <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(supervisor_name, doc.doctype, doctype_url, employee_name),
        "submitted_to_supervisor_from_pm": """
            Dear {},<br><br>
            {}'s {} has been reviewed by the Project Manager and is now awaiting your approval. You can view it <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(supervisor_name, employee_name, doc.doctype, doctype_url, project_manager_name),
        
        "approved_by_supervisor": """
            Dear {},<br><br>
            Your {} has been reviewed and Approved by your supervisor. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(employee_name, doc.doctype, doctype_url, supervisor_name),
        "employee_approved_consultant": """
            Dear {},<br><br>
            Your {} has been reviewed and approved. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            Supervisor
        """.format(employee_name, doc.doctype, doctype_url),

        "employee_rejected_supervisor": """
            Dear {},<br><br>
            Your {} has been reviewed and unfortunately, it has been rejected. You can view the reason and details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(employee_name, doc.doctype, doctype_url, supervisor_name),

        "submitted_to_finance": """
            Dear Finance,<br><br>
            {}, {} has been reviewed and, it has been Approved by {}. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(employee_name, doc.doctype, supervisor_name, doctype_url, supervisor_name ),

        "employee_approved_finance": """
            Dear {},<br><br>
            Your {} has been reviewed and, it has been Approved by Finance. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            Finance Department
        """.format(employee_name, doc.doctype, doctype_url),
        
        "hr": """
            Dear HR Manager,<br><br>
            You have a new {} for {}, submitted for your review and approval. You can view it <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(doc.doctype,employee_name, doctype_url, employee_name),
        "employee_rejected_hr": """
            Dear {},<br><br>
            Your {} has been reviewed and unfortunately, it has been rejected. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            HR Department
        """.format(employee_name, doc.doctype, doctype_url),
        "employee_approved_hr": """
            Dear {},<br><br>
            Your {} has been reviewed and, it has been Approved By HR. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            HR Department
        """.format(employee_name, doc.doctype, doctype_url),
        
        
        
        "employee_rejected_finance": """
            Dear {},<br><br>
            Your {} has been reviewed and, it has been Rejected by Finance. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            Finance Department
        """.format(employee_name, doc.doctype, doctype_url),
        
        "hr_finance_rejected": """
            Dear HR,<br><br>
            {}, {} has been reviewed and, it has been Rejected by Finance. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            Finance Department
        """.format(employee_name, doc.doctype, doctype_url),
    }
    return messages[email_type]

def alert(doc, method):
    if doc.workflow_state in [
        "Submitted to Project Manager", "Submitted to Supervisor", "Approved by Supervisor", "Rejected By Supervisor", "Submitted to Finance", "Approved by Finance" , "Rejected by Finance", "Approved"
    ]:
        employee_id = doc.employee
        
        employee = frappe.get_doc("Employee", employee_id)
        employee_email = employee.company_email or employee.personal_email
        template_name = getattr(doc, "timesheet_template", None)

        project_manager_contact = get_project_manager_contact(employee)
        project_manager_email = project_manager_contact.email if project_manager_contact else None
        project_manager_name = project_manager_contact.name if project_manager_contact else None

        supervisor_contact = get_supervisor_contact(employee)
        supervisor_email = supervisor_contact.email if supervisor_contact else None
        supervisor_name = supervisor_contact.name if supervisor_contact else None


        try:
            pdf_content = frappe.get_print(
                doc.doctype, doc.name, get_default_print_format(doc.doctype), as_pdf=True
            )
        except Exception:
            frappe.log_error(frappe.get_traceback(), "Timesheet PDF generation failed")
            pdf_content = None

        if doc.workflow_state == "Submitted to Project Manager":
            submission_pm_contacts = get_project_manager_contacts_for_submission(doc)
            if submission_pm_contacts:
                for pm_contact in submission_pm_contacts:
                    message_to_pm = generate_message(
                        doc,
                        employee.employee_name,
                        "project_manager",
                        project_manager_name=pm_contact.name,
                    )
                    project_list_html = "".join(
                        f"<li>{escape_html(project_name)}</li>"
                        for project_name in pm_contact.projects
                    )
                    message_to_pm += (
                        "<br><br>"
                        "Project(s) in this submission:"
                        f"<ul>{project_list_html}</ul>"
                    )
                    send_email(
                        recipients=[pm_contact.email],
                        subject=frappe._("Timesheet Submission from {}".format(employee.employee_name)),
                        message=message_to_pm,
                        pdf_content=pdf_content,
                        doc_name=doc.name,
                    )
            elif project_manager_email:
                # Backward-compatible fallback where project-level PMs are not configured.
                message_to_project_manager = generate_message(
                    doc,
                    employee.employee_name,
                    "project_manager",
                    project_manager_name=project_manager_name,
                )
                send_email(
                    recipients=[project_manager_email],
                    subject=frappe._('Timesheet Submission from {}'.format(employee.employee_name)),
                    message=message_to_project_manager,
                    pdf_content=pdf_content,
                    doc_name=doc.name
                )

        elif doc.workflow_state == "Submitted to Supervisor":
            if employee.reports_to:
                message_type = "supervisor"
                if template_name == SHORT_TERM_CONSULTANT_TEMPLATE:
                    message_type = "submitted_to_supervisor_from_pm"

                message_to_supervisor = generate_message(
                    doc,
                    employee.employee_name,
                    message_type,
                    supervisor_name,
                    project_manager_name,
                )
                send_email(
                    recipients=[supervisor_email],
                    subject=frappe._('Timesheet Submission from {}'.format(employee.employee_name)),
                    message=message_to_supervisor,
                    pdf_content=pdf_content,
                    doc_name=doc.name
                )
             
        elif doc.workflow_state == "Approved by Supervisor":
            if template_name == SHORT_TERM_CONSULTANT_TEMPLATE:
                return

            message_to_employee = generate_message(doc, employee.employee_name, "approved_by_supervisor", supervisor_name)
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Timesheet Submission has been Approved by the supervisor'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )     
             
        elif doc.workflow_state == "Rejected By Supervisor":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_rejected_supervisor", supervisor_name)
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Timesheet Submission has been Rejected'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
        elif doc.workflow_state == "Submitted to HR":
            hr_manager_emails = get_hr_manager_emails()

            message = generate_message(doc, employee.employee_name, "hr")
            send_email(
                recipients=hr_manager_emails,
                subject=frappe._('Timesheet Submission'),
                message=message,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
        elif doc.workflow_state == "Rejected By HR":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_rejected_hr")
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Timesheet Submission has been Rejected'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
        elif doc.workflow_state == "Approved By HR":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_approved_hr")
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Timesheet has been Approved by HR'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
       
       
       
       
        elif doc.workflow_state == "Submitted to Finance":
            finance_team_emails = get_finance_team_emails()
            message_to_finance = generate_message(doc, employee.employee_name, "submitted_to_finance", supervisor_name)
            send_email(
                recipients=finance_team_emails,
                subject=frappe._('Timesheet Submission from {}'.format(employee.employee_name)),
                message=message_to_finance,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
       
        elif doc.workflow_state == "Approved by Finance":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_approved_finance")
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Timesheet Submission has been Approved by Finance'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
            
            
            
            
        elif doc.workflow_state == "Rejected by Finance":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_rejected_finance")
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Timesheet Submission has been Rejected by Finance'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
            # sending email to the HR.
            hr_manager_emails = get_hr_manager_emails()
            message_to_hr = generate_message(doc, employee.employee_name, "hr_finance_rejected")
            send_email(
                recipients= hr_manager_emails,
                subject=frappe._('Timesheet Submission Rejected by Finance'),
                message=message_to_hr,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
        elif doc.workflow_state == "Approved":
            if template_name != SHORT_TERM_CONSULTANT_TEMPLATE:
                return

            message_to_employee = generate_message(doc, employee.employee_name, "employee_approved_consultant")
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Timesheet Submission has been Approved'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )

doc_events = {
    "Timesheet Submission": {
        "on_update": alert
    }
}
