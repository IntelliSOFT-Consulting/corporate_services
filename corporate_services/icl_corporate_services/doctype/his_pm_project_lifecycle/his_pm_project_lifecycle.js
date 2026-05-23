// Copyright (c) 2026, IntelliSOFT Consulting and contributors
// For license information, please see license.txt

function sync_lifecycle_items(frm, force = false) {
	if (!frm.doc.project) {
		frm.clear_table("lifecycle_items");
		frm.refresh_field("lifecycle_items");
		return;
	}

	if (frm.is_dirty() && !force) {
		return;
	}

	frappe.call({
		method: "corporate_services.api.project.get_project_lifecycle_items",
		args: {
			project: frm.doc.project,
			docname: frm.doc.name,
		},
		callback: function (r) {
			const rows = (r && r.message) || [];
			frm.clear_table("lifecycle_items");
			rows.forEach((row) => {
				const child = frm.add_child("lifecycle_items");
				Object.assign(child, row);
			});
			frm.refresh_field("lifecycle_items");
		},
	});
}

frappe.ui.form.on("HIS PM Project LifeCycle", {
	refresh(frm) {
		frm.page.set_primary_action("Sync from Toolkit", () => sync_lifecycle_items(frm, true));
		if (frm.doc.project) {
			sync_lifecycle_items(frm);
		}
	},
	project(frm) {
		if (frm.doc.project) {
			sync_lifecycle_items(frm, true);
		}
	},
});
