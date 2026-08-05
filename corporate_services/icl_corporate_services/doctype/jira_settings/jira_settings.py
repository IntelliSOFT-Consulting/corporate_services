# Copyright (c) 2026, ICL and contributors
# For license information, please see license.txt

import frappe
import requests
from frappe import _
from frappe.model.document import Document


class JiraSettings(Document):
	def validate(self):
		if not self.is_new() and (not self.api_token or self.is_dummy_password(self.api_token)):
			self.api_token = self.get_password("api_token", raise_exception=False) or ""

	def _auth(self):
		token = self.get_password("api_token")
		if not (self.site_url and self.email and token):
			frappe.throw(_("Site URL, Account Email and API Token are required."))
		return (self.email, token)

	def _base(self):
		return self.site_url.rstrip("/")

	def _request(self, path, params=None):
		base = self._base()
		if not base.startswith("http"):
			frappe.throw(_("Site URL must start with https:// (e.g. https://you.atlassian.net)"))
		url = f"{base}{path}"
		resp = requests.get(
			url,
			auth=self._auth(),
			headers={"Accept": "application/json"},
			params=params or {},
			timeout=30,
		)
		resp.raise_for_status()
		ctype = resp.headers.get("Content-Type", "")
		if "application/json" not in ctype:
			frappe.throw(
				_("Expected JSON from Jira but got '{0}' ({1}). Check the Site URL. Response: {2}").format(
					ctype or "unknown", resp.status_code, resp.text[:300]
				)
			)
		return resp.json()
