# Copyright (c) 2026, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class QuizQuestion(Document):
    def validate(self):
        if not self.question_type:
            self.question_type = "Single Select"

        if self.question_type in ("Single Select", "Multi Select") and not (self.correct_answer or "").strip():
            frappe.throw("Correct Answer / Accepted Answers is required.")

        if self.question_type in ("Single Select", "Multi Select"):
            options = self._get_defined_options()
            if len(options) < 2:
                frappe.throw("Please provide at least two answer options.")
            self.correct_answer = self._normalize_correct_answers(options)
            self.disqualifying_answers = self._normalize_answer_set(self.disqualifying_answers, options, "Disqualifying Answers")
        else:
            self.disqualifying_answers = ""

    def _split_values(self, value):
        if not (value or "").strip():
            return []

        normalized = (value or "").replace("|||", "\n").replace(",", "\n")
        return [item.strip() for item in normalized.splitlines() if item.strip()]

    def _normalize_correct_answers(self, options):
        return self._normalize_answer_set(self.correct_answer, options, "Correct answers")

    def _normalize_answer_set(self, raw_value, options, label):
        option_map = {}
        for index, option in enumerate(options):
            option_code = chr(ord("A") + index)
            option_map[option.strip().lower()] = option_code
            if index < 26:
                option_map[option_code.lower()] = option_code

        normalized_answers = []
        invalid_answers = []

        for answer in self._split_values(raw_value):
            normalized_answer = option_map.get(answer.strip().lower())
            if normalized_answer:
                normalized_answers.append(normalized_answer)
            else:
                invalid_answers.append(answer)

        if invalid_answers:
            frappe.throw(
                f"{label} must match the provided answer options. Invalid value(s): "
                + ", ".join(invalid_answers)
            )

        return "\n".join(normalized_answers)

    def _get_defined_options(self):
        if (self.answer_options or "").strip():
            return [value.strip() for value in self.answer_options.splitlines() if value.strip()]

        return [
            value
            for value in (self.option_a, self.option_b, self.option_c, self.option_d)
            if value
        ]
