frappe.listview_settings["Timesheet Submission"] = {
	onload(listview) {
		listview.page.add_action_item(__("Cancel Selected"), async () => {
			const checked = listview.get_checked_items();
			if (!checked.length) {
				frappe.msgprint(__("Select at least one Timesheet Submission."));
				return;
			}

			const names = checked.map((d) => d.name).filter(Boolean);
			frappe.confirm(
				__("Cancel {0} selected Timesheet Submission(s)?", [names.length]),
				() => {
					frappe.call({
						method: "corporate_services.icl_corporate_services.doctype.timesheet_submission.timesheet_submission.bulk_cancel_submissions",
						args: { names },
						freeze: true,
						freeze_message: __("Cancelling selected records..."),
						callback: (r) => {
							const message = (r.message && r.message.message) || __("Cancel completed.");
							frappe.show_alert({ message, indicator: "orange" });
							listview.refresh();
						},
					});
				}
			);
		});

		listview.page.add_action_item(__("Delete Selected"), async () => {
			const checked = listview.get_checked_items();
			if (!checked.length) {
				frappe.msgprint(__("Select at least one Timesheet Submission."));
				return;
			}

			const names = checked.map((d) => d.name).filter(Boolean);
			frappe.confirm(
				__("Delete {0} selected Timesheet Submission(s)?", [names.length]),
				() => {
					frappe.call({
						method: "corporate_services.icl_corporate_services.doctype.timesheet_submission.timesheet_submission.bulk_delete_submissions",
						args: { names },
						freeze: true,
						freeze_message: __("Deleting selected records..."),
						callback: (r) => {
							const message = (r.message && r.message.message) || __("Delete completed.");
							frappe.show_alert({ message, indicator: "green" });
							listview.refresh();
						},
					});
				}
			);
		});
	},
};
