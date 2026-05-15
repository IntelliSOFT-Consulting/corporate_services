import frappe


@frappe.whitelist()
def get_template_library():
    rows = frappe.get_all(
        "HIS Project Requirement Template",
        fields=[
            "name",
            "requirement",
            "target_doctype",
            "description",
            "template_file",
            "display_order",
            "is_active",
        ],
        filters={"is_active": 1},
        limit_page_length=200,
        order_by="display_order asc, modified asc",
    )
    return [
        {
            "requirement": row["requirement"],
            "description": row.get("description"),
            "doctype": row.get("target_doctype"),
            "template_docname": row.get("name"),
            "template_file": row.get("template_file"),
            "display_order": row.get("display_order"),
        }
        for row in rows
    ]


@frappe.whitelist()
def link_template_file(requirement, file_url):
    requirement = (requirement or "").strip()
    if not requirement:
        frappe.throw("Requirement is required.")
    if not file_url:
        frappe.throw("Template file is required.")

    docname = frappe.db.get_value("HIS Project Requirement Template", {"requirement": requirement}, "name")
    if not docname:
        frappe.throw(
            f"Requirement '{requirement}' does not exist in HIS Project Requirement Template. "
            "Please create and configure it first."
        )

    doc = frappe.get_doc("HIS Project Requirement Template", docname)
    doc.template_file = file_url
    doc.is_active = 1
    doc.save(ignore_permissions=True)

    return {"name": doc.name, "template_file": doc.template_file}
