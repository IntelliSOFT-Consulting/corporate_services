import frappe
from frappe import _

from corporate_services.api.project.lifecycle_toolkit import get_stage_folder_blueprint


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


def _ensure_drive_folder(drive_service, name, parent_id=None):
    escaped_name = name.replace("'", "\\'")
    query_parts = [
        "mimeType = 'application/vnd.google-apps.folder'",
        f"name = '{escaped_name}'",
        "trashed = false",
    ]
    if parent_id:
        query_parts.append(f"'{parent_id}' in parents")

    query = " and ".join(query_parts)
    existing = (
        drive_service.files()
        .list(
            q=query,
            fields="files(id,name,webViewLink)",
            pageSize=1,
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
        )
        .execute()
        .get("files", [])
    )
    if existing:
        folder = existing[0]
        folder["created"] = False
        return folder

    payload = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
    }
    if parent_id:
        payload["parents"] = [parent_id]
    folder = drive_service.files().create(body=payload, fields="id,name,webViewLink").execute()
    folder["created"] = True
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


def _create_lifecycle_folder_structure(file_root_name, file_parent, blueprint):
    root = _ensure_folder(file_name=file_root_name, parent_folder=file_parent)
    lifecycle_root = _ensure_folder(
        file_name="Health Information System Project Lifecycle",
        parent_folder=root.name,
    )

    for stage in blueprint:
        stage_name = (stage.get("stage_name") or "").strip()
        if not stage_name:
            continue

        stage_folder = _ensure_folder(file_name=stage_name, parent_folder=lifecycle_root.name)
        grouped_items = stage.get("toolkit_item_groups") or {}

        if grouped_items:
            for group_name, items in grouped_items.items():
                if not items:
                    continue
                group_folder = _ensure_folder(file_name=group_name, parent_folder=stage_folder.name)
                for item in items:
                    item_name = (item.get("requirement") or "").strip()
                    if not item_name:
                        continue
                    _ensure_folder(
                        file_name=item_name,
                        parent_folder=group_folder.name,
                    )
            continue

        requirements = stage.get("requirements") or []
        deliverables = stage.get("deliverables") or []

        if requirements:
            req_root = _ensure_folder(file_name="Requirements", parent_folder=stage_folder.name)
            for item in requirements:
                _ensure_folder(file_name=item, parent_folder=req_root.name)

        if deliverables:
            del_root = _ensure_folder(
                file_name="Deliverables - Templates",
                parent_folder=stage_folder.name,
            )
            for item in deliverables:
                _ensure_folder(file_name=item, parent_folder=del_root.name)

    return root


def _create_project_folder_structure(project_doc):
    if not project_doc or not project_doc.name:
        frappe.throw(_("Project is required."))

    # Folder records should not consume Project attachment slots.
    _detach_existing_project_folder_attachments(project_doc.name)

    blueprint = get_stage_folder_blueprint()
    root_name = f"Project - {project_doc.name}"
    root = _create_lifecycle_folder_structure(root_name, "Home", blueprint)

    try:
        project_doc.add_comment(
            "Comment",
            _(
                "Project folder structure created in File Manager: <strong>{0}</strong>"
                "<br><small>Lifecycle stages and toolkit items are organized under this root.</small>"
            ).format(root.file_name),
        )
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Failed to add Project comment for File Manager folders")

    return {
        "root_folder_name": root.file_name,
        "root_file_name": root.file_name,
        "lifecycle_root_name": "Health Information System Project Lifecycle",
        "stages_created": len(blueprint),
    }


@frappe.whitelist()
def create_project_lifecycle_folders_for_project(project_name):
    if not project_name:
        frappe.throw(_("Project is required."))

    project_doc = frappe.get_doc("Project", project_name)
    project_doc.check_permission("read")
    return _create_project_folder_structure(project_doc)


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
