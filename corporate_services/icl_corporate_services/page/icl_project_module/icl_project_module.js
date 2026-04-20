frappe.pages['icl-project-module'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'ICL Project Module',
		single_column: false
	});

	const $wrapper = $(page.body);
	$wrapper
		.empty()
		.append('<div id="project-module-root" class="project-module"></div>');

	// Prepare Frappe's sidebar (available because single_column: false)
	$(page.sidebar).empty().append('<div id="project-sidebar-root"></div>');

	frappe.require('/assets/corporate_services/js/project_module.js', function() {
		if (globalThis.initProjectModule) {
			globalThis.initProjectModule(page);
		} else {
			console.error('Project Module bundle loaded but init function missing');
		}
	});
};

frappe.pages['icl-project-module'].on_page_show = function() {
	const route = frappe.get_route();
	// route[0] = 'icl-project-module', route[1] = project id (optional)
	const projectId = route[1] || null;
	if (globalThis.projectModuleSetRoute) {
		globalThis.projectModuleSetRoute(projectId);
	}
};
