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
	},
});
