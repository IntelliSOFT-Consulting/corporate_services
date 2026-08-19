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


def get_corporate_services_head_email() -> list[str]:
    email = frappe.db.get_single_value("HR Config", "head_of_corporate_services_email")
    return [email.strip()] if email else []


def get_procurement_team_emails() -> list[str]:
    users = frappe.get_all(
        "Has Role",
        filters={"role": ["in", ["Purchase Manager", "Purchase User"]], "parenttype": "User"},
        pluck="parent",
    )
    emails = [frappe.db.get_value("User", user, "email") for user in set(users)]
    return list(dict.fromkeys(email for email in emails if email))


def get_smt_emails() -> list[str]:
    emails = frappe.get_all("Has Role", filters={"role": "SMT", "parenttype": "User"}, pluck="parent")
    emails += frappe.get_all("SMT Members", pluck="email")
    return list(dict.fromkeys(email for email in emails if email))


def get_employee_contact(employee):
    """Accepts an Employee name or doc; returns its email/user_id/name, or
    None if not found. Email falls back from company_email to personal_email."""
    if not employee:
        return None

    if isinstance(employee, str):
        employee = frappe.get_doc("Employee", employee)

    return frappe._dict(
        employee=employee,
        email=employee.company_email or employee.personal_email,
        user_id=employee.user_id,
        name=employee.employee_name or employee.name,
    )


def get_supervisor_contact(employee):
    if not getattr(employee, "reports_to", None):
        return None

    return get_employee_contact(employee.reports_to)


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
