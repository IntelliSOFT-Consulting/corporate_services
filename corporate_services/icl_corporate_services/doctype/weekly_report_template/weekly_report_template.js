// Copyright (c) 2026, IntelliSOFT Consulting and contributors
// For license information, please see license.txt

frappe.ui.form.on("Weekly Report Template", {
	refresh(frm) {
		frm.add_custom_button(__("Open HR Guide"), () => {
			frappe.set_route("hr-reporting-guide");
		});
	},
});
