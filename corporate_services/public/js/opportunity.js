frappe.ui.form.on("Opportunity", {
	refresh(frm) {
		if (frm.is_new()) return;

		frm.add_custom_button(__("Send Due Reminder"), async () => {
			try {
				await frappe.call({
					method: "corporate_services.api.notification.opportunity.v1.send_manual_due_reminder",
					args: {
						opportunity_name: frm.doc.name,
					},
				});

				frappe.show_alert({
					message: __("Due reminder sent to the Opportunity Owner."),
					indicator: "green",
				});
			} catch (error) {
				frappe.msgprint({
					title: __("Reminder Failed"),
					message: error.message || __("Unable to send due reminder."),
					indicator: "red",
				});
			}
		});

		frm.add_custom_button(__("Create Drive Folder"), () => {
			frappe.prompt(
				[
					{
						fieldtype: "Data",
						fieldname: "folder_name",
						label: __("Folder Name"),
						reqd: 1,
						default: frm.doc.title || frm.doc.customer_name || frm.doc.name,
					},
				],
				(values) => {
					frappe.call({
						method: "corporate_services.api.opportunity_google_drive.create_opportunity_google_drive_folder",
						args: {
							opportunity_name: frm.doc.name,
							folder_name: values.folder_name,
						},
						freeze: true,
						freeze_message: __("Creating Google Drive folder..."),
						callback: (r) => {
							const out = r.message || {};
							const link = out.folder_link || "";
							frappe.msgprint({
								title: __("Google Drive Folder Created"),
								message: link
									? `Folder: <strong>${frappe.utils.escape_html(out.folder_name || "")}</strong><br><a href="${frappe.utils.escape_html(link)}" target="_blank">Open in Google Drive</a>`
									: __("Folder created."),
								indicator: "green",
							});
						},
					});
				},
				__("Create Drive Folder"),
				__("Create")
			);
		}, "Google Drive");
	},
});
