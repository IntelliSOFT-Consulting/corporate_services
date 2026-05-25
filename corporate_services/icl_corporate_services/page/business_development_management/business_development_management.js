frappe.pages["business-development-management"].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "Business Development Management",
    single_column: false,
  });

  $(page.body)
    .empty()
    .append('<div id="business-development-management-root" class="p-0"></div>');

  $(page.sidebar).empty().append('<div id="bdm-sidebar-root"></div>');

  frappe.require("/assets/corporate_services/js/business_development_management.js", function () {
    if (globalThis.initBusinessDevelopmentManagement) {
      globalThis.initBusinessDevelopmentManagement(page);
    } else {
      console.error("Business Development bundle loaded but init function missing");
    }
  });
};
