import frappe


def sync_checklist_to_opportunity(doc, method):
    """after_insert / on_update: write checklist link back onto the Opportunity."""
    if not doc.opportunity:
        return

    frappe.db.set_value(
        "Opportunity",
        doc.opportunity,
        {
            "custom_task_checklist": 1,
            "custom_task_checklist_form": doc.name,
        },
        update_modified=False,
    )


def get_opportunity_dashboard_data(data):
    """Add Opportunity Task Checklist to the Opportunity form connections panel."""
    data.setdefault("transactions", [])

    already = any(
        "Opportunity Task Checklist" in t.get("items", [])
        for t in data["transactions"]
    )
    if not already:
        data["transactions"].append({
            "label": "Task Checklist",
            "items": ["Opportunity Task Checklist"],
        })

    return data
