frappe.pages["employee_timesheet_entry"].on_page_load = function(wrapper) {
    const formatTimesheetTitle = (monthYear) => {
        if (!monthYear || typeof monthYear !== "string") return "Timesheet Entry";
        const [mm, yyyy] = monthYear.split("-");
        const monthNum = parseInt(mm, 10);
        const yearNum = parseInt(yyyy, 10);
        if (!monthNum || monthNum < 1 || monthNum > 12 || !yearNum) return "Timesheet Entry";
        const dt = new Date(yearNum, monthNum - 1, 1);
        const monthName = dt.toLocaleString("en-US", { month: "long" });
        return `${monthName} ${yearNum} Timesheet`;
    };

    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "Timesheet Entry"
    });
    $(page.sidebar).empty().append('<div id="timesheet-entry-sidebar-root"></div>');
    $(page.page_actions).empty().append('<div id="timesheet-entry-actions-root"></div>');
    const $titleArea = $(wrapper).find(".page-head .title-area");
    if ($titleArea.length) {
        $titleArea.css({
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "nowrap"
        });
        const $contextRoot = $('<div id="timesheet-entry-context-root" style="display:flex; align-items:center; gap:12px; min-height:28px; margin-left:8px;"></div>');
        const $titleText = $titleArea.find(".title-text, h3").first();
        if ($titleText.length) {
            $contextRoot.insertAfter($titleText);
        } else {
            $titleArea.append($contextRoot);
        }
    }
    frappe.require("/assets/corporate_services/css/employee_timesheet_entry.css");
    frappe.require("/assets/corporate_services/js/employee_timesheet_entry.js", () => {
        if (window.initTimesheetEntry) {
            const params = frappe.utils.get_query_params();
            window.initTimesheetEntry(page, params.submission || "", (context) => {
                page.set_title(formatTimesheetTitle(context && context.month_year));
            });
        }
    });
};
