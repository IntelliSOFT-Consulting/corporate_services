frappe.ui.form.on("Employee", {
    refresh(frm) {
        if (frm.is_new() || !frm.doc.name) {
            return;
        }

        populate_leave_balance_table(frm);
        bind_raise_issue_button(frm);
    },
});

function populate_leave_balance_table(frm) {
    const table_field = frm.fields_dict.custom_leave_balance_summary;
    if (!table_field || !table_field.grid) {
        return;
    }

    frappe.call({
        method: "corporate_services.api.leave.employee_leave_balance.get_employee_leave_balance_summary",
        args: { employee: frm.doc.name },
        callback(r) {
            if (r.exc) {
                return;
            }

            const payload = r.message || {};
            const rows = payload.rows || [];

            // Render table in-memory without mutating Employee doc,
            // so the form does not become "Not Saved" on refresh.
            table_field.grid.df.data = rows.map((row, idx) => ({
                idx: idx + 1,
                leave_type: row.leave_type || "",
                allocated: flt(row.total_leaves_allocated || 0, 2),
                used: flt(row.leaves_used || 0, 2),
                balance: flt(row.balance || 0, 2),
                from_date: row.from_date || null,
                to_date: row.to_date || null,
            }));
            table_field.grid.refresh();
        },
    });
}

function bind_raise_issue_button(frm) {
    const btn_field = frm.fields_dict.custom_raise_leave_balance_issue;
    if (!btn_field || !btn_field.$input) {
        return;
    }

    btn_field.$input.off("click").on("click", () => {
        const dialog = new frappe.ui.Dialog({
            title: __("Raise Leave Balance Issue"),
            fields: [
                {
                    label: __("Issue Details"),
                    fieldname: "issue",
                    fieldtype: "Small Text",
                    reqd: 1,
                    description: __("Describe the leave balance issue you want HR to review."),
                },
            ],
            primary_action_label: __("Send to HR"),
            primary_action(values) {
                frappe.call({
                    method: "corporate_services.api.leave.employee_leave_balance.raise_leave_balance_issue",
                    args: {
                        employee: frm.doc.name,
                        issue: values.issue,
                    },
                    freeze: true,
                    freeze_message: __("Sending issue to HR..."),
                    callback(r) {
                        if (!r.exc) {
                            frappe.show_alert({
                                message: __("Issue sent to HR successfully."),
                                indicator: "green",
                            });
                            dialog.hide();
                        }
                    },
                });
            },
        });
        dialog.show();
    });
}
