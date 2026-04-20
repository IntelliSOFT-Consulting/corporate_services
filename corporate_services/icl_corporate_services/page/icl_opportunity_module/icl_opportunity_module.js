frappe.pages['icl-opportunity-module'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'ICL Opportunity Module',
		single_column: false
	});

	const $wrapper = $(page.body);
	$wrapper
		.empty()
		.append('<div id="opportunity-module-root" class="opportunity-module"></div>');

	// Prepare Frappe's sidebar (available because single_column: false)
	$(page.sidebar).empty().append('<div id="opportunity-sidebar-root"></div>');

	frappe.require('/assets/corporate_services/js/opportunity_module.js', function() {
		if (globalThis.initOpportunityModule) {
			globalThis.initOpportunityModule(page);
		} else {
			console.error('Opportunity Module bundle loaded but init function missing');
		}
	});
};

frappe.pages['icl-opportunity-module'].on_page_show = function() {
	const route = frappe.get_route();
	// route[0] = 'icl-opportunity-module', route[1] = opportunity id (optional)
	const opportunityId = route[1] || null;
	if (globalThis.opportunityModuleSetRoute) {
		globalThis.opportunityModuleSetRoute(opportunityId);
	}
};
