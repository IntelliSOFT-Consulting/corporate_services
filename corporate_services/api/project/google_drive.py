import json
import time
import html
import mimetypes

import frappe
import requests
from googleapiclient.http import MediaInMemoryUpload
from frappe import _
from frappe.integrations.google_oauth import GoogleOAuth
from frappe.integrations.doctype.google_drive.google_drive import get_google_drive_object
from frappe.utils import get_url
from frappe.utils.password import get_decrypted_password, set_encrypted_password

from corporate_services.api.project.lifecycle_toolkit import (
    get_project_toolkit_document_template_targets,
    get_project_toolkit_folder_blueprint,
)

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
TOKEN_STORE_FIELD = "google_drive_oauth_payload"
CACHE_STATE_PREFIX = "google_drive_oauth_state"


def _normalize_drive_key(value):
    return " ".join((value or "").strip().lower().split())


def _ensure_drive_folder(drive_service, folder_name, parent_folder_id=None):
    folder_name = (folder_name or "").strip()
    if not folder_name:
        frappe.throw(_("Folder name is required."))

    escaped_name = folder_name.replace("'", "\\'")
    query_parts = [
        "mimeType='application/vnd.google-apps.folder'",
        f"name='{escaped_name}'",
        "trashed=false",
    ]
    if parent_folder_id:
        query_parts.append(f"'{parent_folder_id}' in parents")
    query = " and ".join(query_parts)

    existing = (
        drive_service.files()
        .list(
            q=query,
            fields="files(id,name,webViewLink,parents)",
            pageSize=1,
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
        )
        .execute()
    )
    files = (existing or {}).get("files") or []
    if files:
        files[0]["created"] = False
        return files[0]

    metadata = {"name": folder_name, "mimeType": "application/vnd.google-apps.folder"}
    if parent_folder_id:
        metadata["parents"] = [parent_folder_id]

    created = (
        drive_service.files()
        .create(
            body=metadata,
            fields="id,name,webViewLink,parents",
            supportsAllDrives=True,
        )
        .execute()
    )
    created["created"] = True
    return created


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
    # Keep callback aligned with Frappe/ERPNext's documented Google OAuth flow.
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
    oauth = GoogleOAuth("drive")
    # Redirect back to the same project details tab after authorization.
    redirect = f"/app/icl-project-management/{project_name}?tab=projects#"
    auth = oauth.get_authentication_url({"redirect": redirect})
    return {"auth_url": auth.get("url")}


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
def check_project_google_drive_connection(project_name=None):
    project_name = (project_name or "").strip()
    if project_name:
        _ensure_project_access(project_name)

    try:
        if not frappe.db.exists("Google Drive", "Google Drive"):
            auth_url = None
            if project_name:
                try:
                    auth_url = get_google_drive_auth_url(project_name).get("auth_url")
                except Exception:
                    auth_url = None
            return {
                "connected": False,
                "message": "Google Drive settings are not available. Please configure Google Drive.",
                "auth_url": auth_url,
            }
        gd = frappe.get_doc("Google Drive", "Google Drive")
        gd.get_access_token()
        return {
            "connected": True,
            "message": "Google Drive connection is active.",
        }
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Google Drive connection check failed")
        auth_url = None
        if project_name:
            try:
                auth_url = get_google_drive_auth_url(project_name).get("auth_url")
            except Exception:
                auth_url = None
        return {
            "connected": False,
            "message": "Google Drive token refresh failed. Please reconnect your Google account.",
            "auth_url": auth_url,
        }


@frappe.whitelist()
def create_project_google_drive_folder(project_name, folder_name=None, parent_folder_id=None):
    _ensure_project_access(project_name)

    try:
        drive_service, _account = get_google_drive_object()
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Google Drive access token refresh failed")
        frappe.throw(
            _(
                "Failed to refresh Google Drive token. Please re-authorize from Google Drive settings."
            )
        )

    folder_name = (folder_name or "").strip() or project_name

    folder = _ensure_drive_folder(drive_service, folder_name, parent_folder_id)
    folder_id = folder.get("id")
    folder_link = folder.get("webViewLink") or f"https://drive.google.com/drive/folders/{folder_id}"
    lifecycle_count, folder_id_map = _create_drive_lifecycle_structure(drive_service, folder_id)
    templates_count = _upload_project_toolkit_templates(drive_service, folder_id, folder_id_map)

    try:
        project_doc = frappe.get_doc("Project", project_name)
        project_doc.add_comment(
            "Comment",
            _(
                "Google Drive folder created: <a href=\"{0}\" target=\"_blank\">{1}</a>"
                "<br><small>Lifecycle folders created under this root: {2}</small>"
                "<br><small>Document templates uploaded: {3}</small>"
            ).format(folder_link, folder_name, lifecycle_count, templates_count),
        )
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Failed to add Project comment for Google Drive folder")

    return {
        "folder_id": folder_id,
        "folder_name": folder.get("name") or folder_name,
        "folder_link": folder_link,
        "lifecycle_folders_created": lifecycle_count,
        "templates_uploaded": templates_count,
    }


def _create_drive_lifecycle_structure(drive_service, project_root_folder_id):
    phase_blueprint = get_project_toolkit_folder_blueprint()
    created_count = 0
    folder_id_map = {}

    for phase in phase_blueprint:
        phase_name = (phase.get("phase_name") or "").strip()
        if not phase_name:
            continue

        phase_folder = _ensure_drive_folder(drive_service, phase_name, project_root_folder_id)
        phase_folder_id = phase_folder.get("id")
        if phase_folder.get("created"):
            created_count += 1
        if phase_folder_id:
            folder_id_map[(_normalize_drive_key(phase_name), "__phase__")] = phase_folder_id

        for folder in (phase.get("folders") or []):
            created_count += _create_drive_folder_tree(
                drive_service=drive_service,
                parent_folder_id=phase_folder_id,
                folder_node=folder,
                current_phase=phase_name,
                folder_id_map=folder_id_map,
            )

    return created_count, folder_id_map


def _create_drive_folder_tree(drive_service, parent_folder_id, folder_node, current_phase, folder_id_map):
    folder_name = (folder_node.get("folder_name") or "").strip()
    if not folder_name:
        return 0

    created_count = 0
    folder = _ensure_drive_folder(drive_service, folder_name, parent_folder_id)
    if folder.get("created"):
        created_count += 1

    folder_doc_id = (folder_node.get("folder_id") or "").strip()
    node_phase = (folder_node.get("project_phase") or current_phase or "General").strip() or "General"
    folder_id = folder.get("id")
    if folder_doc_id and folder_id:
        folder_id_map[(_normalize_drive_key(node_phase), _normalize_drive_key(folder_name))] = folder_id
        folder_id_map[folder_doc_id] = folder_id
        folder_id_map[_normalize_drive_key(folder_name)] = folder_id

    for child in (folder_node.get("children") or []):
        created_count += _create_drive_folder_tree(
            drive_service,
            folder_id,
            child,
            node_phase,
            folder_id_map,
        )

    return created_count


def _upload_project_toolkit_templates(drive_service, project_root_folder_id, folder_id_map):
    targets = get_project_toolkit_document_template_targets()
    if not targets:
        return 0

    uploaded_count = 0
    for target in targets:
        attachment = (target.get("attachment") or "").strip()
        if not attachment:
            continue

        file_doc_name = frappe.db.get_value("File", {"file_url": attachment}, "name")
        if not file_doc_name:
            continue

        file_doc = frappe.get_doc("File", file_doc_name)
        file_content = file_doc.get_content()
        if not file_content:
            continue
        if isinstance(file_content, str):
            file_content = file_content.encode("utf-8")
        mime_type = _resolve_file_mime_type(file_doc)

        doc_label = (target.get("document_name") or file_doc.file_name or "Template").strip()
        placements = target.get("placements") or []
        if not placements:
            uploaded_count += _upload_template_to_folder(
                drive_service=drive_service,
                parent_folder_id=project_root_folder_id,
                file_name=file_doc.file_name or doc_label,
                file_content=file_content,
                mime_type=mime_type,
                description=doc_label,
            )
            continue

        for placement in placements:
            phase_name = (placement.get("project_phase") or "").strip() or "General"
            folder_doc_id = (placement.get("folder") or "").strip()
            target_folder_id = _resolve_or_create_template_folder(
                drive_service=drive_service,
                project_root_folder_id=project_root_folder_id,
                folder_id_map=folder_id_map,
                project_phase=phase_name,
                folder_name=folder_doc_id,
            )
            if not target_folder_id:
                frappe.log_error(
                    (
                        "Could not resolve Drive folder for template "
                        f"{doc_label} with phase={phase_name!r}, folder={folder_doc_id!r}"
                    ),
                    "Google Drive Template Upload Target Missing",
                )
                continue
            uploaded_count += _upload_template_to_folder(
                drive_service=drive_service,
                parent_folder_id=target_folder_id,
                file_name=file_doc.file_name or doc_label,
                file_content=file_content,
                mime_type=mime_type,
                description=doc_label,
            )

    return uploaded_count


def _resolve_or_create_template_folder(
    drive_service,
    project_root_folder_id,
    folder_id_map,
    project_phase,
    folder_name,
):
    phase_key = _normalize_drive_key(project_phase or "General")
    folder_key = _normalize_drive_key(folder_name)
    if not folder_key:
        return None

    target_folder_id = (
        folder_id_map.get((phase_key, folder_key))
        or folder_id_map.get(folder_key)
        or folder_id_map.get(folder_name)
    )
    if target_folder_id:
        return target_folder_id

    phase_folder_id = folder_id_map.get((phase_key, "__phase__"))
    if not phase_folder_id:
        phase_folder = _ensure_drive_folder(drive_service, project_phase or "General", project_root_folder_id)
        phase_folder_id = phase_folder.get("id")
        if phase_folder_id:
            folder_id_map[(phase_key, "__phase__")] = phase_folder_id

    if not phase_folder_id:
        return None

    folder = _ensure_drive_folder(drive_service, folder_name, phase_folder_id)
    target_folder_id = folder.get("id")
    if target_folder_id:
        folder_id_map[(phase_key, folder_key)] = target_folder_id
        folder_id_map[folder_key] = target_folder_id
        folder_id_map[folder_name] = target_folder_id
    return target_folder_id


def _upload_template_to_folder(
    drive_service,
    parent_folder_id,
    file_name,
    file_content,
    mime_type=None,
    description=None,
):
    escaped_name = (file_name or "").replace("'", "\\'")
    existing = (
        drive_service.files()
        .list(
            q=(
                "trashed=false and "
                f"name='{escaped_name}' and "
                f"'{parent_folder_id}' in parents"
            ),
            fields="files(id)",
            pageSize=1,
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
        )
        .execute()
    )
    if (existing or {}).get("files"):
        return 0

    media = MediaInMemoryUpload(
        file_content,
        mimetype=mime_type or "application/octet-stream",
        resumable=False,
    )
    metadata = {"name": file_name, "parents": [parent_folder_id]}
    if description:
        metadata["description"] = description

    drive_service.files().create(
        body=metadata,
        media_body=media,
        fields="id",
        supportsAllDrives=True,
    ).execute()
    return 1


def _resolve_file_mime_type(file_doc):
    candidates = [
        getattr(file_doc, "content_type", None),
        getattr(file_doc, "mime_type", None),
        getattr(file_doc, "file_type", None),
        mimetypes.guess_type(getattr(file_doc, "file_name", None) or "")[0],
        mimetypes.guess_type(getattr(file_doc, "file_url", None) or "")[0],
    ]

    for candidate in candidates:
        mime_type = (candidate or "").strip()
        if "/" in mime_type:
            return mime_type

    return "application/octet-stream"


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
