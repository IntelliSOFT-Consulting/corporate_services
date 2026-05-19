// Copyright (c) 2026, IntelliSOFT Consulting and contributors
// For license information, please see license.txt

frappe.ui.form.on("Weekly Progress Report", {
	onload(frm) {
		set_default_week_window(frm);
		ensure_active_template_and_questions(frm);
	},
	question_template(frm) {
		if (!frm.doc.question_template) return;
		populate_questions_from_template(frm);
	},
	refresh(frm) {
		frm.add_custom_button(__("Open HR Guide"), () => {
			frappe.set_route("hr-reporting-guide");
		});
		render_questionnaire_ui(frm);
	},
	onload_post_render(frm) {
		render_questionnaire_ui(frm);
	},
	validate(frm) {
		sync_questionnaire_ui_to_rows(frm);
		validate_week_window(frm);
	},
});

function set_default_week_window(frm) {
	if (!frm.is_new()) return;
	if (frm.doc.week_window_start || frm.doc.week_window_end) return;

	const today = frappe.datetime.str_to_obj(frappe.datetime.get_today());
	const dayOfWeek = today.getDay(); // Sunday = 0
	const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
	const weekStart = new Date(today);
	weekStart.setDate(today.getDate() + mondayOffset);
	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekStart.getDate() + 4);

	frm.set_value("week_window_start", frappe.datetime.obj_to_str(weekStart));
	frm.set_value("week_window_end", frappe.datetime.obj_to_str(weekEnd));
}

function ensure_active_template_and_questions(frm, forceRefresh = false) {
	if ((frm.doc.answers || []).length && !forceRefresh) {
		return;
	}

	if (frm.doc.question_template && !forceRefresh) {
		populate_questions_from_template(frm);
		return;
	}

	frappe.call({
		method:
			"corporate_services.icl_corporate_services.doctype.weekly_progress_report.weekly_progress_report.get_active_template_questions",
		callback: (r) => {
			const payload = r.message || {};
			if (!payload.template_name) {
				frappe.msgprint(__("No active Weekly Report Template found. Please contact HR/System Admin."));
				return;
			}

			if (frm.doc.question_template !== payload.template_name) {
				frm.set_value("question_template", payload.template_name);
				return;
			}
			populate_questions_from_template(frm);
		},
	});
}

function validate_week_window(frm) {
	if (!frm.doc.week_window_start || !frm.doc.week_window_end) return;
	if (frm.doc.week_window_end < frm.doc.week_window_start) {
		frappe.throw(__("Week Window End cannot be earlier than Week Window Start."));
	}

	const startObj = frappe.datetime.str_to_obj(frm.doc.week_window_start);
	const endObj = frappe.datetime.str_to_obj(frm.doc.week_window_end);
	const startDay = startObj.getDay(); // Sunday=0, Monday=1
	const endDay = endObj.getDay(); // Friday=5
	const dayDiff = Math.round((endObj - startObj) / (1000 * 60 * 60 * 24));

	if (startDay !== 1 || endDay !== 5 || dayDiff !== 4) {
		frappe.throw(__("Week Window must be weekdays only: Monday to Friday."));
	}
}

function populate_questions_from_template(frm) {
	if ((frm.doc.answers || []).length && !frm.is_new()) {
		render_questionnaire_ui(frm);
		return;
	}

	frappe.call({
		method:
			"corporate_services.icl_corporate_services.doctype.weekly_progress_report.weekly_progress_report.get_active_template_questions",
		args: {
			template_name: frm.doc.question_template || null,
		},
		callback: (r) => {
			const payload = r.message || {};
			const questions = payload.questions || [];
			if (payload.template_name && frm.doc.question_template !== payload.template_name) {
				frm.set_value("question_template", payload.template_name);
			}

			const existing = {};
			(frm.doc.answers || []).forEach((row) => {
				existing[row.question] = row.response;
				existing[strip_number_prefix(row.question)] = row.response;
			});

			frm.clear_table("answers");
			questions.forEach((q, idx) => {
				const numberedQuestion = `${idx + 1}. ${q.question_text}`;
				const row = frm.add_child("answers");
				row.question = numberedQuestion;
				row.help_text = q.help_text;
				row.is_required = q.is_required;
				row.response_fieldtype = q.response_fieldtype || "Text Editor";
				row.response = existing[numberedQuestion] || existing[q.question_text] || "";
			});
			frm.refresh_field("answers");
			render_questionnaire_ui(frm);
		},
	});
}

function strip_number_prefix(text) {
	return (text || "").replace(/^\s*\d+\.\s*/, "").trim();
}

function render_questionnaire_ui(frm) {
	const field = frm.get_field("response_ui");
	if (!field || !field.$wrapper) return;

	const rows = frm.doc.answers || [];
	if (!rows.length) {
		field.$wrapper.html(
			'<div class="text-muted">No active weekly questions are available right now.</div>',
		);
		return;
	}

	const cards = rows
		.map((row, idx) => {
			const requiredStar = row.is_required
				? '<span class="text-danger ms-1" style="font-weight:700;" title="Required">*</span>'
				: "";
			const inputId = `weekly-response-${idx}`;
			return `
				<div class="card border mb-3">
					<div class="card-body">
						<div class="d-flex align-items-center mb-2">
							<h6 class="mb-0">${frappe.utils.escape_html(row.question || `Question ${idx + 1}`)}</h6>
							${requiredStar}
						</div>
						${
							row.help_text
								? `<div class="text-muted mb-2" style="font-size:12px;">${frappe.utils.escape_html(row.help_text)}</div>`
								: ""
						}
						<div class="weekly-question-response-control" id="${inputId}" data-row-idx="${idx}"></div>
					</div>
				</div>
			`;
		})
		.join("");

	field.$wrapper.html(`<div class="weekly-questionnaire-ui">${cards}</div>`);

	field.$wrapper.find(".weekly-question-response-control").each(function () {
		const idx = Number(this.getAttribute("data-row-idx"));
		const row = (frm.doc.answers || [])[idx];
		if (!row) return;
		const fieldtype = row.response_fieldtype || "Text Editor";
		const control = frappe.ui.form.make_control({
			parent: $(this),
			df: {
				fieldtype,
				label: "",
				options: fieldtype === "Text Editor" ? "Minimal" : null,
				placeholder: "Type your response here...",
			},
			render_input: true,
			only_input: true,
		});
		control.set_value(row.response || "");
		const saveValue = () => {
			const value = control.get_value ? control.get_value() : "";
			frappe.model.set_value(row.doctype, row.name, "response", value || "");
		};
		const deferredSave = () => setTimeout(saveValue, 0);
		control.$input && control.$input.on("input change keyup blur paste", deferredSave);
		control.$wrapper && control.$wrapper.on("input change keyup blur paste", deferredSave);
		control.$wrapper && control.$wrapper.find(".ql-editor").on("input keyup blur paste", deferredSave);
	});
}

function sync_questionnaire_ui_to_rows(frm) {
	(frm.doc.answers || []).forEach((row) => {
		row.response = row.response || "";
	});
	frm.refresh_field("answers");
}
