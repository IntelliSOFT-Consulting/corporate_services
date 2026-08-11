import frappe


def get_bypass_roles():
    roles = frappe.get_all(
        "Has Role",
        filters={"parent": "Project Visibility Settings", "parenttype": "Project Visibility Settings"},
        pluck="role",
    )
    return set(roles) | {"System Manager"}


def get_permission_query_conditions(user=None):
    user = user or frappe.session.user
    if not user:
        return "1=0"

    if user == "Administrator" or _user_has_any_role(user, get_bypass_roles()):
        return ""

    assigned_names = frappe.get_all(
        "Project User",
        filters={"parenttype": "Project", "user": user},
        pluck="parent",
    )

    user_escaped = frappe.db.escape(user)
    if not assigned_names:
        return f"`tabProject`.owner = {user_escaped}"

    names_escaped = ", ".join(frappe.db.escape(name) for name in set(assigned_names))
    return f"(`tabProject`.owner = {user_escaped} OR `tabProject`.name IN ({names_escaped}))"


def has_permission(doc, user=None, permission_type=None):
    user = user or frappe.session.user
    if not user:
        return False

    if user == "Administrator" or _user_has_any_role(user, get_bypass_roles()):
        return True

    if doc.owner == user:
        return True

    return any(row.user == user for row in (doc.get("users") or []))


def _user_has_any_role(user, roles):
    return bool(set(frappe.get_roles(user)) & set(roles))
