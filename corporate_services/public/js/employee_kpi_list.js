frappe.listview_settings["Employee KPI"] = {
    onload(listview) {
        if (!frappe.user.has_role("HR Manager") && !frappe.user.has_role("System Manager")) {
            return;
        }

        listview.page.add_inner_button(__("Start KPI Cycle"), () => {
            show_start_kpi_cycle_dialog(listview);
        });
    },
};

function show_start_kpi_cycle_dialog(listview) {
    const dialog = new frappe.ui.Dialog({
        title: __("Start KPI Cycle"),
        fields: [
            {
                fieldname: "review_period_start",
                fieldtype: "Date",
                label: __("Review Period Start"),
                reqd: 1,
                default: frappe.datetime.get_today(),
            },
            {
                fieldname: "review_period_end",
                fieldtype: "Date",
                label: __("Review Period End"),
                reqd: 1,
            },
            {
                fieldname: "submission_deadline",
                fieldtype: "Date",
                label: __("Submission Deadline"),
                reqd: 1,
                default: frappe.datetime.add_days(frappe.datetime.get_today(), 7),
            },
            {
                fieldname: "department",
                fieldtype: "Link",
                options: "Department",
                label: __("Department (optional filter)"),
            },
            {
                fieldname: "contract_type",
                fieldtype: "Link",
                options: "Contract Type",
                label: __("Contract Type (optional filter)"),
            },
            {
                fieldname: "employees",
                fieldtype: "MultiSelectList",
                label: __("Specific Employees (optional - overrides filters above)"),
                get_data(txt) {
                    return frappe.db.get_link_options("Employee", txt, { status: "Active" });
                },
            },
        ],
        primary_action_label: __("Start"),
        primary_action(values) {
            dialog.hide();
            frappe.call({
                method: "corporate_services.api.kpi.start_kpi_cycle.start_kpi_cycle",
                args: {
                    review_period_start: values.review_period_start,
                    review_period_end: values.review_period_end,
                    submission_deadline: values.submission_deadline,
                    department: values.department,
                    contract_type: values.contract_type,
                    employees: values.employees,
                },
                freeze: true,
                freeze_message: __("Creating KPI drafts..."),
                callback(r) {
                    if (r.exc) {
                        return;
                    }
                    const res = r.message;
                    frappe.msgprint({
                        title: __("KPI Cycle Started"),
                        indicator: "green",
                        message: __(
                            "Created {0} draft KPI(s). Skipped {1} (already have a KPI for this review period).",
                            [res.created_count, res.skipped_count]
                        ),
                    });
                    listview.refresh();
                },
            });
        },
    });

    dialog.show();
}
