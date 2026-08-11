frappe.listview_settings["Jira Project"] = {
	onload(listview) {
		const pendingProject = localStorage.getItem("dw_connect_project");
		if (!pendingProject) return;

		listview.page.set_indicator(`Connecting to Project: ${pendingProject}`, "blue");
		frappe.show_alert(
			{
				message: __("Select the Jira Project to connect to {0}, then use Actions > Connect to Project.", [pendingProject]),
				indicator: "blue",
			},
			10
		);

		listview.page.add_action_item(__("Connect to Project"), () => {
			const checked = listview.get_checked_items();
			if (checked.length !== 1) {
				frappe.msgprint(__("Select exactly one Jira Project to connect."));
				return;
			}

			const jiraProject = checked[0].name;
			frappe.call({
				method: "corporate_services.api.project.link_project_to_jira",
				args: { project_name: pendingProject, jira_project: jiraProject },
				freeze: true,
				freeze_message: __("Connecting..."),
				callback: () => {
					localStorage.removeItem("dw_connect_project");
					frappe.show_alert(
						{ message: __("Connected {0} to Jira Project {1}.", [pendingProject, jiraProject]), indicator: "green" },
						5
					);
					frappe.set_route("dev-workspace");
				},
			});
		});
	},
};
