frappe.pages["dev-workspace"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Dev Workspace",
		single_column: true,
	});

	frappe.require("/assets/corporate_services/css/dev_workspace.css");
	frappe.require("/assets/corporate_services/js/dev_workspace.js", () => {
		if (window.initDevWorkspace) {
			window.initDevWorkspace(page);
		}
	});
};
