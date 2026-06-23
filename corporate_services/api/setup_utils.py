import frappe
import os
import json


def clear_workspaces():
    try:
        frappe.logger().info("Starting the process to delete unnecessary workspaces.")
        
        # Get the list of workspaces to delete
        workspaces_to_delete = frappe.get_list("Workspace", filters={"module": ["!=", "ICL Corporate Services"]})
        
        frappe.logger().info(f"Workspaces to delete: {workspaces_to_delete}")
        
        # Iterate through the list and delete each workspace
        for workspace in workspaces_to_delete:
            frappe.delete_doc("Workspace", workspace['name'], force=True)
            frappe.logger().info(f"Deleted workspace: {workspace['name']}")
        
        # Commit the transaction to apply the changes
        frappe.db.commit()
        frappe.logger().info("Deletion process completed successfully.")
    
    except Exception as e:
        frappe.logger().error(f"An error occurred while deleting workspaces: {e}")
        frappe.db.rollback()  # Rollback in case of error
 


def force_sync_fixtures():
    frappe.logger().info("=" * 60)
    frappe.logger().info("Force syncing ICL Corporate Services fixtures...")
    frappe.logger().info("=" * 60)

    fixture_path = frappe.get_app_path("corporate_services", "fixtures")

    fixture_files = {
        "workflow.json": "Workflow",
        "workflow_state.json": "Workflow State",
        "workflow_action_master.json": "Workflow Action Master",
        "email_template.json": "Email Template",
        "client_script.json": "Client Script",
        "role.json": "Role",
        "role_profile.json": "Role Profile",
        "print_format.json": "Print Format",
        "workspace.json": "Workspace",
        "custom_docperm.json": "Custom DocPerm",
    }

    for filename, doctype in fixture_files.items():
        file_path = os.path.join(fixture_path, filename)

        if not os.path.exists(file_path):
            frappe.logger().info(f"⊘ Skipping {doctype} - file not found")
            continue

        try:
            with open(file_path, 'r') as f:
                docs = json.load(f)

            if not docs:
                continue

            for doc_data in docs:
                doc_name = doc_data.get("name")

                try:
                    if frappe.db.exists(doctype, doc_name):
                        doc = frappe.get_doc(doctype, doc_name)
                        doc.update(doc_data)
                        doc.flags.ignore_permissions = True
                        doc.flags.ignore_mandatory = True
                        doc.flags.ignore_validate = True
                        doc.save()
                        frappe.logger().info(f"Updated {doctype}: {doc_name}")
                    else:
                        doc = frappe.get_doc(doc_data)
                        doc.flags.ignore_permissions = True
                        doc.flags.ignore_mandatory = True
                        doc.insert()
                        frappe.logger().info(f"Created {doctype}: {doc_name}")

                except Exception as e:
                    frappe.logger().error(f"Error with {doctype} '{doc_name}': {str(e)}")

            frappe.db.commit()

        except Exception as e:
            frappe.logger().error(f"Error loading {filename}: {str(e)}")

    frappe.logger().info("=" * 60)
    frappe.logger().info("Fixture sync completed!")
    frappe.logger().info("=" * 60)


def clear_doctype_customizations(doctypes: list):
    """
    Removes all Customize Form overrides (Custom Fields + Property Setters)
    for any custom doctype owned by this app.
    Skips workflow_state custom field as it is required by workflows.
    """
    frappe.logger().info("Clearing doctype customizations...")

    for doctype in doctypes:
        try:
            # Remove Custom Fields - skip workflow_state as workflow depends on it
            custom_fields = frappe.get_all(
                "Custom Field",
                filters={
                    "dt": doctype,
                    "fieldname": ["!=", "workflow_state"]
                },
                fields=["name", "fieldname"]
            )
            for cf in custom_fields:
                frappe.delete_doc("Custom Field", cf["name"], force=True)
                frappe.logger().info(f"Deleted Custom Field: {cf['name']} ({cf['fieldname']})")

            # Remove Property Setters
            property_setters = frappe.get_all(
                "Property Setter",
                filters={"doc_type": doctype},
                fields=["name", "field_name", "property"]
            )
            for ps in property_setters:
                frappe.delete_doc("Property Setter", ps["name"], force=True)
                frappe.logger().info(f"Deleted Property Setter: {ps['name']}")

            frappe.db.commit()
            frappe.logger().info(f"✓ Cleaned customizations for: {doctype}")

        except Exception as e:
            frappe.logger().error(f"Error cleaning {doctype}: {str(e)}")
            frappe.db.rollback()


def clear_submission_queue():
    """Purge runtime queue records directly from the DB during migrate."""
    try:
        deleted = frappe.db.count("Submission Queue")
        if not deleted:
            frappe.logger().info("No Submission Queue records found to delete.")
            return

        frappe.db.delete("Submission Queue")
        frappe.db.commit()
        frappe.logger().info(f"Deleted {deleted} Submission Queue record(s).")
    except Exception as e:
        frappe.logger().error(f"Error clearing Submission Queue: {str(e)}")
        frappe.db.rollback()


def sanitize_travel_request_currency_fields():
    """Strip comma-formatted strings from columns that switch Data -> Currency so
    the schema change doesn't fail with 'Data truncated'."""
    targets = {
        "Travel Request": ["custom_expected_support", "custom_amount_in_local_currency"],
        "Travel Request Reconciliation": ["total_spent", "total_balance", "total_advance"],
    }

    for doctype, columns in targets.items():
        if not frappe.db.table_exists(doctype):
            continue
        for column in columns:
            if not frappe.db.has_column(doctype, column):
                continue
            try:
                frappe.db.sql(
                    """
                    UPDATE `tab{dt}`
                    SET `{col}` = CASE
                        WHEN TRIM(REPLACE(`{col}`, ',', '')) REGEXP '^-?[0-9]+(\\.[0-9]+)?$'
                        THEN REPLACE(`{col}`, ',', '')
                        ELSE 0
                    END
                    """.format(dt=doctype, col=column)
                )
                frappe.db.commit()
                frappe.logger().info(f"Sanitized {doctype}.{column}")
            except Exception as e:
                frappe.logger().error(f"Error sanitizing {doctype}.{column}: {str(e)}")
                frappe.db.rollback()


def before_migrate_cleanup():
    clear_doctype_customizations([
    ])
    sanitize_travel_request_currency_fields()
    # clear_submission_queue()


def post_install():
    clear_doctype_customizations([
    ])
    force_sync_fixtures()
    clear_workspaces()
    # clear_submission_queue()
