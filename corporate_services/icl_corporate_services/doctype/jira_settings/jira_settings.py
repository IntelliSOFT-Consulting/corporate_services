# Copyright (c) 2026, ICL and contributors
# For license information, please see license.txt

import frappe
import requests
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime


class JiraSettings(Document):
	def validate(self):
		# A Password field shows masked dots on reload. If the form is re-saved
		# with a blank or still-masked value, keep the previously stored token
		# instead of overwriting it with an empty/dummy value.
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
			params={"startAt": start, "maxResults": 50, "expand": "lead"},
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


def _to_datetime(value):
	"""Jira returns ISO strings like 2024-09-27T08:00:00.000+0300 -> naive 'YYYY-MM-DD HH:MM:SS'."""
	if not value:
		return None
	return value[:19].replace("T", " ")


def _map_issue(issue):
	fields = issue.get("fields") or {}

	def name_of(key):
		obj = fields.get(key) or {}
		return obj.get("name") if isinstance(obj, dict) else None

	assignee = fields.get("assignee") or {}
	reporter = fields.get("reporter") or {}
	parent = fields.get("parent") or {}

	return {
		"issue_key": issue.get("key"),
		"issue_id": issue.get("id"),
		"summary": fields.get("summary"),
		"issue_type": name_of("issuetype"),
		"status": name_of("status"),
		"priority": name_of("priority"),
		"assignee": assignee.get("displayName"),
		"reporter": reporter.get("displayName"),
		"parent_key": parent.get("key"),
		"labels": ", ".join(fields.get("labels") or []),
		"resolution": name_of("resolution"),
		"created": _to_datetime(fields.get("created")),
		"updated": _to_datetime(fields.get("updated")),
		"due_date": (fields.get("duedate") or "")[:10] or None,
	}


@frappe.whitelist()
def pull_issues(project_key):
	"""Fetch all issues for a Jira project and (re)sync them into the Jira Project's issues table."""
	project_key = (project_key or "").strip()
	if not project_key:
		frappe.throw(_("Project key is required."))
	if not frappe.db.exists("Jira Project", project_key):
		frappe.throw(_("Jira Project '{0}' not found. Pull projects first.").format(project_key))

	doc = frappe.get_single("Jira Settings")
	base = doc._base()

	field_list = "summary,issuetype,status,priority,assignee,reporter,created,updated,duedate,resolution,labels,parent"
	# Jira Cloud's classic /rest/api/3/search was removed (410). The enhanced
	# endpoint /rest/api/3/search/jql uses token pagination and returns no total.
	next_token = None
	issues = []
	while True:
		params = {
			"jql": f'project = "{project_key}" ORDER BY updated DESC',
			"maxResults": 100,
			"fields": field_list,
		}
		if next_token:
			params["nextPageToken"] = next_token
		data = doc._request("/rest/api/3/search/jql", params=params)
		batch = data.get("issues", [])
		issues.extend(batch)
		next_token = data.get("nextPageToken")
		if data.get("isLast") or not next_token or not batch:
			break

	mapped = []
	for issue in issues:
		row = _map_issue(issue)
		row["url"] = f"{base}/browse/{row['issue_key']}" if row.get("issue_key") else None
		mapped.append(row)

	jp = frappe.get_doc("Jira Project", project_key)

	# Refresh project meta (lead/name/type) from Jira; /project/{key} returns lead by default.
	try:
		p = doc._request(f"/rest/api/3/project/{project_key}")
		jp.project_name = p.get("name") or jp.project_name
		jp.project_id = p.get("id") or jp.project_id
		jp.project_type = p.get("projectTypeKey") or jp.project_type
		jp.lead = (p.get("lead") or {}).get("displayName") or jp.lead
	except requests.HTTPError:
		pass

	jp.set("issues", [])
	for row in mapped:
		jp.append("issues", row)
	jp.save(ignore_permissions=True)

	tasks = _sync_issues_to_tasks(project_key, mapped)
	frappe.db.commit()

	return {"count": len(issues), "project": project_key, "tasks": tasks}


# Map Jira issue status / priority onto ERPNext Task fields
_TASK_STATUS_MAP = {
	"done": "Completed",
	"completed": "Completed",
	"complete": "Completed",
	"closed": "Completed",
	"resolved": "Completed",
	"cancelled": "Cancelled",
	"canceled": "Cancelled",
	"in progress": "Working",
	"in review": "Pending Review",
	"review": "Pending Review",
}
_TASK_PRIORITY_MAP = {
	"highest": "Urgent",
	"high": "High",
	"medium": "Medium",
	"low": "Low",
	"lowest": "Low",
}


def _sync_issues_to_tasks(project_key, mapped):
	"""Upsert ERPNext Tasks from Jira issues, linked to the ERP Project mapped to this Jira project."""
	project = frappe.db.get_value("Project", {"custom_jira_project": project_key}, "name")
	if not project:
		return {"created": 0, "updated": 0, "errors": 0, "linked_project": None}

	created = updated = errors = 0
	for row in mapped:
		key = row.get("issue_key")
		if not key:
			continue
		values = {
			"subject": (row.get("summary") or key)[:140],
			"project": project,
			"status": _TASK_STATUS_MAP.get((row.get("status") or "").lower(), "Open"),
			"priority": _TASK_PRIORITY_MAP.get((row.get("priority") or "").lower(), "Medium"),
			"exp_end_date": row.get("due_date"),
			"custom_task_source": "Jira",
			"custom_jira_issue_key": key,
			"custom_jira_issue_url": row.get("url"),
		}
		try:
			existing = frappe.db.get_value("Task", {"custom_jira_issue_key": key}, "name")
			if existing:
				task = frappe.get_doc("Task", existing)
				task.update(values)
				task.save(ignore_permissions=True)
				updated += 1
			else:
				task = frappe.get_doc({"doctype": "Task", **values})
				task.insert(ignore_permissions=True)
				created += 1
		except Exception:
			frappe.log_error(title=f"Jira->Task sync failed for {key}")
			errors += 1

	return {"created": created, "updated": updated, "errors": errors, "linked_project": project}
