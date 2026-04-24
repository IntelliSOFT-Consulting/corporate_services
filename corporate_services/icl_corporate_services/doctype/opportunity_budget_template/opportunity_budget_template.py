# Copyright (c) 2026, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import re

import frappe
from frappe.model.document import Document
from frappe.utils import flt


SECTION_SPLIT = re.compile(r"[|,;]+")


class OpportunityBudgetTemplate(Document):
    def validate(self):
        self._sync_budget_name()
        self._ensure_detail_rows()
        self._recalculate_detail_costs()
        self._sync_summary_rows()

    def on_update(self):
        self._sync_opportunity_budget_link()

    def _sync_budget_name(self):
        if self.budget_name:
            return

        if self.budget_againist == "Opportunity" and self.opportunity:
            title = frappe.db.get_value("Opportunity", self.opportunity, "title")
            self.budget_name = title or self.opportunity
        elif self.budget_againist == "Project" and self.project_name:
            title = frappe.db.get_value("Project", self.project_name, "project_name")
            self.budget_name = title or self.project_name

    def _get_template_lines(self, usage_context: str):
        return frappe.get_all(
            "Payment Entry Budget Line",
            filters={"is_active": 1, "usage_context": usage_context},
            fields=[
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
            ],
            order_by="line_order asc, creation asc",
        )

    def _ensure_detail_rows(self):
        template_lines = self._get_template_lines("Opportunity Detail Line")
        template_by_key = {tpl.name: tpl for tpl in template_lines}
        template_by_label = {(tpl.budget_line or "").strip().lower(): tpl for tpl in template_lines if tpl.budget_line}
        template_keys = set(template_by_key.keys())

        def sync_from_template(row, tpl):
            row.line_key = tpl.name
            row.line_order = tpl.line_order
            row.budget_line = tpl.name
            row.budget_line_label = tpl.budget_line
            row.section = tpl.section
            row.row_type = tpl.row_type or "Manual"
            row.formula_base = tpl.formula_base
            if tpl.default_percentage and not flt(row.percentage):
                row.percentage = tpl.default_percentage
            if tpl.description and not row.budget_narrative:
                row.budget_narrative = tpl.description

        ordered_rows = []
        seen_template_keys = set()

        for row in self.detailed_opportunity_budget or []:
            resolved_key = None
            if row.line_key and row.line_key in template_keys:
                resolved_key = row.line_key
            elif row.budget_line and row.budget_line in template_keys:
                resolved_key = row.budget_line
            elif row.budget_line_label and row.budget_line_label.strip().lower() in template_by_label:
                resolved_key = template_by_label[row.budget_line_label.strip().lower()].name

            if resolved_key and resolved_key not in seen_template_keys:
                sync_from_template(row, template_by_key[resolved_key])
                seen_template_keys.add(resolved_key)
                ordered_rows.append(row)
                continue

            if not row.row_type:
                row.row_type = "Manual"
            if not row.section:
                row.section = "Other"
            ordered_rows.append(row)

        for tpl in template_lines:
            if tpl.name in seen_template_keys:
                continue
            row = self.append("detailed_opportunity_budget", {})
            sync_from_template(row, tpl)
            ordered_rows.append(row)

        self.set("detailed_opportunity_budget", ordered_rows)

    def _line_cost_map(self):
        row_map = {}
        for row in self.detailed_opportunity_budget or []:
            if row.line_key:
                row_map[row.line_key] = flt(row.cost)
            if row.budget_line:
                row_map[row.budget_line] = flt(row.cost)
            if row.budget_line_label:
                row_map[row.budget_line_label] = flt(row.cost)
        return row_map

    def _resolve_source_sum(self, source_text: str):
        if not source_text:
            return 0.0

        row_map = self._line_cost_map()
        total = 0.0
        for token in [x.strip() for x in SECTION_SPLIT.split(source_text or "") if x.strip()]:
            total += flt(row_map.get(token))
        return total

    def _sum_section_for_total(self, section_name: str, exclude_row=None):
        total = 0.0
        key = (section_name or "").strip().lower()
        for row in self.detailed_opportunity_budget or []:
            if exclude_row and row.name == exclude_row.name:
                continue
            if (row.section or "").strip().lower() != key:
                continue
            if row.row_type in ("Manual", "Formula"):
                total += flt(row.cost)
        return total

    def _recalculate_detail_costs(self):
        detail_rows = self.detailed_opportunity_budget or []
        grand_total_fallback_sources = "Total Programs Expenses|Indirect Costs on All Costs"
        rows_by_label = {(r.budget_line_label or "").strip().lower(): r for r in detail_rows if r.budget_line_label}

        for row in detail_rows:
            if row.row_type == "Manual":
                qty = flt(row.quantity)
                rate = flt(row.rate)
                row.cost = qty * rate if qty and rate else flt(row.cost)

        for _ in range(3):
            for row in detail_rows:
                if row.row_type != "Formula":
                    continue
                base = self._resolve_source_sum(row.formula_base)
                row.cost = base * flt(row.percentage) / 100.0

        for row in detail_rows:
            if row.row_type == "Total":
                row.cost = self._sum_section_for_total(row.section, exclude_row=row)
                if not flt(row.cost) and (row.budget_line_label or "").strip().lower() == "grand total":
                    source = row.formula_base or grand_total_fallback_sources
                    row.cost = self._resolve_source_sum(source)

        def label_cost(label):
            row = rows_by_label.get((label or "").strip().lower())
            return flt(row.cost) if row else 0.0

        travel_cost = self._sum_section_for_summary("III. Travel")
        total_programs_expenses = (
            label_cost("Total Salaries and Wages")
            + label_cost("Total Fringe Benefits")
            + travel_cost
            + label_cost("Total Other Direct Costs")
        )

        total_programs_row = rows_by_label.get("total programs expenses")
        if total_programs_row:
            total_programs_row.cost = total_programs_expenses

        indirect_row = rows_by_label.get("indirect costs on all costs")
        if indirect_row:
            base = total_programs_expenses
            if indirect_row.formula_base:
                base = self._resolve_source_sum(indirect_row.formula_base)
            indirect_row.cost = base * flt(indirect_row.percentage) / 100.0

        grand_total_row = rows_by_label.get("grand total")
        if grand_total_row:
            grand_total_row.cost = total_programs_expenses + label_cost("Indirect Costs on All Costs")

        cost_by_name = {row.budget_line_label: flt(row.cost) for row in detail_rows if row.budget_line_label}

        self.total_other_direct_costs = flt(cost_by_name.get("Total Other Direct Costs"))
        self.total_programs_expenses = flt(cost_by_name.get("Total Programs Expenses"))
        self.indirect_costs_on_all_costs = flt(cost_by_name.get("Indirect Costs on All Costs"))
        self.grand_total = flt(cost_by_name.get("Grand Total"))

    def _sum_section_for_summary(self, section_name: str):
        section_name = (section_name or "").strip().lower()
        rows = [r for r in (self.detailed_opportunity_budget or []) if (r.section or "").strip().lower() == section_name]
        if not rows:
            return 0.0

        total_rows = [r for r in rows if r.row_type == "Total"]
        if total_rows:
            return sum(flt(r.cost) for r in total_rows)

        return sum(flt(r.cost) for r in rows if r.row_type in ("Manual", "Formula"))

    def _calculate_summary_line_cost(self, template_line):
        source_type = (template_line.summary_source_type or "Section").strip()
        source = (template_line.summary_source or "").strip()

        if source_type == "Line":
            return self._resolve_source_sum(source)

        section_tokens = [x.strip() for x in SECTION_SPLIT.split(source) if x.strip()]
        if not section_tokens and template_line.section:
            section_tokens = [template_line.section.strip()]

        total = 0.0
        for section in section_tokens:
            total += self._sum_section_for_summary(section)
        return total

    def _sync_summary_rows(self):
        summary_template = self._get_template_lines("Opportunity Summary Line")
        existing = {row.line_key: row for row in self.summary_budget or [] if row.line_key}
        summary_rows = []

        for tpl in summary_template:
            row = existing.get(tpl.name) or self.append("summary_budget", {})
            row.line_key = tpl.name
            row.line_order = tpl.line_order
            row.budget_line = tpl.budget_line
            row.cost = self._calculate_summary_line_cost(tpl)
            summary_rows.append(row)

        self.set("summary_budget", sorted(summary_rows, key=lambda d: flt(d.line_order)))

    def _sync_opportunity_budget_link(self):
        previous = self.get_doc_before_save()
        previous_opportunity = previous.opportunity if previous else None

        if previous_opportunity and previous_opportunity != self.opportunity:
            current_template = frappe.db.get_value(
                "Opportunity", previous_opportunity, "custom_budget_template"
            )
            if current_template == self.name:
                frappe.db.set_value(
                    "Opportunity",
                    previous_opportunity,
                    "custom_budget_template",
                    None,
                    update_modified=False,
                )

        if not self.opportunity:
            return

        update_values = {"custom_budget_template": self.name}
        source = frappe.db.get_value(
            "Opportunity", self.opportunity, "custom_budget_template_source"
        )
        if source != "Internal":
            update_values["custom_budget_template_source"] = "Internal"

        frappe.db.set_value(
            "Opportunity",
            self.opportunity,
            update_values,
            update_modified=False,
        )
