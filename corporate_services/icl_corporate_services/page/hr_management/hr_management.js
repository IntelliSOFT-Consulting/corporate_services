frappe.pages['hr-management'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'HR Management',
		single_column: false
	});

	const $wrapper = $(page.body);
	$wrapper
		.empty()
		.append('<div id="staff-management-root" class="staff-management p-0"></div>');

	// Prepare Frappe's sidebar
	$(page.sidebar).empty().append('<div id="staff-sidebar-root"></div>');

	frappe.require('/assets/corporate_services/js/staff_management.js', function() {
		if (globalThis.initStaffManagement) {
			globalThis.initStaffManagement(page);
		} else {
			console.error('HR Management bundle loaded but init function missing');
		}
	});
};

frappe.pages['hr-management'].on_page_show = function() {
	const route = frappe.get_route();
	// route[0] = 'hr-management', route[1] = employee id (optional)
	const employeeId = route[1] || null;
	if (globalThis.staffManagementSetRoute) {
		globalThis.staffManagementSetRoute(employeeId);
	}
};
