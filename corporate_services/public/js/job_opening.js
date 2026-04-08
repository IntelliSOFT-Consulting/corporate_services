function build_import_summary(summary) {
	const minimum = summary.minimum_quiz || {};
	const preferred = summary.preferred_quiz || {};

	return `
		<div style="line-height: 1.7;">
			<div><strong>Requirement Quiz Import Complete</strong></div>
			<div style="margin-top: 6px;">
				<div><strong>Minimum Requirements Quiz:</strong> ${frappe.utils.escape_html(minimum.name || "")}</div>
				<div>Created: ${minimum.created_count || 0}, Updated: ${minimum.updated_count || 0}, Skipped: ${minimum.skipped_count || 0}, Linked: ${minimum.linked_count || 0}</div>
			</div>
			<div style="margin-top: 8px;">
				<div><strong>Preferred Profile Quiz:</strong> ${frappe.utils.escape_html(preferred.name || "")}</div>
				<div>Created: ${preferred.created_count || 0}, Updated: ${preferred.updated_count || 0}, Skipped: ${preferred.skipped_count || 0}, Linked: ${preferred.linked_count || 0}</div>
			</div>
		</div>
	`;
}

async function getQuizQuestionRows(quizName, sourceLabel) {
	if (!quizName) return [];

	const quizDoc = await frappe.db.get_doc("Quiz", quizName);
	const linkedQuestions = (quizDoc.questions || [])
		.map((row) => row.question)
		.filter(Boolean);

	if (!linkedQuestions.length) {
		return [];
	}

	const questions = await frappe.db.get_list("Quiz Question", {
		filters: {
			name: ["in", linkedQuestions],
		},
		fields: ["name", "question", "question_type"],
		limit_page_length: linkedQuestions.length,
	});

	const byName = {};
	for (const question of questions) {
		byName[question.name] = question;
	}

	return linkedQuestions.map((questionName) => {
		const question = byName[questionName] || {};
		return {
			question: questionName,
			question_text: question.question || questionName,
			question_type: `${sourceLabel} | ${question.question_type || "Single Select"}`,
		};
	});
}

function normalizePreviewRows(rows) {
	return (rows || []).map((row) => ({
		question: row.question || "",
		question_text: row.question_text || "",
		question_type: row.question_type || "",
	}));
}

function arePreviewRowsEqual(leftRows, rightRows) {
	const left = normalizePreviewRows(leftRows);
	const right = normalizePreviewRows(rightRows);

	if (left.length !== right.length) {
		return false;
	}

	return left.every((row, index) => {
		const other = right[index];
		return (
			row.question === other.question &&
			row.question_text === other.question_text &&
			row.question_type === other.question_type
		);
	});
}

async function renderQuestionPreview(frm) {
	if (frm.is_new() || !frm.fields_dict.custom_quiz_question_preview) {
		return;
	}

	frm.set_df_property("custom_quiz_question_preview", "read_only", 1);

	const minimumQuiz = frm.doc.custom_minimum_requirement_quiz;
	const preferredQuiz = frm.doc.custom_preferred_profile;

	try {
		const targetRows = (!minimumQuiz && !preferredQuiz)
			? []
			: [
				...(await getQuizQuestionRows(minimumQuiz, "Minimum Requirements")),
				...(await getQuizQuestionRows(preferredQuiz, "Preferred Profile")),
			];

		const currentRows = frm.doc.custom_quiz_question_preview || [];
		if (!arePreviewRowsEqual(currentRows, targetRows)) {
			frm.clear_table("custom_quiz_question_preview");
			targetRows.forEach((row) => {
				frm.add_child("custom_quiz_question_preview", row);
			});
		}

		frm.refresh_field("custom_quiz_question_preview");
	} catch (error) {
		console.error("Failed to render question preview:", error);
		frm.refresh_field("custom_quiz_question_preview");
		frappe.show_alert({
			message: "Unable to load quiz questions preview.",
			indicator: "red",
		});
	}
}

async function download_template(file_type) {
	const response = await frappe.call({
		method: "corporate_services.api.job_opening.quiz_import.download_job_opening_quiz_template",
		args: { file_type },
		freeze: true,
		freeze_message: `Preparing ${file_type.toUpperCase()} template...`,
	});

	const file_url = response.message && response.message.file_url;
	if (file_url) {
		window.open(file_url, "_blank");
	}
}

function open_import_dialog(frm) {
	let importDialog = null;

	function update_primary_action_state() {
		if (!importDialog) return;

		const minimumFile = importDialog.get_value("minimum_requirements_file");
		const preferredFile = importDialog.get_value("preferred_profile_file");
		const hasAtLeastOneFile = Boolean(minimumFile || preferredFile);

		importDialog.get_primary_btn().prop("disabled", !hasAtLeastOneFile);
	}

	importDialog = new frappe.ui.Dialog({
		title: "Import Requirement Sheets",
		fields: [
			{
				fieldtype: "HTML",
				fieldname: "help_text",
				options:
					"<div style='padding: 10px 12px; border: 1px solid #dbe4ee; border-radius: 10px; background: #f8fafc;'>" +
					"Upload two files: one for minimum requirements and one for preferred profile. " +
					"Each upload creates a new quiz and links it to this Job Opening." +
					"</div>",
			},
			{
				fieldtype: "Attach",
				fieldname: "minimum_requirements_file",
				label: "Minimum Requirements Sheet",
				onchange: update_primary_action_state,
			},
			{
				fieldtype: "Attach",
				fieldname: "preferred_profile_file",
				label: "Preferred Profile Sheet",
				onchange: update_primary_action_state,
			},
		],
		primary_action_label: "Create & Link Quizzes",
		primary_action: async (values) => {
			if (!values.minimum_requirements_file && !values.preferred_profile_file) {
				frappe.msgprint("Upload at least one sheet before continuing.");
				return;
			}

			const response = await frappe.call({
				method: "corporate_services.api.job_opening.quiz_import.import_job_opening_requirement_quizzes",
				args: {
					docname: frm.doc.name,
					minimum_requirements_file_url: values.minimum_requirements_file,
					preferred_profile_file_url: values.preferred_profile_file,
				},
				freeze: true,
				freeze_message: "Creating requirement quizzes...",
			});

			importDialog.hide();
			await frm.reload_doc();

			frappe.msgprint({
				title: "Import Summary",
				indicator: "green",
				message: build_import_summary(response.message || {}),
			});
		},
	});

	importDialog.show();
	update_primary_action_state();
}

frappe.ui.form.on("Job Opening", {
	async refresh(frm) {
		frm.add_custom_button("Download Requirement CSV Template", async () => {
			await download_template("csv");
		}, "Requirement Quiz Import");

		frm.add_custom_button("Download Requirement Excel Template", async () => {
			await download_template("xlsx");
		}, "Requirement Quiz Import");

		if (frm.is_new()) {
			return;
		}

		frm.add_custom_button("Import Requirement Sheets", () => {
			open_import_dialog(frm);
		}, "Requirement Quiz Import");

		await renderQuestionPreview(frm);
	},

	async custom_minimum_requirement_quiz(frm) {
		await renderQuestionPreview(frm);
	},

	async custom_preferred_profile(frm) {
		await renderQuestionPreview(frm);
	},
});
