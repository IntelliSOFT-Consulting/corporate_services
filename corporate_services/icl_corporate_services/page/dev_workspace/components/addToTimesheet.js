function monthYearOptions() {
    const now = new Date();
    const options = [];
    for (let offset = -2; offset <= 1; offset++) {
        const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        const label = d.toLocaleString("en-US", { month: "long", year: "numeric" });
        options.push({ label, value: `${mm}-${yyyy}` });
    }
    return options;
}

export function openAddToTimesheetDialog(task, onDone) {
    const dialog = new frappe.ui.Dialog({
        title: __("Add to Timesheet"),
        fields: [
            {
                fieldname: "task_label",
                fieldtype: "HTML",
                options: `<div class="text-muted" style="margin-bottom:8px;">${frappe.utils.escape_html(
                    task.subject || task.name
                )}</div>`,
            },
            {
                fieldname: "month_year",
                label: __("Month"),
                fieldtype: "Select",
                reqd: 1,
                options: monthYearOptions(),
            },
        ],
        primary_action_label: __("Add Task"),
        primary_action(values) {
            frappe.call({
                method: "corporate_services.icl_corporate_services.page.employee_timesheet_entry.employee_timesheet_entry.add_task_to_timesheet",
                args: { task_name: task.name, month_year: values.month_year },
                freeze: true,
                freeze_message: __("Adding task to timesheet..."),
                callback: (r) => {
                    const res = r.message || {};
                    dialog.hide();

                    let message;
                    if (res.duplicate) {
                        message = __("This task is already on that month's timesheet.");
                    } else if (res.created_submission) {
                        message = __("Created a new Timesheet Submission for {0} and added the task at 0 hours - fill in the hours whenever you're ready.", [
                            values.month_year,
                        ]);
                    } else {
                        message = __("Added the task to the existing Timesheet Submission for {0} at 0 hours - fill in the hours whenever you're ready.", [
                            values.month_year,
                        ]);
                    }

                    frappe.msgprint({
                        title: __("Added to Timesheet"),
                        message: `${message}<br><br><a href="/app/employee_timesheet_entry?submission=${encodeURIComponent(
                            res.submission_name
                        )}" target="_blank">${__("Open Timesheet Entry")}</a>`,
                        indicator: res.duplicate ? "orange" : "green",
                    });

                    if (onDone) onDone(res);
                },
            });
        },
    });

    dialog.show();
}
