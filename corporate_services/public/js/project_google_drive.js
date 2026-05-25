frappe.ui.form.on("Project", {
	refresh(frm) {
		if (frm.is_new()) return;

		frm.add_custom_button("Project Management Dashboard", () => {
			frappe.set_route("icl-project-management", frm.doc.name);
		}, "View");

		frm.add_custom_button("Create Drive Folder", () => {
			createDriveFolder(frm);
		}, "Google Drive");
	},
});

function createDriveFolder(frm) {
	frappe.call({
		method: "corporate_services.api.project.google_drive.create_project_google_drive_folder",
		args: {
			project_name: frm.doc.name,
			folder_name: frm.doc.project_name || frm.doc.name,
		},
		freeze: true,
		freeze_message: "Creating Google Drive folder...",
		callback: (r) => {
			const out = r.message || {};
			const link = out.folder_link || "";
			frappe.msgprint({
				title: "Google Drive Folder Created",
				message: link
					? `Folder: <strong>${frappe.utils.escape_html(out.folder_name || "")}</strong><br><a href="${frappe.utils.escape_html(link)}" target="_blank">Open in Google Drive</a><br><small>ID: ${frappe.utils.escape_html(out.folder_id || "")}</small><br><small>Toolkit folders created: ${frappe.utils.escape_html(String(out.lifecycle_folders_created || 0))}</small><br><small>Drive docs uploaded: ${frappe.utils.escape_html(String(out.templates_uploaded || 0))}</small>`
					: "Folder created.",
				indicator: "green",
			});
		},
	});
}
