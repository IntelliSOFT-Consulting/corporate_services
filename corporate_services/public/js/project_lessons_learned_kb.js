frappe.ui.form.on("Project", {
	project_type(frm) {
		show_related_lessons_learned(frm);
	},
	refresh(frm) {
		if (frm.doc.project_type) show_related_lessons_learned(frm);
	},
});

function show_related_lessons_learned(frm) {
	frm.dashboard.clear_headline();
	frm.remove_custom_button("View Related Lessons Learned", "View");

	frappe.call({
		method: "corporate_services.icl_corporate_services.page.icl_project_management.icl_project_management.search_lessons_learned_kb",
		args: { project_type: frm.doc.project_type },
	}).then((r) => {
		const reports = r.message || [];
		if (!reports.length) return;

		frm.dashboard.set_headline_alert(
			`<i class="fa fa-lightbulb-o text-warning"></i>
			${reports.length} lessons learned report${reports.length !== 1 ? "s" : ""} from past
			<strong>${frappe.utils.escape_html(frm.doc.project_type)}</strong> projects may be relevant to this project.`,
			"blue"
		);

		frm.add_custom_button(
			`View Related Lessons Learned (${reports.length})`,
			() => frappe.set_route("icl-project-management"),
			"View"
		);
	});
}
