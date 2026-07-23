import io
import os
import zipfile

import frappe
from frappe import _


@frappe.whitelist()
def get_bid_development_templates():
    return frappe.get_all(
        "Bid Development Templates",
        filters={"is_active": 1},
        fields=["name", "document_name", "description", "attachment"],
        order_by="document_name asc",
    )


@frappe.whitelist()
def download_bid_development_templates(templates):
    if isinstance(templates, str):
        templates = frappe.parse_json(templates)

    if not templates:
        frappe.throw(_("Select at least one template to download."))

    rows = frappe.get_all(
        "Bid Development Templates",
        filters={"name": ["in", templates], "is_active": 1},
        fields=["document_name", "attachment"],
    )
    if not rows:
        frappe.throw(_("No active templates found for the selected items."))

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for row in rows:
            if not row.attachment:
                continue

            file_doc = frappe.get_doc("File", {"file_url": row.attachment})
            _, extension = os.path.splitext(file_doc.file_name or "")
            filename = f"{frappe.scrub(row.document_name).replace('_', ' ').title()}{extension}"
            zf.writestr(filename, file_doc.get_content())

    frappe.local.response.filename = "Bid Development Templates.zip"
    frappe.local.response.filecontent = buffer.getvalue()
    frappe.local.response.type = "download"
