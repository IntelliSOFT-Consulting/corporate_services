// Copyright (c) 2026, IntelliSOFT Consulting and contributors
// For license information, please see license.txt

frappe.ui.form.on("Finance Settings", {
	refresh(frm) {
		frm.add_custom_button(
			__("Backfill Timesheet Templates"),
			() => {
				frappe.confirm(
					__(
						"Update existing Timesheet Submissions from each employee's Contract Type timesheet template?"
					),
					() => {
						frappe.call({
							method:
								"corporate_services.api.timesheet.project_manager_approval.sync_all_submission_timesheet_templates",
							freeze: true,
							freeze_message: __("Updating Timesheet Submissions..."),
							callback(r) {
								const updated = r.message?.updated || 0;
								frappe.msgprint(
									__(
										"Timesheet template backfill complete. Updated {0} submission(s).",
										[updated]
									)
								);
							},
						});
					}
				);
			},
			__("Timesheet")
		);
	},
});
