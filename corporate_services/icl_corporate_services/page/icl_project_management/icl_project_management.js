frappe.pages["icl-project-management"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "ICL Project Management",
		single_column: false,
	});

	const $wrapper = $(page.body);
	$wrapper.empty().append('<div id="project-management-root" class="project-management"></div>');
	$(page.sidebar).empty().append('<div id="project-management-sidebar-root"></div>');

	frappe.require("/assets/corporate_services/js/project_management.js", function () {
		if (globalThis.initProjectManagement) {
			globalThis.initProjectManagement(page);
		} else {
			console.error("Project Management bundle loaded but init function missing");
		}
	});
};
