import frappe
from frappe import _


@frappe.whitelist()
def get_opportunity(name):
    """Fetch a single Opportunity doc with permission check."""
    doc = frappe.get_doc("Opportunity", name)
    doc.check_permission("read")
    data = doc.as_dict()
    linked_project = frappe.db.get_value(
        "Project", {"custom_bid": name}, "name"
    )
    data["linked_project"] = linked_project or None
    folders = frappe.db.sql("""
        SELECT name, file_name FROM `tabFile`
        WHERE is_folder = 1
          AND attached_to_doctype = 'Opportunity'
          AND attached_to_name = %s
        ORDER BY creation ASC
        LIMIT 1
    """, name, as_dict=True)
    data["opportunity_folder"] = folders[0] if folders else None

    reminder_activities = frappe.db.sql(
        """
        SELECT name, owner, creation, content
        FROM `tabComment`
        WHERE reference_doctype = 'Opportunity'
          AND reference_name = %s
          AND comment_type = 'Info'
          AND content LIKE 'Opportunity Due Reminder sent%%'
        ORDER BY creation DESC
        LIMIT 50
        """,
        name,
        as_dict=True,
    )
    data["reminder_activities"] = reminder_activities
    return data


@frappe.whitelist()
def award_opportunity(name):
    """
    Create a Project linked to this Opportunity via custom_bid,
    then mark the opportunity's custom_bid_status as Awarded.
    Returns the created project doc.
    """
    opp = frappe.get_doc("Opportunity", name)
    opp.check_permission("write")

    # Prevent duplicate projects for the same opportunity
    existing = frappe.db.get_value(
        "Project", {"custom_bid": name}, "name"
    )
    if existing:
        frappe.db.set_value("Opportunity", name, "custom_bid_status", "Awarded")
        frappe.db.commit()
        return {"project": frappe.get_doc("Project", existing).as_dict(), "already_existed": True}

    project = frappe.new_doc("Project")
    project.project_name = opp.title or opp.customer_name or name
    project.custom_bid = name
    project.status = "Open"
    if opp.get("opportunity_from") == "Customer" and opp.get("party_name"):
        project.customer = opp.party_name
    if opp.get("company"):
        project.company = opp.company
    project.insert(ignore_permissions=False)
    frappe.db.commit()

    # Mark the opportunity as Awarded
    frappe.db.set_value("Opportunity", name, "custom_bid_status", "Awarded")
    frappe.db.commit()

    return {"project": project.as_dict(), "already_existed": False}


@frappe.whitelist()
def get_folder_contents(folder_name, opportunity_name):
    """Return subfolders and files inside a given File folder.
    Caller must have read access to the linked Opportunity."""
    frappe.get_doc("Opportunity", opportunity_name).check_permission("read")
    items = frappe.db.sql("""
        SELECT name, file_name, is_folder, file_url, file_size, modified
        FROM `tabFile`
        WHERE folder = %s
        ORDER BY is_folder DESC, file_name ASC
    """, folder_name, as_dict=True)
    return items


@frappe.whitelist()
def create_subfolder(folder_name, parent_folder, opportunity_name):
    """Create a subfolder inside parent_folder, attached to the given Opportunity.
    Caller must have write access to the linked Opportunity."""
    frappe.get_doc("Opportunity", opportunity_name).check_permission("write")
    folder_name = folder_name.strip()
    if not folder_name:
        frappe.throw("Folder name cannot be empty.")

    existing = frappe.db.exists("File", {
        "file_name": folder_name,
        "is_folder": 1,
        "folder": parent_folder,
    })
    if existing:
        frappe.throw(f'A folder named "{folder_name}" already exists here.')

    folder = frappe.get_doc({
        "doctype": "File",
        "file_name": folder_name,
        "is_folder": 1,
        "folder": parent_folder,
        "is_private": 1,
    })
    folder.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"name": folder.name, "file_name": folder.file_name}


@frappe.whitelist()
def get_workflow_states():
    """
    Return the ordered list of workflow states for the Opportunity workflow,
    with a resolved indicator style for each state.
    """
    STYLE_MAP = {
        "Success": "green",
        "Danger": "red",
        "Warning": "orange",
        "Primary": "blue",
        "Info": "blue",
        "Inverse": "dark",
        "Default": "gray",
        "": "gray",
    }
    # Semantic fallback when no style is set on a state
    SEMANTIC = {
        "draft": "gray",
        "approved": "green",
        "rejected": "red",
        "cancelled": "red",
        "submitted": "orange",
        "pending": "orange",
        "open": "blue",
    }

    workflows = frappe.get_all(
        "Workflow",
        filters={"document_type": "Opportunity", "is_active": 1},
        fields=["name", "workflow_state_field"],
        limit=1,
    )
    if not workflows:
        return {"states": [], "state_field": "workflow_state"}

    wf = frappe.get_doc("Workflow", workflows[0]["name"])

    seen = []
    for t in wf.transitions:
        if t.state not in seen:
            seen.append(t.state)
    for t in wf.transitions:
        if t.next_state not in seen:
            seen.append(t.next_state)

    ws_records = frappe.get_all(
        "Workflow State",
        filters={"workflow_state_name": ["in", seen]},
        fields=["workflow_state_name", "style"],
    )
    state_styles = {r["workflow_state_name"]: r.get("style") or "" for r in ws_records}

    result = []
    for state in seen:
        raw_style = state_styles.get(state, "")
        if raw_style and raw_style in STYLE_MAP:
            color = STYLE_MAP[raw_style]
        else:
            lower = state.lower()
            color = next(
                (v for k, v in SEMANTIC.items() if k in lower),
                "gray",
            )
        result.append({"state": state, "color": color})

    return {
        "states": result,
        "state_field": wf.workflow_state_field or "workflow_state",
    }


@frappe.whitelist()
def get_opportunity_stats():
    """Return opportunity counts grouped by status and opportunity_from, permission-aware."""
    by_status = frappe.get_list(
        "Opportunity",
        fields=["status", "count(name) as count"],
        group_by="status",
        order_by="count desc",
        ignore_permissions=False,
    )
    by_from = frappe.get_list(
        "Opportunity",
        fields=["opportunity_from", "count(name) as count"],
        group_by="opportunity_from",
        order_by="count desc",
        ignore_permissions=False,
    )
    by_workflow = frappe.get_list(
        "Opportunity",
        fields=["workflow_state", "count(name) as count"],
        group_by="workflow_state",
        order_by="count desc",
        ignore_permissions=False,
    )
    total = sum(r.get("count", 0) for r in by_status)
    return {
        "by_status": by_status,
        "by_opportunity_from": by_from,
        "by_workflow_state": by_workflow,
        "total": total,
    }


@frappe.whitelist()
def get_opportunity_checklist(opportunity_name: str):
    """Return the Opportunity Task Checklist linked to this opportunity, or None."""
    if not opportunity_name:
        return None

    checklist_name = frappe.db.get_value(
        "Opportunity Task Checklist",
        {"opportunity": opportunity_name},
        "name",
        order_by="creation asc",
    )
    if not checklist_name:
        return None

    checklist = frappe.get_doc("Opportunity Task Checklist", checklist_name)
    data = checklist.as_dict()

    data["items"] = [
        {
            "name": row.name,
            "proposal_section": row.proposal_section,
            "description": row.description,
            "status": row.status,
            "employee": row.employee,
            "employee_name": row.employee_name,
        }
        for row in (checklist.items or [])
    ]
    return data


@frappe.whitelist()
def create_checklist(opportunity: str, title: str, status: str, description: str, items: str):
    """Create a new Opportunity Task Checklist with all items in one call.

    items is a JSON array of:
      { proposal_section, description, status, employees: [{name, employee_name}] }
    Each item with N employees becomes N rows (one per employee).
    """
    import json as _json

    frappe.has_permission("Opportunity Task Checklist", "create", throw=True)

    emp_rows = _json.loads(items) if items else []

    doc = frappe.new_doc("Opportunity Task Checklist")
    doc.opportunity = opportunity
    doc.title = title
    doc.status = status
    doc.description = description

    for item in emp_rows:
        employees = item.get("employees") or []
        if employees:
            for emp in employees:
                doc.append("items", {
                    "proposal_section": item.get("proposal_section", ""),
                    "description": item.get("description", ""),
                    "status": item.get("status", "Pending"),
                    "employee": emp.get("name"),
                    "employee_name": emp.get("employee_name"),
                })
        else:
            doc.append("items", {
                "proposal_section": item.get("proposal_section", ""),
                "description": item.get("description", ""),
                "status": item.get("status", "Pending"),
            })

    doc.insert(ignore_permissions=False)
    frappe.db.commit()
    return doc.name


@frappe.whitelist()
def bulk_add_checklist_items(checklist_name: str, items: str):
    """Append multiple items to an existing checklist in one call."""
    import json as _json

    if not frappe.has_permission("Opportunity Task Checklist", "write", checklist_name):
        frappe.throw(_("Not permitted."))

    items_list = _json.loads(items) if items else []
    checklist = frappe.get_doc("Opportunity Task Checklist", checklist_name)
    added = 0

    for item in items_list:
        employees = item.get("employees") or []
        if employees:
            for emp in employees:
                checklist.append("items", {
                    "proposal_section": item.get("proposal_section", ""),
                    "description": item.get("description", ""),
                    "status": item.get("status", "Pending"),
                    "employee": emp.get("name"),
                    "employee_name": emp.get("employee_name"),
                })
                added += 1
        else:
            checklist.append("items", {
                "proposal_section": item.get("proposal_section", ""),
                "description": item.get("description", ""),
                "status": item.get("status", "Pending"),
            })
            added += 1

    checklist.save(ignore_permissions=False)
    frappe.db.commit()
    return {"added": added}


@frappe.whitelist()
def search_employees(query: str):
    """Search active employees by name for the @mention selector."""
    if not query:
        return []
    return frappe.get_list(
        "Employee",
        filters=[
            ["employee_name", "like", f"%{query}%"],
            ["status", "=", "Active"],
        ],
        fields=["name", "employee_name"],
        limit=10,
        order_by="employee_name asc",
    )


@frappe.whitelist()
def add_checklist_item(checklist_name: str, proposal_section: str, description: str,
                       status: str, employees: str):
    """Append one row per employee (or one row with no employee) to the checklist items."""
    import json as _json

    if not frappe.has_permission("Opportunity Task Checklist", "write", checklist_name):
        frappe.throw(_("Not permitted."))

    emp_list = _json.loads(employees) if employees else []
    checklist = frappe.get_doc("Opportunity Task Checklist", checklist_name)

    if emp_list:
        for emp in emp_list:
            checklist.append("items", {
                "proposal_section": proposal_section,
                "description": description,
                "status": status,
                "employee": emp.get("name"),
                "employee_name": emp.get("employee_name"),
            })
    else:
        checklist.append("items", {
            "proposal_section": proposal_section,
            "description": description,
            "status": status,
        })

    checklist.save(ignore_permissions=False)
    frappe.db.commit()
    return {"saved": True}


@frappe.whitelist()
def update_checklist_item_status(checklist_name: str, row_name: str, status: str):
    """Update the status of a single checklist item row."""
    VALID = {"Pending", "In Progress", "Completed", "Cancelled"}
    if status not in VALID:
        frappe.throw(_("Invalid status value."))

    frappe.db.set_value(
        "Opportunity Task Checklist Item",
        row_name,
        "status",
        status,
    )
    frappe.db.commit()
    return {"updated": True}


@frappe.whitelist()
def get_opportunities(page_length=20, page=1, search=None, status=None, opportunity_from=None, workflow_state=None):
    """
    Return a permission-aware list of Opportunities.
    frappe.get_list automatically applies the current user's role permissions,
    so BD coordinators / Sales Users only see records they are allowed to read.
    """
    filters = {}
    if status:
        filters["status"] = status
    if opportunity_from:
        filters["opportunity_from"] = opportunity_from
    if workflow_state:
        filters["workflow_state"] = workflow_state

    or_filters = None
    if search:
        or_filters = [
            ["name", "like", f"%{search}%"],
            ["title", "like", f"%{search}%"],
            ["customer_name", "like", f"%{search}%"],
            ["opportunity_owner", "like", f"%{search}%"],
        ]

    opportunities = frappe.get_list(
        "Opportunity",
        filters=filters,
        or_filters=or_filters,
        fields=[
            "name",
            "title",
            "customer_name",
            "opportunity_from",
            "status",
            "sales_stage",
            "opportunity_amount",
            "currency",
            "expected_closing",
            "opportunity_owner",
            "transaction_date",
            "probability",
            "territory",
            "source",
        ],
        order_by="modified desc",
        page_length=int(page_length),
        start=(int(page) - 1) * int(page_length),
        ignore_permissions=False,
    )

    total = frappe.db.count("Opportunity", filters=filters)

    return {"opportunities": opportunities, "total": total}
