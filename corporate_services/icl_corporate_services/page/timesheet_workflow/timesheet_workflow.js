frappe.pages["timesheet_workflow"].on_page_load = function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "Timesheet Submissions Reports",
    });
    page.add_inner_button("Project Hours Dashboard", () => {
        frappe.set_route("project-timesheet-hours-dashboard");
    });

    frappe.require("/assets/corporate_services/css/timesheet_workflow.css");

    function buildSidebar(wrapper) {
        const sidebarEl = wrapper.querySelector(".layout-side-section");
        if (!sidebarEl) return;
        frappe.call({
            method: "corporate_services.icl_corporate_services.page.timesheet_workflow.timesheet_workflow.get_all_employees",
            callback: function (r) {
                const employees = r.message || [];

                function renderEmployeeIcon(title) {
                    const letter = (title || "?")[0].toUpperCase();
                    return `<span class="ts-item-icon" style="
                        width:18px;height:18px;border-radius:4px;
                        background:var(--primary,#5e64ff);color:#fff;
                        font-size:10px;font-weight:700;
                        display:inline-flex;align-items:center;justify-content:center;
                        margin-right:9px;flex-shrink:0;opacity:1;
                    ">${letter}</span>`;
                }

                function employeeItemsHtml(filterText = "") {
                    const query = filterText.trim().toLowerCase();
                    const filtered = !query
                        ? employees
                        : employees.filter((emp) =>
                            (emp.employee_name || "").toLowerCase().includes(query) ||
                            (emp.name || "").toLowerCase().includes(query) ||
                            (emp.department || "").toLowerCase().includes(query) ||
                            (emp.designation || "").toLowerCase().includes(query)
                        );

                    return filtered.length
                        ? filtered.map((emp) => `
                            <a class="ts-sidebar-item ts-employee-item"
                               data-employee="${emp.name}"
                               href="/app/timesheet_workflow/employee/${encodeURIComponent(emp.name)}">
                                ${renderEmployeeIcon(emp.employee_name || emp.name)}
                                <span class="ts-item-label">
                                    <span style="display:block;">${emp.employee_name || emp.name}</span>
                                    <span style="display:block;font-size:11px;color:#8c8c8c;">${emp.department || "No Department"}</span>
                                </span>
                            </a>
                        `).join("")
                        : `<div class="text-muted small px-2 py-2">No active employees found.</div>`;
                }

                // Render the static shell once. The search input is created a single
                // time so it is never destroyed/recreated while typing.
                function renderShell() {
                    sidebarEl.innerHTML = `
                        <div class="ts-sidebar-nav">
                            <div class="ts-sidebar-group">
                                <div class="ts-sidebar-group-label">REPORTS</div>
                                <div class="ts-sidebar-group-items">
                                    <a class="ts-sidebar-item" data-route="all-submissions" href="/app/timesheet_workflow/all-submissions">
                                        <span class="ts-item-icon">${frappe.utils.icon("list", "sm") || ""}</span>
                                        <span class="ts-item-label">All Timesheet Submissions</span>
                                    </a>
                                </div>
                            </div>
                            <div class="ts-sidebar-divider"></div>
                            <div class="ts-sidebar-group">
                                <div class="ts-sidebar-group-label">ACTIVE EMPLOYEES</div>
                                <div class="px-2 pb-2">
                                    <input type="text" class="form-control form-control-sm ts-sidebar-search" placeholder="Search employees...">
                                </div>
                                <div class="ts-sidebar-group-items ts-sidebar-employee-list">
                                    ${employeeItemsHtml("")}
                                </div>
                            </div>
                        </div>
                    `;

                    bindStaticEvents();
                    bindEmployeeEvents();
                    setActive();
                }

                // Update only the list container, leaving the search input intact
                // so focus and caret position are preserved while typing.
                function updateList(filterText) {
                    const listEl = sidebarEl.querySelector(".ts-sidebar-employee-list");
                    if (!listEl) return;
                    listEl.innerHTML = employeeItemsHtml(filterText);
                    bindEmployeeEvents();
                    setActive();
                }

                function setActive() {
                    const route = frappe.get_route() || [];
                    const currentView = route[1] ? decodeURIComponent(route[1]) : "";
                    const currentEmployee = route[2] ? decodeURIComponent(route[2]) : "";

                    sidebarEl.querySelectorAll(".ts-sidebar-item").forEach((el) => {
                        el.classList.remove("active");
                    });

                    if (currentView === "all-submissions") {
                        const match = sidebarEl.querySelector('.ts-sidebar-item[data-route="all-submissions"]');
                        if (match) match.classList.add("active");
                    }

                    if (currentView === "employee" && currentEmployee) {
                        const match = sidebarEl.querySelector(`.ts-sidebar-item[data-employee="${currentEmployee}"]`);
                        if (match) match.classList.add("active");
                    }
                }

                function bindStaticEvents() {
                    const searchInput = sidebarEl.querySelector(".ts-sidebar-search");
                    if (searchInput) {
                        searchInput.addEventListener("input", (e) => updateList(e.target.value));
                    }

                    sidebarEl.querySelectorAll(".ts-sidebar-item[data-route]").forEach((el) => {
                        el.addEventListener("click", (e) => {
                            e.preventDefault();
                            frappe.set_route("timesheet_workflow", "all-submissions");
                        });
                    });
                }

                function bindEmployeeEvents() {
                    sidebarEl.querySelectorAll(".ts-sidebar-item[data-employee]").forEach((el) => {
                        el.addEventListener("click", (e) => {
                            e.preventDefault();
                            frappe.set_route("timesheet_workflow", "employee", el.dataset.employee);
                        });
                    });
                }

                renderShell();
                frappe.router.on("change", setActive);
            }
        });
    }

    buildSidebar(wrapper);

    frappe.require(
        "https://cdn.jsdelivr.net/npm/chart.js",
        () => {
            frappe.require(
                "/assets/corporate_services/js/timesheet_workflow.js",
                () => {
                    if (window.initTimesheetWorkflow) {
                        window.initTimesheetWorkflow(page);
                    } else {
                        console.error("React bundle loaded but init function missing");
                    }
                }
            );
        }
    );
};

frappe.pages["timesheet_workflow"].on_page_show = function (wrapper) {
    setTimeout(() => {
        const sidebar = wrapper.querySelector(".layout-side-section");
        if (sidebar) {
            sidebar.style.display = "block";
            sidebar.style.minWidth = "220px";
            sidebar.style.width = "220px";
        }
    }, 50);
};
