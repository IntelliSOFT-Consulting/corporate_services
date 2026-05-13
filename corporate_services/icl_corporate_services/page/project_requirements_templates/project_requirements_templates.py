import frappe


REQUIREMENT_CONFIG = {
    "Project Charter": {
        "doctype": "Project Charter",
        "description": "Define project goals, scope, ownership, and approvals.",
    },
    "High Level Work Plan": {
        "doctype": "High Level Work Plan",
        "description": "Track high-level activities and timeline milestones.",
    },
    "Detailed Work Plan": {
        "doctype": "Detailed Work Plan",
        "description": "Break down activities, owners, durations, and dependencies.",
    },
    "Communication Plan": {
        "doctype": "Project Communications Plan",
        "description": "Define stakeholder communication channels and cadence.",
    },
    "Feedback Document": {
        "doctype": "Project Feedback Tracker",
        "description": "Capture implementation feedback, issues, and actions.",
    },
    "Risk Assessment": {
        "doctype": "Risk Assessment Matrix",
        "description": "Document risks, likelihood, impact, and mitigations.",
    },
    "Implementation Plan": {
        "doctype": "Project Implementation Plan",
        "description": "Plan rollout approach, readiness, and execution steps.",
    },
    "Lifecycle Checklist": {
        "doctype": "HIS PM Project LifeCycle",
        "description": "Track lifecycle completion from Prepare to Maintenance.",
    },
}


@frappe.whitelist()
def get_template_library():
    rows = frappe.get_all(
        "HIS Project Requirement Template",
        fields=["name", "requirement", "target_doctype", "description", "template_file", "is_active"],
        filters={"is_active": 1},
        limit_page_length=200,
    )
    by_requirement = {r["requirement"]: r for r in rows}

    result = []
    for requirement, cfg in REQUIREMENT_CONFIG.items():
        row = by_requirement.get(requirement)
        result.append(
            {
                "requirement": requirement,
                "description": cfg["description"],
                "doctype": cfg["doctype"],
                "template_docname": row["name"] if row else None,
                "template_file": row["template_file"] if row else None,
            }
        )
    return result


@frappe.whitelist()
def link_template_file(requirement, file_url):
    if requirement not in REQUIREMENT_CONFIG:
        frappe.throw("Unknown requirement.")
    if not file_url:
        frappe.throw("Template file is required.")

    cfg = REQUIREMENT_CONFIG[requirement]
    docname = frappe.db.get_value("HIS Project Requirement Template", {"requirement": requirement}, "name")
    if docname:
        doc = frappe.get_doc("HIS Project Requirement Template", docname)
    else:
        doc = frappe.get_doc(
            {
                "doctype": "HIS Project Requirement Template",
                "requirement": requirement,
                "target_doctype": cfg["doctype"],
                "description": cfg["description"],
                "is_active": 1,
            }
        )

    doc.target_doctype = cfg["doctype"]
    doc.description = cfg["description"]
    doc.template_file = file_url
    doc.is_active = 1
    doc.save(ignore_permissions=True)

    return {"name": doc.name, "template_file": doc.template_file}
