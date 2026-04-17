import os

import frappe


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
