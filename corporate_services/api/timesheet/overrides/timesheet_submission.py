import frappe
from frappe import _

@frappe.whitelist()
def delete_timesheet_submission_with_linked(timesheet_submission_name):
    """
    Delete timesheet submission and all its linked timesheets
    """
    try:
        if not timesheet_submission_name:
            frappe.throw(_("Timesheet Submission name is required"))
        
        if not frappe.db.exists("Timesheet Submission", timesheet_submission_name):
            frappe.throw(_("Timesheet Submission {0} does not exist").format(timesheet_submission_name))
        
        frappe.local.flags.custom_delete_in_progress = True
        frappe.local.flags.ignore_links = True
        frappe.local.flags.ignore_submit_comment = True
        frappe.local.flags.ignore_validate = True
        frappe.local.flags.ignore_mandatory = True
        frappe.local.flags.force_delete = True
        
        frappe.db.begin()
        
        ts_submission = frappe.get_doc("Timesheet Submission", timesheet_submission_name)
        
        ts_submission.check_permission("delete")
        
        # Get all linked timesheets from the child table
        linked_timesheets = frappe.get_all(
            "Timesheet Submission List", 
            filters={"parent": timesheet_submission_name},
            parent_doctype="Timesheet Submission",
            fields=["timesheet"]
        )
        
        deleted_count = 0
        failed_deletions = []
                # First, remove all link references to prevent validation errors
        for timesheet_row in linked_timesheets:
            try:
                timesheet_name = timesheet_row.timesheet
                if frappe.db.exists("Timesheet", timesheet_name):
                    frappe.db.set_value("Timesheet", timesheet_name, "custom_timesheet_submission", None, update_modified=False)
                    frappe.db.set_value("Timesheet", timesheet_name, "custom_timesheet_submission_name", None, update_modified=False)
                    
            except Exception as e:
                frappe.log_error(f"Error removing link for timesheet {timesheet_name}: {str(e)}", "Link Removal Error")
                continue
        
        frappe.db.delete("Timesheet Submission List", {"parent": timesheet_submission_name})
        
        for timesheet_row in linked_timesheets:
            try:
                timesheet_name = timesheet_row.timesheet
                if frappe.db.exists("Timesheet", timesheet_name):
                    force_delete_timesheet(timesheet_name)
                    deleted_count += 1
                    
            except Exception as e:
                error_msg = f"Error deleting timesheet {timesheet_name}: {str(e)}"
                frappe.log_error(error_msg, "Timesheet Deletion Error")
                failed_deletions.append(timesheet_name)
                continue
        
        force_delete_timesheet_submission(ts_submission)
        
        frappe.db.commit()
        
        clear_delete_flags()
        
        message = f"Successfully deleted Timesheet Submission {timesheet_submission_name} and {deleted_count} linked timesheets"
        if failed_deletions:
            message += f". Failed to delete {len(failed_deletions)} timesheets: {', '.join(failed_deletions)}"
        
        return {
            "success": True,
            "message": message,
            "deleted_timesheets": deleted_count,
            "failed_deletions": failed_deletions
        }
        
    except Exception as e:
        frappe.db.rollback()
        clear_delete_flags()
        
        error_msg = f"Error in delete_timesheet_submission_with_linked: {str(e)}"
        frappe.log_error(error_msg, "Timesheet Submission Deletion Error")
        
        return {
            "success": False,
            "message": str(e),
            "error": True
        }

def force_delete_timesheet(timesheet_name):
    """
    Force delete a timesheet bypassing all validations
    """
    try:
        timesheet_doc = frappe.get_doc("Timesheet", timesheet_name)
        
        # Set all bypass flags
        timesheet_doc.flags.ignore_validate = True
        timesheet_doc.flags.ignore_mandatory = True
        timesheet_doc.flags.ignore_links = True
        timesheet_doc.flags.ignore_submit_comment = True
        timesheet_doc.flags.ignore_validate_on_cancel = True
        timesheet_doc.flags.ignore_permissions = True
        
        # Cancel if submitted
        if timesheet_doc.docstatus == 1:
            frappe.db.set_value("Timesheet", timesheet_name, "docstatus", 2, update_modified=False)
        
        delete_timesheet_raw(timesheet_name)
        
    except Exception as e:
        frappe.log_error(f"Error in force_delete_timesheet for {timesheet_name}: {str(e)}", "Force Delete Timesheet Error")
        raise

def force_delete_timesheet_submission(ts_submission):
    """
    Force delete timesheet submission bypassing all validations
    """
    try:
        # Set all bypass flags
        ts_submission.flags.ignore_validate = True
        ts_submission.flags.ignore_links = True
        ts_submission.flags.ignore_mandatory = True
        ts_submission.flags.ignore_submit_comment = True
        ts_submission.flags.ignore_validate_on_cancel = True
        ts_submission.flags.ignore_permissions = True
        
        # Cancel if submitted
        if ts_submission.docstatus == 1:
            frappe.db.set_value("Timesheet Submission", ts_submission.name, "docstatus", 2, update_modified=False)
        
        delete_timesheet_submission_raw(ts_submission.name)
        
    except Exception as e:
        frappe.log_error(f"Error in force_delete_timesheet_submission for {ts_submission.name}: {str(e)}", "Force Delete Submission Error")
        raise

def delete_timesheet_raw(timesheet_name):
    """
    Delete timesheet using raw database operations
    """
    frappe.db.sql("DELETE FROM `tabTimesheet Detail` WHERE parent = %s", timesheet_name)
    
    frappe.db.sql("DELETE FROM `tabTimesheet` WHERE name = %s", timesheet_name)

def delete_timesheet_submission_raw(submission_name):
    """
    Delete timesheet submission using raw database operations
    """
    frappe.db.sql("DELETE FROM `tabTimesheet Submission List` WHERE parent = %s", submission_name)
    
    frappe.db.sql("DELETE FROM `tabTimesheet Submission` WHERE name = %s", submission_name)

def clear_delete_flags():
    """
    Clear all delete-related flags
    """
    frappe.local.flags.custom_delete_in_progress = False
    frappe.local.flags.ignore_links = False
    frappe.local.flags.ignore_submit_comment = False
    frappe.local.flags.ignore_validate = False
    frappe.local.flags.ignore_mandatory = False
    frappe.local.flags.force_delete = False

def prevent_default_delete(doc, method):
    """
    Prevent default delete behavior for Timesheet Submission
    This will be called by ERPNext's delete process
    """
    if frappe.local.flags.get('custom_delete_in_progress'):
        return
    
    frappe.throw(
        _("Please use the Delete option from the Actions menu to properly handle linked timesheets.")
    )

def prevent_timesheet_delete_if_linked(doc, method):
    """
    Prevent timesheet deletion if linked to submission (unless forced)
    """
    if (frappe.local.flags.get('custom_delete_in_progress') or 
        frappe.local.flags.get('ignore_links') or
        frappe.local.flags.get('force_delete')):
        return
    
    linked_submissions = frappe.get_all(
        "Timesheet Submission List",
        filters={"timesheet": doc.name},
        parent_doctype="Timesheet Submission",
        fields=["parent"]
    )
    
    if linked_submissions:
        submission_names = [sub.parent for sub in linked_submissions]
        frappe.throw(
            _("Cannot delete Timesheet {0} as it is linked to Timesheet Submission(s): {1}").format(
                doc.name, ", ".join(submission_names)
            )
        )

def override_link_validation(doc, method):
    """
    Override ERPNext's link validation during delete
    """
    if (frappe.local.flags.get('custom_delete_in_progress') or 
        frappe.local.flags.get('force_delete')):
        return
    

def override_dashboard_data(data=None):
    if (frappe.local.flags.get('custom_delete_in_progress') or 
        frappe.local.flags.get('force_delete')):
        return data or {}
    
    return data or {}
