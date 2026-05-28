// Copyright (c) 2026, IntelliSOFT Consulting and contributors
// For license information, please see license.txt

frappe.ui.form.on("Detailed Work Plan", {
	refresh(frm) {
		if (!frm.doc) return;
		// Show button to fetch Drive link from HIS PM Project Lifecycle (if project set)
		if (frm.doc.project) {
			frm.add_custom_button('Fetch Drive Link from HIS PM Lifecycle', function() {
				frappe.msgprint({ title: 'Fetching', message: 'Looking up Drive link from HIS PM Project Lifecycle...', indicator: 'blue' });
				frappe.call({
					method: 'corporate_services.icl_corporate_services.doctype.detailed_work_plan.detailed_work_plan.sync_drive_link_from_lifecycle',
					args: { docname: frm.doc.name },
					freeze: true,
					callback: function(r) {
						if (!r) return;
						if (r.exc) {
							frappe.msgprint({ title: 'Failed', message: (r.exc && r.exc.message) || 'Failed fetching drive link.', indicator: 'red' });
							return;
						}
						if (r.message && r.message.updated) {
							frm.set_value('google_drive_link', r.message.google_drive_link);
							frm.save().then(() => frm.reload_doc());
							frappe.show_alert({ message: 'Drive link updated', indicator: 'green' });
						} else {
							frappe.msgprint({ title: 'Not found', message: r.message.reason || 'No link found on lifecycle record', indicator: 'orange' });
						}
					}
				});
			});
		}
	}
});
