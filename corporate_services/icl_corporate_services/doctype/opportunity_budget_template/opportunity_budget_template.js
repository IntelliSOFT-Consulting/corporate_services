// Copyright (c) 2026, IntelliSOFT Consulting and contributors
// For license information, please see license.txt

const SPLIT_RE = /[|,;]+/;

function flt(v) {
	return Number(v || 0);
}

function splitTokens(value) {
	return (value || "")
		.split(SPLIT_RE)
		.map((s) => (s || "").trim())
		.filter(Boolean);
}

function buildCostMap(rows) {
	const map = {};
	(rows || []).forEach((row) => {
		if (row.line_key) map[row.line_key] = flt(row.cost);
		if (row.budget_line) map[row.budget_line] = flt(row.cost);
		if (row.budget_line_label) map[row.budget_line_label] = flt(row.cost);
	});
	return map;
}

function resolveSourceSum(rows, sourceText) {
	const map = buildCostMap(rows);
	return splitTokens(sourceText).reduce((sum, token) => sum + flt(map[token]), 0);
}

function sumSectionForTotal(rows, section, excludeName) {
	const sec = (section || "").trim().toLowerCase();
	return (rows || []).reduce((sum, row) => {
		if ((row.section || "").trim().toLowerCase() !== sec) return sum;
		if (excludeName && row.name === excludeName) return sum;
		if (!["Manual", "Formula"].includes(row.row_type)) return sum;
		return sum + flt(row.cost);
	}, 0);
}

function sumSectionForSummary(rows, section) {
	const sec = (section || "").trim().toLowerCase();
	const sectionRows = (rows || []).filter((r) => (r.section || "").trim().toLowerCase() === sec);
	if (!sectionRows.length) return 0;
	const totals = sectionRows.filter((r) => r.row_type === "Total");
	if (totals.length) return totals.reduce((sum, r) => sum + flt(r.cost), 0);
	return sectionRows
		.filter((r) => ["Manual", "Formula"].includes(r.row_type))
		.reduce((sum, r) => sum + flt(r.cost), 0);
}

function applyTemplateToRow(frm, cdt, cdn) {
	const row = locals[cdt][cdn];
	if (!row || !row.budget_line) return;

	const meta = (frm._detailTemplateLines || []).find((d) => d.name === row.budget_line);
	if (!meta) return;

	row.line_key = meta.name;
	row.section = meta.section;
	row.budget_line_label = meta.budget_line;
	row.row_type = meta.row_type || "Manual";
	row.line_order = meta.line_order || row.line_order;
	row.formula_base = meta.formula_base || row.formula_base;
	if (flt(meta.default_percentage) && !flt(row.percentage)) row.percentage = flt(meta.default_percentage);
	if (meta.description && !row.budget_narrative) row.budget_narrative = meta.description;
}

function normalizeRowsFromTemplate(frm) {
	const lookup = {};
	const labelLookup = {};
	(frm._detailTemplateLines || []).forEach((d) => {
		lookup[d.name] = d;
		if (d.budget_line) labelLookup[d.budget_line.trim().toLowerCase()] = d;
	});

	(frm.doc.detailed_opportunity_budget || []).forEach((row) => {
		const key = row.line_key || row.budget_line;
		const meta = lookup[key] || labelLookup[(row.budget_line_label || "").trim().toLowerCase()];
		if (!meta) return;

		row.line_key = meta.name;
		row.budget_line = meta.name;
		row.budget_line_label = meta.budget_line;
		row.section = meta.section;
		row.row_type = meta.row_type || "Manual";
		row.line_order = meta.line_order || row.line_order;
		row.formula_base = meta.formula_base || "";
		if (flt(meta.default_percentage) && !flt(row.percentage)) row.percentage = flt(meta.default_percentage);
	});
}

function computeSummaryFromTemplate(frm, rows) {
	const summaryTemplate = frm._summaryTemplateLines || [];
	const summaryRows = summaryTemplate.map((meta) => {
		let cost = 0;
		const sourceType = (meta.summary_source_type || "Section").trim();
		if (sourceType === "Line") {
			cost = resolveSourceSum(rows, meta.summary_source);
		} else {
			const sections = splitTokens(meta.summary_source || meta.section || "");
			cost = sections.reduce((sum, section) => sum + sumSectionForSummary(rows, section), 0);
		}

		return {
			line_key: meta.name,
			line_order: meta.line_order,
			budget_line: meta.budget_line,
			cost,
		};
	});

	frm.doc.summary_budget = summaryRows.sort((a, b) => flt(a.line_order) - flt(b.line_order));
	frm.refresh_field("summary_budget");
}

function computeBudget(frm) {
	const rows = frm.doc.detailed_opportunity_budget || [];
	const grandTotalFallbackSources = "Total Programs Expenses|Indirect Costs on All Costs";
	normalizeRowsFromTemplate(frm);

	rows.forEach((row) => {
		if (row.row_type !== "Manual") return;
		const qty = flt(row.quantity);
		const rate = flt(row.rate);
		if (qty && rate) row.cost = qty * rate;
	});

	for (let i = 0; i < 3; i++) {
		rows.forEach((row) => {
			if (row.row_type !== "Formula") return;
			const base = resolveSourceSum(rows, row.formula_base);
			row.cost = base * flt(row.percentage) / 100;
		});
	}

	rows.forEach((row) => {
		if (row.row_type !== "Total") return;
		row.cost = sumSectionForTotal(rows, row.section, row.name);
		if (!flt(row.cost) && (row.budget_line_label || "").trim().toLowerCase() === "grand total") {
			row.cost = resolveSourceSum(rows, row.formula_base || grandTotalFallbackSources);
		}
	});

	const labelMap = {};
	rows.forEach((row) => {
		const k = (row.budget_line_label || "").trim().toLowerCase();
		if (k) labelMap[k] = row;
	});
	const labelCost = (label) => flt(labelMap[(label || "").trim().toLowerCase()]?.cost);

	const travelCost = sumSectionForSummary(rows, "III. Travel");
	const totalProgramsExpenses =
		labelCost("Total Salaries and Wages") +
		labelCost("Total Fringe Benefits") +
		travelCost +
		labelCost("Total Other Direct Costs");

	if (labelMap["total programs expenses"]) {
		labelMap["total programs expenses"].cost = totalProgramsExpenses;
	}
	if (labelMap["indirect costs on all costs"]) {
		const indirect = labelMap["indirect costs on all costs"];
		const base = indirect.formula_base ? resolveSourceSum(rows, indirect.formula_base) : totalProgramsExpenses;
		indirect.cost = base * flt(indirect.percentage) / 100;
	}
	if (labelMap["grand total"]) {
		labelMap["grand total"].cost = totalProgramsExpenses + labelCost("Indirect Costs on All Costs");
	}

	frm.refresh_field("detailed_opportunity_budget");

	const byName = {};
	rows.forEach((row) => {
		if (row.budget_line_label) byName[row.budget_line_label] = flt(row.cost);
	});

	frm.doc.total_other_direct_costs = flt(byName["Total Other Direct Costs"]);
	frm.doc.total_programs_expenses = flt(byName["Total Programs Expenses"]);
	frm.doc.indirect_costs_on_all_costs = flt(byName["Indirect Costs on All Costs"]);
	frm.doc.grand_total = flt(byName["Grand Total"]);
	frm.refresh_field("total_other_direct_costs");
	frm.refresh_field("total_programs_expenses");
	frm.refresh_field("indirect_costs_on_all_costs");
	frm.refresh_field("grand_total");

	computeSummaryFromTemplate(frm, rows);
}

async function loadTemplateLines(frm) {
	const lines = await frappe.db.get_list("Payment Entry Budget Line", {
		filters: {
			is_active: 1,
			usage_context: ["in", ["Opportunity Detail Line", "Opportunity Summary Line"]],
		},
		fields: [
			"name",
			"budget_line",
			"description",
			"line_order",
			"section",
			"row_type",
			"default_percentage",
			"formula_base",
			"summary_source_type",
			"summary_source",
			"usage_context",
		],
		order_by: "line_order asc, creation asc",
		limit_page_length: 0,
	});

	frm._detailTemplateLines = (lines || []).filter((d) => d.usage_context === "Opportunity Detail Line");
	frm._summaryTemplateLines = (lines || []).filter((d) => d.usage_context === "Opportunity Summary Line");
}

function configureDetailGrid(frm) {
	const grid = frm.get_field("detailed_opportunity_budget")?.grid;
	if (!grid) return;

	grid.update_docfield_property("rate", "options", "currency");
	grid.update_docfield_property("cost", "options", "currency");
	frm.refresh_field("detailed_opportunity_budget");
}

frappe.ui.form.on("Opportunity Budget Template", {
	async refresh(frm) {
		frm.set_query("budget_line", "detailed_opportunity_budget", () => ({
			filters: {
				is_active: 1,
				usage_context: "Opportunity Detail Line",
			},
		}));

		const grid = frm.get_field("detailed_opportunity_budget")?.grid;
		if (grid) {
			grid.cannot_add_rows = false;
			grid.cannot_delete_rows = false;
		}
		configureDetailGrid(frm);
		await loadTemplateLines(frm);
		computeBudget(frm);
	},
	currency(frm) {
		configureDetailGrid(frm);
		frm.refresh_field("summary_budget");
		computeBudget(frm);
	},
});

frappe.ui.form.on("Detailed Opportunity Budget", {
	detailed_opportunity_budget_add(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (!row.row_type) row.row_type = "Manual";
		if (!row.section) row.section = "Other";
		frm.refresh_field("detailed_opportunity_budget");
	},
	budget_line(frm, cdt, cdn) {
		applyTemplateToRow(frm, cdt, cdn);
		frm.refresh_field("detailed_opportunity_budget");
		computeBudget(frm);
	},
	quantity(frm) {
		computeBudget(frm);
	},
	rate(frm) {
		computeBudget(frm);
	},
	percentage(frm) {
		computeBudget(frm);
	},
	cost(frm) {
		computeBudget(frm);
	},
});
