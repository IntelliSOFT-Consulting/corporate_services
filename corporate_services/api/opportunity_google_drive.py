import re

import frappe
from frappe import _
from frappe.integrations.doctype.google_drive.google_drive import get_google_drive_object

from corporate_services.api.project.google_drive import (
    _ensure_drive_folder,
    _resolve_file_mime_type,
    _upload_template_to_folder,
)

DRIVE_FOLDER_ID_PATTERN = re.compile(r"/folders/([A-Za-z0-9_-]+)")


def _ensure_opportunity_access(opportunity_name):
    if not frappe.has_permission("Opportunity", ptype="write", doc=opportunity_name):
        frappe.throw(_("You do not have permission to access this Opportunity."), frappe.PermissionError)


def _extract_drive_folder_id(folder_link):
    folder_link = (folder_link or "").strip()
    match = DRIVE_FOLDER_ID_PATTERN.search(folder_link)
    if match:
        return match.group(1)
    # Bare folder IDs are sometimes pasted directly instead of a full link.
    if folder_link and "/" not in folder_link and " " not in folder_link:
        return folder_link
    return None


def _get_selected_bid_development_template_rows(opp_doc):
    rows = list(getattr(opp_doc, "custom_bid_development_templates", None) or [])
    return [row for row in rows if getattr(row, "selected", 0) and getattr(row, "attachment", None)]


def _upload_bid_development_templates(drive_service, folder_id, opp_doc):
    rows = _get_selected_bid_development_template_rows(opp_doc)
    uploaded_count = 0

    for row in rows:
        file_doc_name = frappe.db.get_value("File", {"file_url": row.attachment}, "name")
        if not file_doc_name:
            continue

        file_doc = frappe.get_doc("File", file_doc_name)
        file_content = file_doc.get_content()
        if not file_content:
            continue
        if isinstance(file_content, str):
            file_content = file_content.encode("utf-8")

        upload_result = _upload_template_to_folder(
            drive_service=drive_service,
            parent_folder_id=folder_id,
            file_name=file_doc.file_name or row.document_name,
            file_content=file_content,
            mime_type=_resolve_file_mime_type(file_doc),
            description=row.document_name,
        )
        uploaded_count += int(bool(upload_result.get("created")))

    return uploaded_count, len(rows)


def _create_drive_folder_for_opportunity(opportunity_name, folder_name, parent_folder_id=None):
    try:
        drive_service, _account = get_google_drive_object()
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Google Drive access token refresh failed")
        frappe.throw(
            _("Failed to refresh Google Drive token. Please re-authorize from Google Drive settings.")
        )

    folder = _ensure_drive_folder(drive_service, folder_name, parent_folder_id)
    folder_id = folder.get("id")
    folder_link = folder.get("webViewLink") or f"https://drive.google.com/drive/folders/{folder_id}"

    frappe.db.set_value(
        "Opportunity", opportunity_name, "custom_google_drive_folder", folder_link,
        update_modified=False,
    )

    opp_doc = frappe.get_doc("Opportunity", opportunity_name)
    uploaded_count, selected_count = _upload_bid_development_templates(drive_service, folder_id, opp_doc)

    try:
        comment = _('Google Drive folder created: <a href="{0}" target="_blank">{1}</a>').format(
            folder_link, folder_name
        )
        if selected_count:
            comment += _("<br><small>Bid development templates uploaded: {0}</small>").format(uploaded_count)
        opp_doc.add_comment("Comment", comment)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Failed to add Opportunity comment for Google Drive folder")

    return {
        "folder_id": folder_id,
        "folder_name": folder.get("name") or folder_name,
        "folder_link": folder_link,
        "created": folder.get("created", False),
        "templates_uploaded": uploaded_count,
    }


@frappe.whitelist()
def create_opportunity_google_drive_folder(opportunity_name, folder_name=None, parent_folder_id=None):
    # Create (or find, if one with this name already exists) a Google Drive folder for an
    # Opportunity, then upload any selected Bid Development Templates into it.
    opportunity_name = (opportunity_name or "").strip()
    if not opportunity_name:
        frappe.throw(_("Opportunity is required."))

    _ensure_opportunity_access(opportunity_name)

    folder_name = (folder_name or "").strip()
    if not folder_name:
        frappe.throw(_("Folder name is required."))

    return _create_drive_folder_for_opportunity(opportunity_name, folder_name, parent_folder_id)


@frappe.whitelist()
def attach_opportunity_google_drive_folder(opportunity_name, folder_link):
    # Link an already-existing Google Drive folder (created outside the system) to this
    # Opportunity, instead of creating a new one.
    opportunity_name = (opportunity_name or "").strip()
    if not opportunity_name:
        frappe.throw(_("Opportunity is required."))

    _ensure_opportunity_access(opportunity_name)

    folder_link = (folder_link or "").strip()
    if not folder_link or not _extract_drive_folder_id(folder_link):
        frappe.throw(_("Enter a valid Google Drive folder link."))

    frappe.db.set_value(
        "Opportunity", opportunity_name, "custom_google_drive_folder", folder_link,
        update_modified=False,
    )

    opp_doc = frappe.get_doc("Opportunity", opportunity_name)
    try:
        opp_doc.add_comment(
            "Comment",
            _('Existing Google Drive folder attached: <a href="{0}" target="_blank">{0}</a>').format(folder_link),
        )
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Failed to add Opportunity comment for attached Google Drive folder")

    return {"folder_link": folder_link}


@frappe.whitelist()
def upload_bid_development_templates_to_opportunity_drive(opportunity_name):
    # Upload the selected Bid Development Templates into the Opportunity's already-linked
    # Google Drive folder (whether that folder was created by this app or attached manually).
    opportunity_name = (opportunity_name or "").strip()
    if not opportunity_name:
        frappe.throw(_("Opportunity is required."))

    _ensure_opportunity_access(opportunity_name)

    opp_doc = frappe.get_doc("Opportunity", opportunity_name)
    folder_link = (opp_doc.get("custom_google_drive_folder") or "").strip()
    folder_id = _extract_drive_folder_id(folder_link)
    if not folder_id:
        frappe.throw(_("Link a Google Drive folder to this Opportunity first."))

    try:
        drive_service, _account = get_google_drive_object()
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Google Drive access token refresh failed")
        frappe.throw(
            _("Failed to refresh Google Drive token. Please re-authorize from Google Drive settings.")
        )

    uploaded_count, selected_count = _upload_bid_development_templates(drive_service, folder_id, opp_doc)
    if not selected_count:
        frappe.throw(_("Select at least one Bid Development Template to upload."))

    return {
        "folder_link": folder_link,
        "templates_uploaded": uploaded_count,
        "templates_selected": selected_count,
    }


def create_drive_folder_for_opportunity_background(opportunity_name, folder_name=None):
    try:
        opportunity_name = (opportunity_name or "").strip()
        if not opportunity_name or not frappe.db.exists("Opportunity", opportunity_name):
            return

        if not folder_name:
            doc = frappe.get_doc("Opportunity", opportunity_name)
            folder_name = doc.title or doc.customer_name or doc.name

        _create_drive_folder_for_opportunity(opportunity_name, folder_name)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Auto Google Drive folder creation failed")
