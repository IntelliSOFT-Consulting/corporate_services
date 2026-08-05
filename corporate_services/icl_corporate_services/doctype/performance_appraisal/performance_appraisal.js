// Copyright (c) 2026, IntelliSOFT Consulting and contributors
// For license information, please see license.txt

frappe.ui.form.on("Performance Appraisal", {
	refresh(frm) {
		add_nudge_supervisor_action(frm);
	},
});

function add_nudge_supervisor_action(frm) {
	const can_show =
		!frm.is_new() &&
		frm.doc.workflow_state === "Submitted to Supervisor" &&
		frappe.user.has_role("HR Manager");

	if (!can_show) return;

	frm.add_custom_button(__("Nudge Supervisor"), function () {
		frappe.call({
			method: "corporate_services.api.notification.reminder_engine.nudge_approver",
			args: {
				reference_doctype: frm.doc.doctype,
				reference_name: frm.doc.name,
			},
			freeze: true,
			freeze_message: __("Sending reminder..."),
			callback: function (r) {
				if (!r.message) return;
				if (r.message.success) {
					frappe.show_alert({ message: r.message.message, indicator: "green" });
				} else {
					frappe.msgprint(r.message.message);
				}
			},
		});
	});
}
