import frappe


@frappe.whitelist()
def get_project_details(project_name):
    if not project_name:
        frappe.throw("Project is required.")

    project = frappe.get_doc("Project", project_name)
    return {
        "name": project.name,
        "project_name": project.project_name,
        "status": project.status,
        "priority": project.priority,
        "percent_complete": project.percent_complete,
        "expected_start_date": project.expected_start_date,
        "expected_end_date": project.expected_end_date,
        "department": project.department,
        "project_type": project.project_type,
        "company": project.company,
        "customer": project.customer,
        "notes": project.notes,
        "creation": project.creation,
        "modified": project.modified,
    }


@frappe.whitelist()
def get_project_template_targets(project_name):
    if not project_name:
        frappe.throw("Project is required.")

    templates = [
        {"label": "Project Charter", "doctype": "Project Charter"},
        {
            "label": "High Level Work Plan",
            "doctype": "High Level Work Plan",
            "preferred_fields": ["project_name"],
        },
        {
            "label": "Detailed Work Plan",
            "doctype": "Detailed Work Plan",
            "preferred_fields": ["project_name"],
        },
        {"label": "Project Communications Plan", "doctype": "Project Communications Plan"},
        {"label": "Project Feedback Tracker", "doctype": "Project Feedback Tracker"},
        {"label": "Risk Assessment Matrix", "doctype": "Risk Assessment Matrix"},
        {"label": "Project Implementation Plan", "doctype": "Project Implementation Plan"},
    ]

    candidates = ["project_name", "project", "project_id"]
    out = []

    for template in templates:
        doctype = template["doctype"]
        preferred = template.get("preferred_fields", [])
        search_fields = preferred + [f for f in candidates if f not in preferred]

        fieldname = None
        first_name = None
        match_count = 0

        try:
            meta = frappe.get_meta(doctype)
            for f in search_fields:
                if meta.get_field(f):
                    fieldname = f
                    break

            if fieldname:
                docs = frappe.get_all(
                    doctype,
                    filters={fieldname: project_name},
                    fields=["name"],
                    limit_page_length=2,
                    order_by="modified desc",
                )
                match_count = len(docs)
                first_name = docs[0]["name"] if docs else None
        except Exception:
            # Keep the template visible even when the user lacks access
            fieldname = fieldname or None
            first_name = None
            match_count = 0

        out.append(
            {
                "label": template["label"],
                "doctype": doctype,
                "project_field": fieldname,
                "first_name": first_name,
                "match_count": match_count,
            }
        )

    return out
