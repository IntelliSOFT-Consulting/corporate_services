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

function sync_drive_documents(frm) {
	if (!frm.doc.project) return;

	frappe.call({
		method: "corporate_services.api.project.google_drive.sync_project_drive_documents",
		args: {
			project_name: frm.doc.project,
			docname: frm.doc.name,
		},
		callback: function (r) {
			const out = (r && r.message) || {};
			frm.reload_doc();
			frappe.show_alert({
				message: `Drive metadata synced. Updated: ${out.updated || 0}, Missing: ${out.missing || 0}`,
				indicator: "green",
			});
		},
	});
}

frappe.ui.form.on("HIS PM Project LifeCycle", {
	refresh(frm) {
		frm.page.set_primary_action("Sync from Toolkit", () => sync_lifecycle_items(frm, true));
		frm.add_custom_button("Sync Drive Metadata", () => sync_drive_documents(frm), "Actions");
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
