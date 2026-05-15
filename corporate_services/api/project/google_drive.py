import json
import secrets
import time
import html
from urllib.parse import urlencode

import frappe
import requests
from frappe import _
from frappe.integrations.google_oauth import GoogleOAuth
from frappe.utils import get_url
from frappe.utils.password import get_decrypted_password, set_encrypted_password

GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files"
TOKEN_STORE_FIELD = "google_drive_oauth_payload"
CACHE_STATE_PREFIX = "google_drive_oauth_state"


def _get_oauth_config():
    client_id, client_secret = _get_oauth_config_from_google_settings()
    if not client_id or not client_secret:
        conf = frappe.conf or {}
        client_id = client_id or conf.get("google_drive_client_id")
        client_secret = client_secret or conf.get("google_drive_client_secret")
    if not client_id or not client_secret:
        frappe.throw(
            _(
                "Google Drive OAuth is not configured. Set credentials in Google Settings "
                "or `google_drive_client_id` / `google_drive_client_secret` in site_config.json."
            )
        )
    # Use Frappe's standard Google OAuth callback to match ERPNext Google integration setup.
    redirect_uri = get_url("/api/method/frappe.integrations.google_oauth.callback")
    return client_id, client_secret, redirect_uri


def _get_oauth_config_from_google_settings():
    if not frappe.db.exists("DocType", "Google Settings"):
        return None, None

    meta = frappe.get_meta("Google Settings")
    fieldnames = {f.fieldname for f in (meta.fields or [])}
    candidates = [
        ("client_id", "client_secret"),
        ("google_client_id", "google_client_secret"),
        ("oauth2_client_id", "oauth2_client_secret"),
        ("drive_client_id", "drive_client_secret"),
    ]

    doc = frappe.get_single("Google Settings")
    for id_field, secret_field in candidates:
        if id_field in fieldnames and secret_field in fieldnames:
            client_id = (doc.get(id_field) or "").strip()
            client_secret = (doc.get(secret_field) or "").strip()
            if client_id and client_secret:
                return client_id, client_secret

    return None, None


def _cache_set_state(user, nonce, project_name):
    cache_key = f"{CACHE_STATE_PREFIX}:{user}:{nonce}"
    frappe.cache().set_value(cache_key, project_name, expires_in_sec=600)


def _cache_get_state(user, nonce):
    cache_key = f"{CACHE_STATE_PREFIX}:{user}:{nonce}"
    return frappe.cache().get_value(cache_key)


def _cache_delete_state(user, nonce):
    cache_key = f"{CACHE_STATE_PREFIX}:{user}:{nonce}"
    frappe.cache().delete_value(cache_key)


def _save_token_payload(user, payload):
    set_encrypted_password("User", user, json.dumps(payload), TOKEN_STORE_FIELD)


def _load_token_payload(user):
    raw = get_decrypted_password("User", user, TOKEN_STORE_FIELD, raise_exception=False)
    if not raw:
        return _load_token_payload_from_google_drive_single()
    return json.loads(raw)


def _refresh_access_token_if_needed(user, payload):
    now_ts = int(time.time())
    expires_at = int(payload.get("expires_at") or 0)
    if payload.get("access_token") and expires_at - 60 > now_ts:
        return payload

    refresh_token = payload.get("refresh_token")
    if not refresh_token:
        frappe.throw(_("Google Drive session expired. Please reconnect your Google account."))

    client_id, client_secret, _redirect_uri = _get_oauth_config()
    resp = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=30,
    )
    if resp.status_code >= 300:
        frappe.throw(_("Failed to refresh Google Drive token. Please reconnect your Google account."))

    token_data = resp.json()
    payload["access_token"] = token_data.get("access_token")
    payload["expires_at"] = int(time.time()) + int(token_data.get("expires_in") or 3600)
    _save_token_payload(user, payload)
    return payload


def _load_token_payload_from_google_drive_single():
    if not frappe.db.exists("DocType", "Google Drive"):
        return None
    if not frappe.db.exists("Google Drive", "Google Drive"):
        return None

    gd = frappe.get_doc("Google Drive", "Google Drive")
    refresh_token = (gd.get("refresh_token") or "").strip()
    if not refresh_token:
        return None

    return {
        "access_token": None,
        "refresh_token": refresh_token,
        "expires_at": 0,
        "scope": "https://www.googleapis.com/auth/drive.file",
        "token_type": "Bearer",
    }


def _ensure_project_access(project_name):
    if not frappe.has_permission("Project", ptype="read", doc=project_name):
        frappe.throw(_("You do not have permission to access this Project."), frappe.PermissionError)


@frappe.whitelist()
def get_google_drive_auth_url(project_name):
    _ensure_project_access(project_name)
    user = frappe.session.user
    client_id, _client_secret, redirect_uri = _get_oauth_config()

    nonce = secrets.token_urlsafe(24)
    _cache_set_state(user, nonce, project_name)
    state = json.dumps({"user": user, "nonce": nonce})

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/drive.file",
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return {"auth_url": f"{GOOGLE_AUTH_BASE}?{urlencode(params)}"}


@frappe.whitelist()
def google_drive_oauth_callback(code=None, state=None, error=None):
    if error:
        return _oauth_close_window_html(False, f"Google OAuth error: {error}")

    if not code or not state:
        return _oauth_close_window_html(False, "Missing OAuth parameters.")

    try:
        state_data = json.loads(state)
    except Exception:
        return _oauth_close_window_html(False, "Invalid OAuth state.")

    user = state_data.get("user")
    nonce = state_data.get("nonce")
    if not user or not nonce:
        return _oauth_close_window_html(False, "Invalid OAuth state payload.")

    cached_project = _cache_get_state(user, nonce)
    if not cached_project:
        return _oauth_close_window_html(False, "OAuth session expired. Please retry.")

    _cache_delete_state(user, nonce)

    client_id, client_secret, redirect_uri = _get_oauth_config()

    try:
        resp = requests.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            timeout=30,
        )
        if resp.status_code >= 300:
            return _oauth_close_window_html(False, f"Token exchange failed: {resp.text}")

        token_data = resp.json()
        payload = {
            "access_token": token_data.get("access_token"),
            "refresh_token": token_data.get("refresh_token"),
            "expires_at": int(time.time()) + int(token_data.get("expires_in") or 3600),
            "scope": token_data.get("scope"),
            "token_type": token_data.get("token_type"),
        }

        if not payload.get("access_token"):
            return _oauth_close_window_html(False, "Google did not return an access token.")

        old_payload = _load_token_payload(user) or {}
        if not payload.get("refresh_token") and old_payload.get("refresh_token"):
            payload["refresh_token"] = old_payload.get("refresh_token")

        _save_token_payload(user, payload)
        return _oauth_close_window_html(True, "Google Drive connected successfully.")
    except Exception as ex:
        frappe.log_error(frappe.get_traceback(), "Google Drive OAuth callback error")
        return _oauth_close_window_html(False, str(ex))


@frappe.whitelist()
def create_project_google_drive_folder(project_name, folder_name=None, parent_folder_id=None):
    _ensure_project_access(project_name)
    google_drive_doc = frappe.get_doc("Google Drive")
    refresh_token = google_drive_doc.get_password(fieldname="refresh_token", raise_exception=False)
    if not refresh_token:
        frappe.throw(
            _(
                "Google Drive is not authorized. Please open Google Drive settings and click "
                "'Authorize Google Drive Access'."
            )
        )

    try:
        access_token = google_drive_doc.get_access_token()
        drive_service = GoogleOAuth("drive").get_google_service_object(access_token, refresh_token)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Google Drive access token refresh failed")
        frappe.throw(
            _(
                "Failed to refresh Google Drive token. Please re-authorize from Google Drive settings."
            )
        )

    folder_name = (folder_name or "").strip() or project_name

    metadata = {
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder",
    }
    if parent_folder_id:
        metadata["parents"] = [parent_folder_id]
    try:
        folder = (
            drive_service.files()
            .create(body=metadata, fields="id,name,webViewLink")
            .execute()
        )
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Google Drive folder creation failed")
        frappe.throw(_("Failed to create Google Drive folder. Please verify Google Drive authorization."))

    folder_id = folder.get("id")
    folder_link = folder.get("webViewLink") or f"https://drive.google.com/drive/folders/{folder_id}"
    created_children = _create_lifecycle_folders(drive_service, folder_id)

    try:
        project_doc = frappe.get_doc("Project", project_name)
        project_doc.add_comment(
            "Comment",
            _(
                "Google Drive folder created: <a href=\"{0}\" target=\"_blank\">{1}</a>"
                "<br><small>Lifecycle subfolders created: {2}</small>"
            ).format(folder_link, folder_name, created_children),
        )
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Failed to add Project comment for Google Drive folder")

    return {
        "folder_id": folder_id,
        "folder_name": folder.get("name") or folder_name,
        "folder_link": folder_link,
        "lifecycle_folders_created": created_children,
    }


def _create_drive_folder(drive_service, name, parent_id=None):
    payload = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
    }
    if parent_id:
        payload["parents"] = [parent_id]
    return drive_service.files().create(body=payload, fields="id,name").execute()


def _create_lifecycle_folders(drive_service, project_root_folder_id):
    if not frappe.db.exists("DocType", "HIS Project Lifecycle Config"):
        return 0

    try:
        config = frappe.get_single("HIS Project Lifecycle Config")
    except Exception:
        return 0

    stages = sorted(
        [row for row in (config.stages or []) if row.is_active],
        key=lambda x: (x.display_order or 0, x.idx or 0),
    )
    created_count = 0

    for stage in stages:
        stage_name = (stage.stage_name or "").strip()
        if not stage_name:
            continue

        stage_folder = _create_drive_folder(drive_service, stage_name, project_root_folder_id)
        stage_folder_id = stage_folder.get("id")
        created_count += 1

        requirement_items = _split_lines(stage.requirements)
        deliverable_items = _split_lines(stage.deliverables)

        if requirement_items:
            req_root = _create_drive_folder(drive_service, "Requirements", stage_folder_id)
            req_root_id = req_root.get("id")
            created_count += 1
            for item in requirement_items:
                _create_drive_folder(drive_service, item, req_root_id)
                created_count += 1

        if deliverable_items:
            del_root = _create_drive_folder(drive_service, "Deliverables - Templates", stage_folder_id)
            del_root_id = del_root.get("id")
            created_count += 1
            for item in deliverable_items:
                _create_drive_folder(drive_service, item, del_root_id)
                created_count += 1

    return created_count


def _split_lines(value):
    if not value:
        return []
    return [line.strip() for line in str(value).splitlines() if line.strip()]


def _oauth_close_window_html(success, message):
    status = "success" if success else "error"
    safe_message = html.escape(str(message or ""))
    return f"""
<!doctype html>
<html>
<head><title>Google Drive Connection</title></head>
<body style=\"font-family: sans-serif; padding: 24px;\">
  <h3>{'Connected' if success else 'Connection Failed'}</h3>
  <p>{safe_message}</p>
  <script>
    (function() {{
      var payload = {{ type: 'google_drive_oauth_result', status: '{status}', message: {json.dumps(message)} }};
      if (window.opener) {{
        window.opener.postMessage(payload, window.location.origin);
      }}
      setTimeout(function() {{ window.close(); }}, 500);
    }})();
  </script>
</body>
</html>
"""
