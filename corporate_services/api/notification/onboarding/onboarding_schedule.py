import frappe
from frappe import _
from frappe.utils import today, add_days, add_months, getdate, get_fullname, get_url
from corporate_services.api.notification.notification_contacts import get_hr_manager_emails

MAX_BACKWARD_SHIFT_DAYS = 14


def _is_working_day(employee, date):
    """A day is a working day unless it's a Sat/Sun, or a holiday on the
    employee's applicable Holiday List (which, in HRMS, also encodes weekly
    offs)."""
    date = getdate(date)
    if date.weekday() >= 5:
        return False

    from hrms.hr.utils import get_holidays_for_employee

    holidays = get_holidays_for_employee(employee, date, date, raise_exception=False)
    return not bool(holidays)


def _effective_reminder_date(employee, calculated_date):
    """Shift back to the preceding working day if calculated_date falls on a
    weekend or holiday."""
    effective_date = getdate(calculated_date)
    shifted = 0
    while not _is_working_day(employee, effective_date) and shifted < MAX_BACKWARD_SHIFT_DAYS:
        effective_date = add_days(effective_date, -1)
        shifted += 1
    return effective_date


def send_month_1_hr_check_in_reminders():
    """
    Runs daily at 8 AM (see hooks.py cron). For each Active employee whose
    1-month anniversary of joining falls today - shifted back to the
    preceding working day if it lands on a weekend/holiday - emails HR to
    organize the Month 1 HR Check-In and emails the employee to let them know
    HR will be in touch about it.
    """
    reference_today = getdate(today())

    employees = frappe.get_all(
        "Employee",
        filters={
            "date_of_joining": ["between", [add_days(reference_today, -40), add_days(reference_today, -25)]],
            "status": "Active",
        },
        fields=["name", "employee_name", "company_email", "personal_email", "date_of_joining"],
    )

    if not employees:
        return

    for emp in employees:
        anniversary_date = add_months(getdate(emp.date_of_joining), 1)
        if _effective_reminder_date(emp.name, anniversary_date) != reference_today:
            continue

        onboarding_doc = frappe.db.get_value(
            "Onboarding Schedule",
            {"employee": emp.name},
            ["name", "month_1_hr_check_in_reminder_sent", "employee_email"],
            as_dict=True,
        )

        if not onboarding_doc:
            frappe.logger().warning(
                f"No Onboarding Schedule found for {emp.employee_name} ({emp.name}), "
                "skipping Month 1 HR Check-In reminder."
            )
            continue

        if onboarding_doc.get("month_1_hr_check_in_reminder_sent"):
            continue

        try:
            send_month_1_hr_check_in_reminder(
                employee_name=emp.name,
                docname=onboarding_doc.name,
            )
            frappe.logger().info(f"Month 1 HR Check-In reminder sent for {emp.employee_name}")

        except Exception:
            frappe.logger().error(f"Failed to send Month 1 HR Check-In reminder for {emp.employee_name}")
            frappe.log_error(
                title=f"Month 1 HR Check-In Reminder Error: {emp.employee_name}",
                message=frappe.get_traceback(),
            )


@frappe.whitelist()
def send_month_1_hr_check_in_reminder(employee_name, docname=None):
    employee = frappe.get_doc("Employee", employee_name)

    onboarding_doc_name = docname or frappe.db.get_value(
        "Onboarding Schedule", {"employee": employee_name}, "name"
    )
    onboarding_employee_email = (
        frappe.db.get_value("Onboarding Schedule", onboarding_doc_name, "employee_email")
        if onboarding_doc_name
        else None
    )
    employee_email = employee.company_email or employee.personal_email or onboarding_employee_email

    hr_emails = get_hr_manager_emails()
    if not hr_emails:
        frappe.throw(_("No HR Manager email found. Please contact System Admin."))

    check_in_link = f"{get_url()}/app/month-1-hr-check-in/new?employee={employee.name}"

    hr_message = f"""
        <p>Dear HR,</p>
        <p><strong>{employee.employee_name}</strong> reported for duty exactly one month ago today.
        Please organize their Month 1 HR Check-In.</p>
        <p><a href="{check_in_link}" style="background-color: #4CAF50; color: white; padding: 10px 20px;
        text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">
        Start Month 1 HR Check-In</a></p>
        <p>Kind regards,<br>
        System</p>
    """
    frappe.sendmail(
        recipients=hr_emails,
        subject=f"Action required: Organize Month 1 HR Check-In for {employee.employee_name}",
        message=hr_message,
    )

    if employee_email:
        employee_message = f"""
            <p>Dear {employee.employee_name},</p>
            <p>Congratulations on completing your first month with us! HR will be in touch shortly
            to arrange your first formal check-in.</p>
            <p>Best regards,<br>
            HR Team</p>
        """
        frappe.sendmail(
            recipients=[employee_email],
            subject="Your first formal HR check-in",
            message=employee_message,
        )
    else:
        frappe.logger().warning(f"No email address found for employee {employee.employee_name}, skipping employee-facing reminder.")

    if onboarding_doc_name:
        frappe.db.set_value(
            "Onboarding Schedule",
            onboarding_doc_name,
            "month_1_hr_check_in_reminder_sent",
            1,
        )
        frappe.db.commit()

    employee.add_comment("Comment", "Month 1 HR Check-In reminder sent to HR and employee.")

    return f"Month 1 HR Check-In reminder sent for {employee.employee_name}"


@frappe.whitelist()
def send_welcome_email(docname, email_template, custom_message):
    doc = frappe.get_doc("Onboarding Schedule", docname)
    employee = frappe.get_doc("Employee", doc.employee)

    recipient = employee.company_email or employee.personal_email or doc.employee_email
    if not recipient:
        frappe.throw(_("No email address found for employee {0}.").format(employee.employee_name))

    subject, message = _render_email_template(doc, employee, email_template, custom_message)

    frappe.sendmail(
        recipients=[recipient],
        subject=subject,
        message=message,
        now=True,
    )

    frappe.db.set_value("Onboarding Schedule", doc.name, "send_welcome_email", 1)
    frappe.db.commit()

    doc.add_comment(
        "Comment",
        _("Welcome email sent to {0} by {1}.").format(
            recipient, get_fullname(frappe.session.user)
        ),
    )

    return _("Welcome email sent to {0}.").format(employee.employee_name)


@frappe.whitelist()
def send_global_email_invite(docname, email_template, custom_message):
    doc = frappe.get_doc("Onboarding Schedule", docname)
    employee = frappe.get_doc("Employee", doc.employee)

    recipients = _get_global_recipients(employee.name)
    if not recipients:
        frappe.throw(_("No active employee email addresses found."))

    subject, message = _render_email_template(doc, employee, email_template, custom_message)

    frappe.sendmail(
        recipients=recipients,
        subject=subject,
        message=message,
        now=True,
    )

    frappe.db.set_value("Onboarding Schedule", doc.name, "send_company_wide_email_intro", 1)
    frappe.db.commit()

    doc.add_comment(
        "Comment",
        _("Global onboarding introduction sent for {0} to {1} recipients by {2}.").format(
            employee.employee_name,
            len(recipients),
            get_fullname(frappe.session.user),
        ),
    )

    return _("Global onboarding introduction sent for {0}.").format(employee.employee_name)


def _render_email_template(doc, employee, email_template, custom_message):
    if not frappe.db.exists("Email Template", email_template):
        frappe.throw(_("Email Template {0} was not found.").format(email_template))

    template = frappe.get_doc("Email Template", email_template)
    company_name = employee.company or frappe.db.get_single_value("Global Defaults", "default_company")

    context = {
        "doc": doc,
        "employee": employee,
        "employee_name": employee.employee_name,
        "employee_id": employee.name,
        "department": employee.department,
        "designation": employee.designation,
        "company_name": company_name,
        "custom_message": custom_message,
        "signature_name": get_fullname(frappe.session.user),
    }

    raw_subject = template.subject or ""
    raw_body = template.response_html or template.response or ""

    subject = frappe.render_template(raw_subject, context)
    message = frappe.render_template(raw_body, context)
    return subject, message


def _get_global_recipients(exclude_employee=None):
    employees = frappe.get_all(
        "Employee",
        filters={"status": "Active"},
        fields=["name", "company_email", "personal_email"],
    )

    recipients = []
    seen = set()

    for emp in employees:
        if exclude_employee and emp.name == exclude_employee:
            continue

        email = emp.company_email or emp.personal_email
        if email and email not in seen:
            recipients.append(email)
            seen.add(email)

    return recipients
