// Copyright (c) 2026, ICL and contributors
// For license information, please see license.txt

frappe.ui.form.on("Jira Project", {
	refresh(frm) {
		if (frm.is_new()) return;

		frm.add_custom_button(__("Pull Issues from Jira"), () => {
			frappe.call({
				method: "corporate_services.icl_corporate_services.doctype.jira_settings.jira_settings.pull_issues",
				args: { project_key: frm.doc.project_key },
				freeze: true,
				freeze_message: __("Pulling issues from Jira..."),
				callback: (r) => {
					const m = r.message || {};
					const t = m.tasks || {};
					let msg = __("Synced {0} issue(s).", [m.count || 0]);
					if (t.linked_project) {
						msg += " " + __("ERP Tasks: {0} created, {1} updated.", [t.created || 0, t.updated || 0]);
					} else {
						msg += " " + __("No linked ERP Project (set Jira Project on a Project to create tasks).");
					}
					frappe.msgprint({ title: __("Jira Sync"), indicator: "green", message: msg });
					frm.reload_doc();
				},
			});
		});
	},
});
