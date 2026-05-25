frappe.pages['hr-management'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'HR Management',
		single_column: false
	});

	const $wrapper = $(page.body);
	$wrapper
		.empty()
		.append('<div id="hr-management-root" class="hr-management p-0"></div>');

	// Prepare Frappe's sidebar
	$(page.sidebar).empty().append('<div id="hr-sidebar-root"></div>');

	frappe.require('/assets/corporate_services/js/hr_management.js', function() {
		if (globalThis.initHRManagement) {
			globalThis.initHRManagement(page);
		} else {
			console.error('HR Management bundle loaded but init function missing');
		}
	});
};

frappe.pages['hr-management'].on_page_show = function() {
	const route = frappe.get_route();
	// route[0] = 'hr-management', route[1] = employee id (optional)
	const employeeId = route[1] || null;
	if (globalThis.hrManagementSetRoute) {
		globalThis.hrManagementSetRoute(employeeId);
	}
};
