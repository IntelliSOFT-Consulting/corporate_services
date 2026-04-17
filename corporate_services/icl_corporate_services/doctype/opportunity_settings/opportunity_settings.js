// Copyright (c) 2026, IntelliSOFT Consulting and contributors
// For license information, please see license.txt

frappe.ui.form.on("Opportunity Settings", {
	refresh(frm) {
		frm.toggle_display(
			"almost_due_notification_days_before",
			!!frm.doc.notify_on_almost_due_opportunities
		);
	},

	notify_on_almost_due_opportunities(frm) {
		frm.toggle_display(
			"almost_due_notification_days_before",
			!!frm.doc.notify_on_almost_due_opportunities
		);
	},
});
