import os

import frappe
from frappe import _
from frappe.utils import get_url_to_form, nowdate


def create_folder_for_opportunity(doc, method):
    try:
        if not doc.party_name:
            frappe.log_error("Party Name is empty", "Folder Creation Error")
            return None

        folder_name = f"Opportunity - {doc.party_name}"

        existing_folder = frappe.db.exists(
            "File",
            {
                "file_name": folder_name,
                "is_folder": 1,
                "attached_to_doctype": "Opportunity",
                "attached_to_name": doc.name,
            },
        )

        if existing_folder:
            frappe.logger().debug(f"Folder already exists: {folder_name}")
            return existing_folder

        folder = frappe.get_doc(
            {
                "doctype": "File",
                "file_name": folder_name,
                "is_folder": 1,
                "folder": "Home",
                "attached_to_doctype": "Opportunity",
                "attached_to_name": doc.name,
                "is_private": 1,
            }
        )

        folder.insert(ignore_permissions=True)
        frappe.db.commit()

        return folder.name

    except Exception as e:
        frappe.log_error(f"Error creating folder: {str(e)}", "Folder Creation Error")
        frappe.msgprint("Error creating folder. Please check error logs.", indicator="red")
        return None


def save_bid_document_to_opportunity_folder(doc, method):
    try:
        if not hasattr(doc, "custom_project_bid_documents") or not doc.custom_project_bid_documents:
            frappe.log_error(
                message="No custom_project_bid_documents found in opportunity",
                title="custom_project_bid_documents",
            )
            return

        folder_name = f"Opportunity - {doc.party_name}"
        folder = frappe.db.exists(
            "File",
            {
                "file_name": folder_name,
                "is_folder": 1,
                "attached_to_doctype": "Opportunity",
                "attached_to_name": doc.name,
            },
        )

        if not folder:
            folder = create_folder_for_opportunity(doc, None)
            if not folder:
                frappe.log_error(
                    message="Failed to create folder",
                    title="custom_project_bid_documents",
                )
                return

        for bid_doc in doc.custom_project_bid_documents:
            if not bid_doc.document:
                continue

            file_doc = frappe.db.get_value(
                "File",
                {"file_url": bid_doc.document},
                ["name", "file_name", "file_url", "folder"],
                as_dict=1,
            )

            if not file_doc:
                continue

            frappe.db.set_value(
                "File",
                file_doc.name,
                {
                    "folder": folder,
                    "attached_to_doctype": "Opportunity",
                    "attached_to_name": doc.name,
                },
                update_modified=False,
            )

            if bid_doc.document_name:
                _, file_extension = os.path.splitext(file_doc.file_name)
                clean_doc_name = frappe.scrub(bid_doc.document_name).replace("_", " ").title()
                new_file_name = f"{clean_doc_name}{file_extension}"
                frappe.db.set_value(
                    "File", file_doc.name, "file_name", new_file_name, update_modified=False
                )

        frappe.db.commit()

    except Exception as e:
        frappe.log_error(
            message=f"Error in bid document save: {str(e)}\\nFull traceback: {frappe.get_traceback()}",
            title="custom_project_bid_documents",
        )


def enforce_single_active_owner(doc, method):
    owners = getattr(doc, "custom_opportunity_owners", None)
    if not owners:
        return

    active_rows = [row for row in owners if row.status == "Active"]
    if len(active_rows) <= 1:
        return

    # Keep the last added Active row active; deactivate the rest
    last_active = active_rows[-1]
    for row in owners:
        if row.status == "Active" and row.name != last_active.name:
            row.status = "Inactive"


def notify_new_opportunity_owners(doc, method):
    """After save: send a welcome email to any owner rows that were just added as Active."""
    owners = getattr(doc, "custom_opportunity_owners", None)
    if not owners:
        return

    doc_before = doc.get_doc_before_save()
    before_users = set()
    if doc_before:
        for row in (doc_before.get("custom_opportunity_owners") or []):
            before_users.add(row.get("user"))

    for row in owners:
        if row.status == "Active" and row.user and row.user not in before_users:
            _send_owner_assignment_email(doc, row)


def _send_owner_assignment_email(opportunity, owner_row):
    recipient = owner_row.email or frappe.db.get_value("User", owner_row.user, "email")
    if not recipient:
        return

    opportunity_url = get_url_to_form("Opportunity", opportunity.name)
    display_name = owner_row.full_name or owner_row.user

    message = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #0066cc;">Opportunity Ownership Assignment</h2>
        <p>Dear {frappe.utils.escape_html(display_name)},</p>
        <p>
            You have been assigned as the <strong>owner</strong> of opportunity
            <strong>{frappe.utils.escape_html(opportunity.name)}</strong>.
        </p>
        <p>
            You can view the opportunity details
            <a href="{opportunity_url}" style="color: #0066cc; text-decoration: none;">here</a>.
        </p>
        <p style="margin-top: 20px;">Best regards,<br>Opportunity Module</p>
    </div>
    """

    frappe.sendmail(
        recipients=[recipient],
        subject=_("You have been assigned as owner of Opportunity {0}").format(opportunity.name),
        message=message,
        header=("Opportunity Ownership", "text/html"),
    )
