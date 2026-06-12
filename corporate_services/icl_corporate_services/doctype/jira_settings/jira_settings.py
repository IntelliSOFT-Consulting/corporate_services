# Copyright (c) 2026, ICL and contributors
# For license information, please see license.txt

import frappe
import requests
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime


class JiraSettings(Document):
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


@frappe.whitelist()
def test_connection():
	doc = frappe.get_single("Jira Settings")
	try:
		data = doc._request("/rest/api/3/myself")
		status = _("Connected as {0}").format(data.get("displayName") or data.get("emailAddress"))
		doc.db_set("last_tested", now_datetime(), update_modified=False)
		doc.db_set("last_status", status, update_modified=False)
		return {"ok": True, "message": status}
	except requests.HTTPError as e:
		msg = _("HTTP {0}: {1}").format(e.response.status_code, e.response.text[:300])
		doc.db_set("last_tested", now_datetime(), update_modified=False)
		doc.db_set("last_status", msg, update_modified=False)
		return {"ok": False, "message": msg}
	except Exception as e:
		doc.db_set("last_status", str(e), update_modified=False)
		return {"ok": False, "message": str(e)}


@frappe.whitelist()
def pull_project(key):
	"""Fetch a single Jira project by its key or id (e.g. 'OPS')."""
	doc = frappe.get_single("Jira Settings")
	key = (key or "").strip()
	if not key:
		frappe.throw(_("Project key is required."))
	try:
		p = doc._request(f"/rest/api/3/project/{key}")
		return {
			"ok": True,
			"project": {
				"id": p.get("id"),
				"key": p.get("key"),
				"name": p.get("name"),
				"projectTypeKey": p.get("projectTypeKey"),
				"lead": (p.get("lead") or {}).get("displayName"),
			},
		}
	except requests.HTTPError as e:
		if e.response.status_code == 404:
			return {"ok": False, "message": _("No project found with key '{0}'.").format(key)}
		return {"ok": False, "message": _("HTTP {0}: {1}").format(e.response.status_code, e.response.text[:300])}


@frappe.whitelist()
def pull_projects():
	"""Fetch all Jira projects (paginated) and upsert them into Jira Project."""
	doc = frappe.get_single("Jira Settings")
	start, total = 0, None
	created, updated = 0, 0
	while total is None or start < total:
		data = doc._request(
			"/rest/api/3/project/search",
			params={"startAt": start, "maxResults": 50},
		)
		total = data.get("total", 0)
		values = data.get("values", [])
		if not values:
			break
		for p in values:
			key = p.get("key")
			if not key:
				continue
			row = {
				"project_name": p.get("name"),
				"project_id": p.get("id"),
				"project_type": p.get("projectTypeKey"),
				"lead": (p.get("lead") or {}).get("displayName"),
			}
			if frappe.db.exists("Jira Project", key):
				jp = frappe.get_doc("Jira Project", key)
				jp.update(row)
				jp.save(ignore_permissions=True)
				updated += 1
			else:
				jp = frappe.get_doc({"doctype": "Jira Project", "project_key": key, **row})
				jp.insert(ignore_permissions=True)
				created += 1
		start += len(values)
	frappe.db.commit()
	return {"count": created + updated, "created": created, "updated": updated}
