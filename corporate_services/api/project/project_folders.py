import frappe


LIFECYCLE_STAGE_FOLDERS = [
    "Prepare",
    "Plan",
    "Design",
    "Development",
    "Implementation",
    "Maintenance",
]

REQUIREMENT_TEMPLATE_FOLDERS = [
    "Project Charter",
    "High Level Work Plan",
    "Detailed Work Plan",
    "Communication Plan",
    "Feedback Document",
    "Risk Assessment",
    "Implementation Plan",
    "Lifecycle Checklist",
]


def create_project_lifecycle_folders(doc, method):
    if not doc or not doc.name:
        return

    # Folder records should not consume Project attachment slots.
    _detach_existing_project_folder_attachments(doc.name)

    root_name = f"Project - {doc.name}"
    root = _ensure_folder(
        file_name=root_name,
        parent_folder="Home",
    )

    lifecycle_root = _ensure_folder(
        file_name="Health Information System Project Lifecycle",
        parent_folder=root.name,
    )

    for stage in LIFECYCLE_STAGE_FOLDERS:
        _ensure_folder(
            file_name=stage,
            parent_folder=lifecycle_root.name,
        )

    req_root = _ensure_folder(
        file_name="Project Requirements Templates",
        parent_folder=root.name,
    )

    for req in REQUIREMENT_TEMPLATE_FOLDERS:
        _ensure_folder(
            file_name=req,
            parent_folder=req_root.name,
        )


def _ensure_folder(file_name, parent_folder, attached_to_doctype=None, attached_to_name=None):
    filters = {
        "is_folder": 1,
        "file_name": file_name,
        "folder": parent_folder,
        "attached_to_doctype": attached_to_doctype,
        "attached_to_name": attached_to_name,
    }
    existing = frappe.db.get_value("File", filters, "name")
    if existing:
        return frappe.get_doc("File", existing)

    folder = frappe.get_doc(
        {
            "doctype": "File",
            "file_name": file_name,
            "is_folder": 1,
            "folder": parent_folder,
            "attached_to_doctype": attached_to_doctype,
            "attached_to_name": attached_to_name,
            "is_private": 1,
        }
    )
    folder.insert(ignore_permissions=True)
    return folder


def _detach_existing_project_folder_attachments(project_name):
    frappe.db.sql(
        """
        update `tabFile`
        set attached_to_doctype = null, attached_to_name = null
        where is_folder = 1
          and attached_to_doctype = 'Project'
          and attached_to_name = %s
        """,
        (project_name,),
    )


@frappe.whitelist()
def detach_all_project_folder_attachments():
    frappe.db.sql(
        """
        update `tabFile`
        set attached_to_doctype = null, attached_to_name = null
        where is_folder = 1
          and attached_to_doctype = 'Project'
        """
    )
    return {"ok": True}
