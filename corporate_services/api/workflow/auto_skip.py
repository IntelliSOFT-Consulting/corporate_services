import frappe


def _has_role(user_id, role):
    if not user_id or not role:
        return False

    return bool(
        frappe.db.exists(
            "Has Role",
            {
                "parenttype": "User",
                "parent": user_id,
                "role": role,
            },
        )
    )


def _is_ceo_employee(employee_doc):
    return _has_role(employee_doc.user_id, "CEO")


def _resolve_next_state_from_workflow(doctype, current_state):
    workflow_name = frappe.db.get_value(
        "Workflow", {"document_type": doctype, "is_active": 1}, "name"
    )
    if not workflow_name:
        return None

    transitions = frappe.get_all(
        "Workflow Transition",
        filters={"parent": workflow_name, "state": current_state},
        fields=["action", "next_state", "idx"],
        order_by="idx asc",
    )
    if not transitions:
        return None

    # Prefer the normal forward approval path.
    for row in transitions:
        action = (row.get("action") or "").strip().lower()
        if "approve" in action and row.get("next_state"):
            return row["next_state"]

    # Fallback: first non-rejection transition.
    for row in transitions:
        action = (row.get("action") or "").strip().lower()
        next_state = row.get("next_state")
        if next_state and "reject" not in action:
            return next_state

    return None


def skip_supervisor_for_ceo(
    doc,
    from_state="Submitted to Supervisor",
    to_state=None,
    employee_field="employee",
):
    if getattr(doc.flags, "ceo_supervisor_skip_applied", False):
        return False

    if (doc.workflow_state or "") != from_state:
        return False

    employee_id = doc.get(employee_field)
    if not employee_id:
        return False

    employee = frappe.get_cached_doc("Employee", employee_id)
    if not _is_ceo_employee(employee):
        return False

    resolved_to_state = to_state or _resolve_next_state_from_workflow(
        doc.doctype, from_state
    )
    if not resolved_to_state:
        return False

    doc.flags.ceo_supervisor_skip_applied = True
    doc.db_set("workflow_state", resolved_to_state, update_modified=False)
    doc.workflow_state = resolved_to_state
    return True


def auto_skip_supervisor_for_ceo_travel_request(doc, method=None):
    if doc.doctype != "Travel Request":
        return

    skip_supervisor_for_ceo(
        doc=doc,
        from_state="Submitted to Supervisor",
        to_state=None,
        employee_field="employee",
    )
