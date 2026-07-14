frappe.listview_settings["SMT Members"] = {
	onload(listview) {
		listview.page.add_inner_button(__("Fetch SMT Members"), () => {
			frappe.call({
				method: "corporate_services.icl_corporate_services.doctype.smt_members.smt_members.fetch_smt_members",
				freeze: true,
				freeze_message: __("Fetching SMT Members..."),
				callback(r) {
					const data = r.message || {};
					let msg = __("Added {0} new SMT member(s).", [data.added || 0]);
					if (data.skipped_no_employee && data.skipped_no_employee.length) {
						msg +=
							"<br>" +
							__("Skipped (no matching Employee): {0}", [
								data.skipped_no_employee.join(", "),
							]);
					}
					frappe.msgprint(msg);
					listview.refresh();
				},
			});
		});
	},
};
