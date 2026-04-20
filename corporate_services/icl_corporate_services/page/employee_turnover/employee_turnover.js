frappe.pages['employee-turnover'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Employee Turnover',
		single_column: false
	});

	const $wrapper = $(page.body);
	$wrapper
		.empty()
		.append('<div id="employee-turnover-root" class="employee-turnover"></div>');

	const $sidebar = $(page.sidebar);
	$sidebar
		.empty()
		.css({ height: '100%' })
		.append('<div id="et-sidebar-root" style="height:100%;overflow-y:auto;"></div>');

	frappe.require('/assets/corporate_services/js/employee_turnover.js', function() {
		if (globalThis.initEmployeeTurnover) {
			globalThis.initEmployeeTurnover(page);
		} else {
			console.error('Employee Turnover bundle loaded but init function missing');
		}
	});
};

frappe.pages['employee-turnover'].on_page_show = function() {
	const route = frappe.get_route();
	const employeeId = route[1] || null;
	if (globalThis.employeeTurnoverSetRoute) {
		globalThis.employeeTurnoverSetRoute(employeeId);
	}
};
