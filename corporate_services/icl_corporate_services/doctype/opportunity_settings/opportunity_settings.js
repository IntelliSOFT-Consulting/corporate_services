// Copyright (c) 2026, IntelliSOFT Consulting and contributors
// For license information, please see license.txt

frappe.ui.form.on("Opportunity Settings", {
	refresh(frm) {
		frm.toggle_display(
			"almost_due_notification_days_before",
			!!frm.doc.notify_on_almost_due_opportunities
		);

		frm.add_custom_button(__("Send Test Owner Reminder"), () => {
			frappe.prompt(
				[
					{
						fieldname: "opportunity",
						fieldtype: "Link",
						label: __("Opportunity"),
						options: "Opportunity",
						reqd: 1,
					},
				],
				async (values) => {
					try {
						await frappe.call({
							method: "corporate_services.api.notification.opportunity.v1.send_manual_due_reminder",
							args: {
								opportunity_name: values.opportunity,
							},
						});

						frappe.show_alert({
							message: __("Test reminder sent to the Opportunity Owner."),
							indicator: "green",
						});
					} catch (error) {
						frappe.msgprint({
							title: __("Reminder Failed"),
							message: error.message || __("Unable to send test reminder."),
							indicator: "red",
						});
					}
				},
				__("Send Test Owner Reminder"),
				__("Send")
			);
		});
	},

	notify_on_almost_due_opportunities(frm) {
		frm.toggle_display(
			"almost_due_notification_days_before",
			!!frm.doc.notify_on_almost_due_opportunities
		);
	},
});
