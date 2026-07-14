frappe.ui.form.on("HR Settings", {
    refresh(frm) {
        frm.add_custom_button(__("Backfill Missing Leave Ledger Entries"), () => {
            run_leave_ledger_backfill(frm);
        }, __("Leave Allocation"));
    },
});

function run_leave_ledger_backfill(frm) {
    frappe.call({
        method: "corporate_services.api.leave.backfill_leave_ledger_entries.backfill_missing_leave_ledger_entries",
        args: { dry_run: 1 },
        freeze: true,
        freeze_message: __("Scanning Leave Allocations..."),
        callback(r) {
            if (r.exc) {
                return;
            }
            show_backfill_report(r.message, frm);
        },
    });
}

function show_backfill_report(report, frm) {
    const details = report.details || [];

    if (!details.length) {
        frappe.msgprint({
            title: __("Leave Ledger Backfill"),
            indicator: "green",
            message: __("No missing Leave Ledger Entries found. Nothing to fix."),
        });
        return;
    }

    const rows = details.map((d) => `
        <tr>
            <td>${frappe.utils.escape_html(d.allocation)}</td>
            <td>${frappe.utils.escape_html(d.employee)}</td>
            <td>${frappe.utils.escape_html(d.period)}</td>
            <td>${d.leave_days}</td>
        </tr>
    `).join("");

    const table_html = `
        <p>${__("Found {0} missing Leave Ledger Entry(s):", [details.length])}</p>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>${__("Allocation")}</th>
                    <th>${__("Employee")}</th>
                    <th>${__("Period")}</th>
                    <th>${__("Days")}</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;

    const dialog = new frappe.ui.Dialog({
        title: __("Leave Ledger Backfill - Review"),
        size: "large",
        fields: [
            {
                fieldtype: "HTML",
                fieldname: "report_html",
                options: table_html,
            },
        ],
        primary_action_label: __("Create Missing Entries"),
        primary_action() {
            dialog.hide();
            frappe.confirm(
                __("This will create and submit {0} Leave Ledger Entry(s) in production. Continue?", [details.length]),
                () => execute_backfill(frm)
            );
        },
    });

    dialog.show();
}

function execute_backfill(frm) {
    frappe.call({
        method: "corporate_services.api.leave.backfill_leave_ledger_entries.backfill_missing_leave_ledger_entries",
        args: { dry_run: 0 },
        freeze: true,
        freeze_message: __("Creating missing Leave Ledger Entries..."),
        callback(r) {
            if (r.exc) {
                return;
            }
            frappe.msgprint({
                title: __("Leave Ledger Backfill Complete"),
                indicator: "green",
                message: __("Created {0} Leave Ledger Entry(s).", [r.message.missing_count]),
            });
        },
    });
}
