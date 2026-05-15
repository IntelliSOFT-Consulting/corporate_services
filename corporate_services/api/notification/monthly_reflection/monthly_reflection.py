from datetime import datetime

import frappe
from frappe.utils import get_url, get_url_to_form, now_datetime, nowdate
from corporate_services.api.helpers.print_formats import get_default_print_format
from corporate_services.api.notification.notification_contacts import (
    get_hr_manager_emails,
    get_supervisor_contact,
)


def build_email_body(greeting, intro, action_line, link_url, sign_off, signer):
    return """
        <p>{greeting},</p>
        <p>{intro}</p>
        <p>{action_line} <a href="{link}">Click here to view it</a>.</p>
        <br>
        <p>Kind regards,<br><strong>{signer}</strong></p>
    """.format(
        greeting=greeting,
        intro=intro,
        action_line=action_line,
        link=link_url,
        signer=signer,
    )


def generate_message(doc, employee_name, supervisor_name, email_type):
    url = get_url_to_form(doc.doctype, doc.name)
    doctype_label = doc.doctype

    templates = {
        "supervisor": build_email_body(
            greeting="Dear {}".format(supervisor_name),
            intro="{} has submitted a {} for your review and acknowledgement.".format(employee_name, doctype_label),
            action_line="Please review the reflection at your earliest convenience.",
            link_url=url,
            sign_off="Kind regards",
            signer=employee_name,
        ),
        "employee_acknowledged": build_email_body(
            greeting="Dear {}".format(employee_name),
            intro="Good news! Your {} has been reviewed and acknowledged by your supervisor.".format(doctype_label),
            action_line="You can view the acknowledged reflection at any time.",
            link_url=url,
            sign_off="Kind regards",
            signer="Your Supervisor",
        ),
        "employee_rejected": build_email_body(
            greeting="Dear {}".format(employee_name),
            intro="Your {} has been reviewed and returned by your supervisor for revision.".format(doctype_label),
            action_line="Please review the details and make the necessary updates.",
            link_url=url,
            sign_off="Kind regards",
            signer="Your Supervisor",
        ),
        "hr_submitted": build_email_body(
            greeting="Dear HR Manager",
            intro="{}'s Monthly Reflection has been acknowledged by their supervisor and submitted to HR.".format(employee_name),
            action_line="Please review the reflection at your earliest convenience.",
            link_url=url,
            sign_off="Kind regards",
            signer=employee_name,
        ),
        "employee_hr_approved": build_email_body(
            greeting="Dear {}".format(employee_name),
            intro="Your {} has been fully reviewed and approved by HR.".format(doctype_label),
            action_line="You can view the approved reflection at any time.",
            link_url=url,
            sign_off="Kind regards",
            signer="HR Manager",
        ),
        "employee_hr_rejected": build_email_body(
            greeting="Dear {}".format(employee_name),
            intro="Your {} has been reviewed by HR and returned for revision.".format(doctype_label),
            action_line="Please review the comments and make the necessary updates.",
            link_url=url,
            sign_off="Kind regards",
            signer="HR Manager",
        ),
    }

    return templates[email_type]


def send_email(recipients, subject, message, pdf_content, doc_name):
    frappe.sendmail(
        recipients=recipients,
        subject=subject,
        message=message,
        attachments=[{
            "fname": "{}.pdf".format(doc_name),
            "fcontent": pdf_content,
        }],
        header=("Monthly Reflection", "text/html"),
    )


def add_user_permission(user, employee_id):
    """
    Add User Permission so supervisor can access records 
    linked to this employee - same mechanism as Leave Application.
    """
    if not user or not employee_id:
        return

    if frappe.db.exists("User Permission", {
        "user": user,
        "allow": "Employee",
        "for_value": employee_id,
    }):
        return

    perm = frappe.get_doc({
        "doctype": "User Permission",
        "user": user,
        "allow": "Employee",
        "for_value": employee_id,
        "apply_to_all_doctypes": 0,
        "applicable_for": "Monthly Reflection",
    })
    perm.insert(ignore_permissions=True)
    frappe.db.commit()


def alert(doc, method):
    WATCHED_STATES = {
        "Submitted to Supervisor",
        "Acknowledged by Supervisor",
        "Returned by Supervisor",
        "Submitted to HR",
        "Approved by HR",
        "Rejected By HR",
    }

    if doc.workflow_state not in WATCHED_STATES:
        return

    employee = frappe.get_doc("Employee", doc.employee)
    employee_email = employee.company_email or employee.personal_email

    hr_emails = get_hr_manager_emails()

    print_format = get_default_print_format(doc.doctype)
    pdf_content = frappe.get_print(doc.doctype, doc.name, print_format, as_pdf=True)

    if doc.workflow_state == "Submitted to Supervisor":
        if not employee.reports_to:
            frappe.log_error(
                "Employee {} has no reports_to set".format(doc.employee),
                "Monthly Reflection - No Supervisor"
            )
            return

        supervisor_contact = get_supervisor_contact(employee)
        supervisor_email = supervisor_contact.email
        supervisor_user = supervisor_contact.user_id

        # Grant supervisor access via User Permission
        add_user_permission(supervisor_user, doc.employee)

        send_email(
            recipients=[supervisor_email],
            subject=frappe._("Monthly Reflection from {}".format(employee.employee_name)),
            message=generate_message(doc, employee.employee_name, supervisor_contact.name, "supervisor"),
            pdf_content=pdf_content,
            doc_name=doc.name,
        )

    elif doc.workflow_state == "Acknowledged by Supervisor":
        send_email(
            recipients=[employee_email],
            subject=frappe._("Your Monthly Reflection has been Acknowledged"),
            message=generate_message(doc, employee.employee_name, None, "employee_acknowledged"),
            pdf_content=pdf_content,
            doc_name=doc.name,
        )

    elif doc.workflow_state == "Returned by Supervisor":
        send_email(
            recipients=[employee_email],
            subject=frappe._("Your Monthly Reflection has been Returned for Revision"),
            message=generate_message(doc, employee.employee_name, None, "employee_rejected"),
            pdf_content=pdf_content,
            doc_name=doc.name,
        )

    elif doc.workflow_state == "Submitted to HR":
        if hr_emails:
            send_email(
                recipients=hr_emails,
                subject=frappe._("Monthly Reflection from {} - Pending HR Review".format(employee.employee_name)),
                message=generate_message(doc, employee.employee_name, None, "hr_submitted"),
                pdf_content=pdf_content,
                doc_name=doc.name,
            )

    elif doc.workflow_state == "Approved by HR":
        send_email(
            recipients=[employee_email],
            subject=frappe._("Your Monthly Reflection has been Approved by HR"),
            message=generate_message(doc, employee.employee_name, None, "employee_hr_approved"),
            pdf_content=pdf_content,
            doc_name=doc.name,
        )

    elif doc.workflow_state == "Rejected By HR":
        send_email(
            recipients=[employee_email],
            subject=frappe._("Your Monthly Reflection has been Returned by HR"),
            message=generate_message(doc, employee.employee_name, None, "employee_hr_rejected"),
            pdf_content=pdf_content,
            doc_name=doc.name,
        )


doc_events = {
    "Monthly Reflection": {
        "on_update": alert,
    }
}


def send_monthly_reflection_reminder_if_due():
    config = frappe.get_single("HR Config")

    if not getattr(config, "enable_monthly_reflection_reminder", 0):
        return

    reminder_day = frappe.utils.cint(getattr(config, "monthly_reflection_reminder_day", 0))
    if reminder_day < 1 or reminder_day > 7:
        frappe.logger().warning("Monthly Reflection reminder day is not configured between 1 and 7.")
        return

    today = frappe.utils.getdate(nowdate())
    if today.day != reminder_day:
        return

    review_period = today.strftime("%B %Y")
    if config.monthly_reflection_last_sent_period == review_period:
        return

    sent_count = _send_monthly_reflection_reminders(review_period)

    frappe.db.set_value(
        "HR Config",
        "HR Config",
        "monthly_reflection_last_sent_period",
        review_period,
        update_modified=True,
    )
    frappe.db.commit()

    frappe.logger().info(
        "Monthly Reflection reminders sent for {} to {} employee(s).".format(
            review_period, sent_count
        )
    )


def _send_monthly_reflection_reminders(review_period):
    employees = frappe.get_all(
        "Employee",
        filters={"status": "Active"},
        fields=["name", "employee_name", "company_email", "personal_email"],
        limit_page_length=1000,
        order_by="employee_name asc",
    )

    sent_count = 0
    for employee in employees:
        recipient = employee.company_email or employee.personal_email
        if not recipient:
            continue

        if frappe.db.exists(
            "Monthly Reflection",
            {
                "employee": employee.name,
                "review_period": review_period,
            },
        ):
            continue

        _send_single_monthly_reflection_reminder(employee, recipient, review_period)
        sent_count += 1

    return sent_count


def _send_single_monthly_reflection_reminder(employee, recipient, review_period):
    form_link = (
        f"{get_url()}/app/monthly-reflection/new-monthly-reflection-1"
        f"?employee={employee.name}"
        f"&review_period={frappe.utils.quote(review_period)}"
        f"&review_date={frappe.utils.quote(nowdate())}"
    )

    message = """
        <p>Dear {employee_name},</p>
        <p>The Monthly Reflection for <strong>{review_period}</strong> is now open.</p>
        <p>Monthly reflection is required for all employees.</p>
        <p>Please complete and submit it within the first week of the month.</p>
        <p><a href="{form_link}">Click here to open the Monthly Reflection form</a>.</p>
        <br>
        <p>Kind regards,<br><strong>HR Department</strong></p>
    """.format(
        employee_name=employee.employee_name,
        review_period=review_period,
        form_link=form_link,
    )

    frappe.sendmail(
        recipients=[recipient],
        subject="Monthly Reflection Opened - {}".format(review_period),
        message=message,
        header=("Monthly Reflection", "text/html"),
    )


def send_monthly_reflection_overdue_reminders_if_due():
    config = frappe.get_single("HR Config")

    if not getattr(config, "enable_monthly_reflection_overdue_reminder", 0):
        return

    today = frappe.utils.getdate(nowdate())
    if today.day <= 7:
        return

    if getattr(config, "monthly_reflection_overdue_weekday", None) != today.strftime("%A"):
        return

    review_period = today.strftime("%B %Y")
    for employee in _get_missing_monthly_reflection_employees(review_period):
        _send_overdue_reminder_for_employee(employee, review_period)


@frappe.whitelist()
def send_manual_monthly_reflection_overdue_reminder(employee, review_period):
    if frappe.db.exists(
        "Monthly Reflection",
        {"employee": employee, "review_period": review_period},
    ):
        return {"status": "skipped", "message": "Monthly Reflection already submitted."}

    employee_doc = frappe.get_doc("Employee", employee)
    reminder_type = _send_overdue_reminder_for_employee(employee_doc, review_period)
    return {
        "status": "success",
        "reminder_type": reminder_type,
        "message": "Overdue reminder sent as {} notification.".format(reminder_type.lower()),
    }


@frappe.whitelist()
def send_manual_monthly_reflection_dual_reminder(employee, review_period):
    if frappe.db.exists(
        "Monthly Reflection",
        {"employee": employee, "review_period": review_period},
    ):
        return {"status": "skipped", "message": "Monthly Reflection already submitted."}

    employee_doc = frappe.get_doc("Employee", employee)
    log = _get_or_create_reminder_log(employee_doc.name, review_period)

    _send_overdue_email(employee_doc, review_period)
    _send_overdue_system_notifications(employee_doc, review_period)

    now = now_datetime()
    if not log.first_email_sent_on:
        log.first_email_sent_on = now
    log.last_notification_type = "System"
    log.last_notification_sent_on = now
    log.total_reminders_sent = (log.total_reminders_sent or 0) + 1
    log.save(ignore_permissions=True)
    frappe.db.commit()

    return {
        "status": "success",
        "reminder_type": "Email + System",
        "message": "Reminder sent via email and system notification.",
    }


@frappe.whitelist()
def get_monthly_reflection_period_status(review_period):
    employees = frappe.get_all(
        "Employee",
        filters={"status": "Active"},
        fields=["name", "employee_name", "designation", "department", "custom_reports_to_name"],
        order_by="employee_name asc",
        limit_page_length=1000,
    )

    reflections = frappe.get_all(
        "Monthly Reflection",
        filters={"review_period": review_period},
        fields=["name", "employee", "workflow_state", "modified"],
        limit_page_length=1000,
    )
    reflection_map = {row.employee: row for row in reflections}

    logs = frappe.get_all(
        "Monthly Reflection Reminder Log",
        filters={"review_period": review_period},
        fields=["employee", "last_notification_type", "last_notification_sent_on", "total_reminders_sent"],
        limit_page_length=1000,
    )
    log_map = {row.employee: row for row in logs}

    overdue = _is_review_period_overdue(review_period)
    rows = []
    for employee in employees:
        reflection = reflection_map.get(employee.name)
        log = log_map.get(employee.name)
        rows.append(
            {
                "employee": employee.name,
                "employee_name": employee.employee_name or employee.name,
                "department": employee.department,
                "designation": employee.designation,
                "supervisor": employee.custom_reports_to_name,
                "submitted": bool(reflection),
                "status": reflection.workflow_state if reflection else ("Overdue" if overdue else "Pending"),
                "docname": reflection.name if reflection else None,
                "last_notification_type": getattr(log, "last_notification_type", None),
                "last_notification_sent_on": str(getattr(log, "last_notification_sent_on", "") or ""),
                "total_reminders_sent": getattr(log, "total_reminders_sent", 0) or 0,
                "can_remind": not bool(reflection),
            }
        )

    return rows


def _get_missing_monthly_reflection_employees(review_period):
    employees = frappe.get_all(
        "Employee",
        filters={"status": "Active"},
        fields=["name", "employee_name", "company_email", "personal_email", "reports_to", "user_id"],
        limit_page_length=1000,
        order_by="employee_name asc",
    )

    submitted = {
        row.employee
        for row in frappe.get_all(
            "Monthly Reflection",
            filters={"review_period": review_period},
            fields=["employee"],
            limit_page_length=1000,
        )
    }

    return [frappe._dict(employee) for employee in employees if employee.name not in submitted]


def _send_overdue_reminder_for_employee(employee, review_period):
    log = _get_or_create_reminder_log(employee.name, review_period)

    if not log.first_email_sent_on:
        _send_overdue_email(employee, review_period)
        _update_reminder_log(log, "Email")
        return "Email"

    _send_overdue_system_notifications(employee, review_period)
    _update_reminder_log(log, "System")
    return "System"


def _send_overdue_email(employee, review_period):
    recipients = _get_overdue_email_recipients(employee.name)
    if not recipients:
        return

    link = _get_monthly_reflection_form_link(employee.name, review_period)
    message = """
        <p>Dear Team,</p>
        <p><strong>{employee_name}</strong> has not yet submitted the Monthly Reflection for <strong>{review_period}</strong>.</p>
        <p>This reflection is overdue. This email is sent to the employee, supervisor, and HR.</p>
        <p><a href="{link}">Click here to open the Monthly Reflection form</a>.</p>
        <br>
        <p>Kind regards,<br><strong>HR Department</strong></p>
    """.format(
        employee_name=employee.employee_name,
        review_period=review_period,
        link=link,
    )

    frappe.sendmail(
        recipients=recipients,
        subject="Monthly Reflection Overdue - {} - {}".format(employee.employee_name, review_period),
        message=message,
        header=("Monthly Reflection", "text/html"),
    )


def _send_overdue_system_notifications(employee, review_period):
    link = _get_monthly_reflection_form_link(employee.name, review_period)
    subject = "Monthly Reflection Overdue - {} ({})".format(employee.employee_name, review_period)
    message = (
        "{} has not yet submitted the Monthly Reflection for {}."
        "<br><a href=\"{}\">Open Monthly Reflection form</a>"
    ).format(employee.employee_name, review_period, link)

    for user in _get_overdue_notification_users(employee.name):
        frappe.get_doc(
            {
                "doctype": "Notification Log",
                "subject": subject,
                "email_content": message,
                "for_user": user,
                "type": "Alert",
                "document_type": "Employee",
                "document_name": employee.name,
                "from_user": frappe.session.user if frappe.session.user != "Guest" else "Administrator",
            }
        ).insert(ignore_permissions=True)


def _get_overdue_email_recipients(employee_name):
    employee = frappe.get_doc("Employee", employee_name)
    recipients = []

    if employee.company_email or employee.personal_email:
        recipients.append(employee.company_email or employee.personal_email)

    supervisor_contact = get_supervisor_contact(employee)
    if supervisor_contact and supervisor_contact.email:
        recipients.append(supervisor_contact.email)

    recipients.extend(get_hr_manager_emails())
    return list(dict.fromkeys([email for email in recipients if email]))


def _get_overdue_notification_users(employee_name):
    employee = frappe.get_doc("Employee", employee_name)
    users = []

    if employee.user_id:
        users.append(employee.user_id)
    elif employee.company_email and frappe.db.exists("User", employee.company_email):
        users.append(employee.company_email)

    supervisor_contact = get_supervisor_contact(employee)
    if supervisor_contact and supervisor_contact.user_id:
        users.append(supervisor_contact.user_id)
    elif supervisor_contact and supervisor_contact.email and frappe.db.exists("User", supervisor_contact.email):
        users.append(supervisor_contact.email)

    for email in get_hr_manager_emails():
        if frappe.db.exists("User", email):
            users.append(email)

    return list(dict.fromkeys([user for user in users if user]))


def _get_or_create_reminder_log(employee_name, review_period):
    existing = frappe.db.get_value(
        "Monthly Reflection Reminder Log",
        {"employee": employee_name, "review_period": review_period},
        "name",
    )
    if existing:
        return frappe.get_doc("Monthly Reflection Reminder Log", existing)

    doc = frappe.get_doc(
        {
            "doctype": "Monthly Reflection Reminder Log",
            "employee": employee_name,
            "review_period": review_period,
        }
    )
    doc.insert(ignore_permissions=True)
    return doc


def _update_reminder_log(log, reminder_type):
    now = now_datetime()
    if reminder_type == "Email" and not log.first_email_sent_on:
        log.first_email_sent_on = now

    log.last_notification_type = reminder_type
    log.last_notification_sent_on = now
    log.total_reminders_sent = (log.total_reminders_sent or 0) + 1
    log.save(ignore_permissions=True)
    frappe.db.commit()


def _get_monthly_reflection_form_link(employee_name, review_period):
    return (
        f"{get_url()}/app/monthly-reflection/new-monthly-reflection-1"
        f"?employee={employee_name}"
        f"&review_period={frappe.utils.quote(review_period)}"
        f"&review_date={frappe.utils.quote(nowdate())}"
    )


def _is_review_period_overdue(review_period):
    try:
        period_date = datetime.strptime(review_period, "%B %Y").date()
    except ValueError:
        return False

    today = frappe.utils.getdate(nowdate())
    current_period_start = today.replace(day=1)
    return period_date < current_period_start or (period_date == current_period_start and today.day > 7)
