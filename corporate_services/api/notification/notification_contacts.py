import frappe


def _get_config_emails(single_doctype: str, primary_field: str, table_field: str) -> list[str]:
    config = frappe.get_single(single_doctype)
    emails = []

    primary_email = getattr(config, primary_field, None)
    if primary_email:
        emails.append(primary_email.strip())

    for member in getattr(config, table_field, None) or []:
        if member.employee_email:
            emails.append(member.employee_email.strip())

    # Preserve order while removing blanks and duplicates.
    return list(dict.fromkeys(email for email in emails if email))


def get_finance_team_emails() -> list[str]:
    return _get_config_emails(
        single_doctype="Finance Settings",
        primary_field="finance_email",
        table_field="table_finance_team_members",
    )


def get_hr_manager_emails() -> list[str]:
    return _get_config_emails(
        single_doctype="HR Config",
        primary_field="hr_email",
        table_field="table_xqbd",
    )


def get_supervisor_contact(employee):
    if not getattr(employee, "reports_to", None):
        return None

    supervisor = frappe.get_doc("Employee", employee.reports_to)

    return frappe._dict(
        employee=supervisor,
        email=supervisor.company_email or supervisor.personal_email,
        user_id=supervisor.user_id,
        name=supervisor.employee_name,
    )


def get_user_contact(user_id):
    if not user_id:
        return None

    user = frappe.get_doc("User", user_id)
    return frappe._dict(
        user_id=user.name,
        email=user.email,
        name=user.full_name or user.name,
    )


def get_project_manager_contact(employee):
    return get_user_contact(getattr(employee, "expense_approver", None))
