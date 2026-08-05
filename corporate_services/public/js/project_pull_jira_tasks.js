frappe.ui.form.on("Project", {
	refresh(frm) {
		if (frm.is_new() || !frm.doc.custom_jira_project) return;

		frm.add_custom_button("Pull Tasks from Jira", () => {
			frappe.call({
				method: "corporate_services.api.project.pull_project_jira_tasks",
				args: { project_name: frm.doc.name },
				freeze: true,
				freeze_message: "Pulling tasks from Jira...",
				callback: (r) => {
					const out = r.message || {};
					const tasks = out.tasks || {};
					frappe.msgprint({
						title: "Jira Tasks Synced",
						message: `Fetched ${frappe.utils.escape_html(String(out.count ?? 0))} issue(s) from Jira.<br>Tasks created: ${frappe.utils.escape_html(String(tasks.created ?? 0))}, updated: ${frappe.utils.escape_html(String(tasks.updated ?? 0))}${tasks.errors ? `, errors: ${frappe.utils.escape_html(String(tasks.errors))}` : ""}.`,
						indicator: "green",
					});
					frm.reload_doc();
				},
			});
		}, "Jira");
	},
});
