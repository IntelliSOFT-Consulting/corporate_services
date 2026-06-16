import frappe
from frappe import _
from frappe.integrations.doctype.google_drive.google_drive import get_google_drive_object

from corporate_services.api.project.google_drive import _ensure_drive_folder


def _ensure_opportunity_access(opportunity_name):
    if not frappe.has_permission("Opportunity", ptype="write", doc=opportunity_name):
        frappe.throw(_("You do not have permission to access this Opportunity."), frappe.PermissionError)


@frappe.whitelist()
def create_opportunity_google_drive_folder(opportunity_name, folder_name=None, parent_folder_id=None):
    """Create a Google Drive folder for an Opportunity using a user-provided name.

    Mirrors the project Drive flow but without the lifecycle folder structure.
    """
    opportunity_name = (opportunity_name or "").strip()
    if not opportunity_name:
        frappe.throw(_("Opportunity is required."))

    _ensure_opportunity_access(opportunity_name)

    folder_name = (folder_name or "").strip()
    if not folder_name:
        frappe.throw(_("Folder name is required."))

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

    try:
        opp_doc = frappe.get_doc("Opportunity", opportunity_name)
        opp_doc.add_comment(
            "Comment",
            _('Google Drive folder created: <a href="{0}" target="_blank">{1}</a>').format(
                folder_link, folder_name
            ),
        )
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Failed to add Opportunity comment for Google Drive folder")

    return {
        "folder_id": folder_id,
        "folder_name": folder.get("name") or folder_name,
        "folder_link": folder_link,
        "created": folder.get("created", False),
    }
