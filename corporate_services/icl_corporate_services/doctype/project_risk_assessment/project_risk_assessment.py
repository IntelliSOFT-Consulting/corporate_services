# Copyright (c) 2026, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

from frappe.model.document import Document

LEVEL_SCORE = {"Low": 1, "Medium": 2, "High": 3}


def score_to_band(score):
	if not score:
		return None
	if score <= 2:
		return "Low"
	if score <= 4:
		return "Medium"
	return "High"


class ProjectRiskAssessment(Document):
	def validate(self):
		for row in self.table_okgd:
			likelihood_score = LEVEL_SCORE.get(row.likelihood)
			severity_score = LEVEL_SCORE.get(row.severity)
			if likelihood_score and severity_score:
				row.risk_score = likelihood_score * severity_score
				row.risk_impact = score_to_band(row.risk_score)
			else:
				row.risk_score = None
				row.risk_impact = None
