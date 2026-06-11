// Copyright (c) 2026, ICL and contributors
// For license information, please see license.txt

frappe.ui.form.on("Jira Settings", {
	refresh(frm) {
		frm.add_custom_button(__("Test Connection"), () => {
			const run = () => {
				frappe.call({
					method: "corporate_services.icl_corporate_services.doctype.jira_settings.jira_settings.test_connection",
					freeze: true,
					freeze_message: __("Testing connection..."),
					callback: (r) => {
						const m = r.message || {};
						frappe.msgprint({
							title: m.ok ? __("Success") : __("Failed"),
							indicator: m.ok ? "green" : "red",
							message: frappe.utils.escape_html(m.message || ""),
						});
						frm.reload_doc();
					},
				});
			};
			if (frm.is_dirty()) {
				frm.save().then(run);
			} else {
				run();
			}
		});

		frm.add_custom_button(__("Pull Project by Key"), () => {
			frappe.prompt(
				{ fieldname: "key", label: __("Project Key"), fieldtype: "Data", reqd: 1 },
				(v) => {
					frappe.call({
						method: "corporate_services.icl_corporate_services.doctype.jira_settings.jira_settings.pull_project",
						args: { key: v.key },
						freeze: true,
						freeze_message: __("Fetching project..."),
						callback: (r) => {
							const m = r.message || {};
							if (!m.ok) {
								frappe.msgprint({ title: __("Not Found"), indicator: "red", message: frappe.utils.escape_html(m.message || "") });
								return;
							}
							const p = m.project;
							frappe.msgprint({
								title: frappe.utils.escape_html(p.name),
								message: `<b>${__("Key")}:</b> ${frappe.utils.escape_html(p.key)}<br><b>${__("ID")}:</b> ${frappe.utils.escape_html(p.id)}<br><b>${__("Type")}:</b> ${frappe.utils.escape_html(p.projectTypeKey || "")}<br><b>${__("Lead")}:</b> ${frappe.utils.escape_html(p.lead || "")}`,
							});
						},
					});
				},
				__("Pull Jira Project"),
				__("Fetch")
			);
		});

		frm.add_custom_button(__("Pull Projects"), () => {
			frappe.call({
				method: "corporate_services.icl_corporate_services.doctype.jira_settings.jira_settings.pull_projects",
				freeze: true,
				freeze_message: __("Pulling projects from Jira..."),
				callback: (r) => {
					const m = r.message || {};
					frappe.msgprint({
						title: __("Projects Synced"),
						indicator: "green",
						message: `${__("Created")}: ${m.created || 0}<br>${__("Updated")}: ${m.updated || 0}<br><br><a href="/app/jira-project">${__("View Jira Projects")}</a>`,
					});
				},
			});
		});
	},
});
