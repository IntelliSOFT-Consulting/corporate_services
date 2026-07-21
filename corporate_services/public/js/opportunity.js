function load_bid_development_templates(frm) {
	frappe.call({
		method: "corporate_services.api.bid_development_templates.get_bid_development_templates",
		callback: (r) => {
			const templates = r.message || [];
			if (!templates.length) {
				frappe.msgprint(__("No active Bid Development Templates found."));
				return;
			}

			const existing = new Set(
				(frm.doc.custom_bid_development_templates || []).map((row) => row.document_name)
			);

			let added = 0;
			templates.forEach((t) => {
				if (existing.has(t.name)) return;
				const row = frm.add_child("custom_bid_development_templates", {
					document_name: t.name,
					selected: 1,
				});
				row.attachment = t.attachment;
				row.description = t.description;
				added += 1;
			});

			frm.refresh_field("custom_bid_development_templates");

			if (added) {
				frappe.show_alert({
					message: __("{0} template(s) added.", [added]),
					indicator: "green",
				});
			} else {
				frappe.show_alert({
					message: __("All active templates are already listed."),
					indicator: "blue",
				});
			}
		},
	});
}

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

		frm.add_custom_button(__("Create System Folder"), () => {
			frappe.call({
				method: "corporate_services.api.opportunity_handlers.create_system_folder_for_opportunity",
				args: {
					opportunity_name: frm.doc.name,
				},
				freeze: true,
				freeze_message: __("Creating system folder..."),
				callback: () => {
					frappe.show_alert({
						message: __("System folder created."),
						indicator: "green",
					});
					frm.reload_doc();
				},
			});
		}, "Folders");

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
						freeze_message: __("Creating Google Drive folder and uploading templates..."),
						callback: (r) => {
							const out = r.message || {};
							const link = out.folder_link || "";
							frappe.msgprint({
								title: __("Google Drive Folder Ready"),
								message: link
									? `Folder: <strong>${frappe.utils.escape_html(out.folder_name || "")}</strong><br>` +
									  `<a href="${frappe.utils.escape_html(link)}" target="_blank">Open in Google Drive</a>` +
									  `<br><small>${__("Templates uploaded")}: ${out.templates_uploaded || 0}</small>`
									: __("Folder created."),
								indicator: "green",
							});
							frm.reload_doc();
						},
					});
				},
				__("Create Drive Folder"),
				__("Create")
			);
		}, "Folders");

		frm.add_custom_button(__("Attach Existing Drive Folder"), () => {
			frappe.prompt(
				[
					{
						fieldtype: "Data",
						fieldname: "folder_link",
						label: __("Google Drive Folder Link"),
						reqd: 1,
						default: frm.doc.custom_google_drive_folder || "",
					},
				],
				(values) => {
					frappe.call({
						method: "corporate_services.api.opportunity_google_drive.attach_opportunity_google_drive_folder",
						args: {
							opportunity_name: frm.doc.name,
							folder_link: values.folder_link,
						},
						freeze: true,
						freeze_message: __("Attaching Google Drive folder..."),
						callback: () => {
							frappe.show_alert({
								message: __("Google Drive folder attached."),
								indicator: "green",
							});
							frm.reload_doc();
						},
					});
				},
				__("Attach Existing Drive Folder"),
				__("Attach")
			);
		}, "Folders");

		if (frm.doc.custom_google_drive_folder) {
			frm.add_custom_button(__("Upload Templates to Drive"), () => {
				frappe.call({
					method: "corporate_services.api.opportunity_google_drive.upload_bid_development_templates_to_opportunity_drive",
					args: {
						opportunity_name: frm.doc.name,
					},
					freeze: true,
					freeze_message: __("Uploading templates..."),
					callback: (r) => {
						const out = r.message || {};
						frappe.show_alert({
							message: __("{0} of {1} selected template(s) uploaded.", [
								out.templates_uploaded || 0,
								out.templates_selected || 0,
							]),
							indicator: "green",
						});
					},
				});
			}, "Folders");
		}

		frm.add_custom_button(__("Load Bid Development Templates"), () => {
			load_bid_development_templates(frm);
		}, "Bid Development Templates");

		frm.add_custom_button(__("Task Checklist"), () => {
			frappe.new_doc("Opportunity Task Checklist", {
				opportunity: frm.doc.name,
				title: frm.doc.title || frm.doc.customer_name || frm.doc.name,
			});
		}, __("Create"));
	},
});
