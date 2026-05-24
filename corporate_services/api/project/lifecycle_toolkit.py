from __future__ import annotations

from collections import defaultdict
from typing import Any, Dict, Iterable, List, Optional

import frappe


LIFECYCLE_CONFIG_DOCTYPE = "HIS Project Lifecycle Config"


def _split_lines(value: Any) -> List[str]:
    if not value:
        return []
    return [line.strip() for line in str(value).splitlines() if line.strip()]


def _is_field_available(doc: Any, fieldname: str) -> bool:
    try:
        return bool(doc and doc.meta and doc.meta.has_field(fieldname))
    except Exception:
        return False


def _is_child_row_active(row: Any, include_inactive: bool = False) -> bool:
    if include_inactive:
        return True
    return bool(getattr(row, "is_active", 0))


def _normalize_stage_name(value: Any) -> str:
    return (value or "").strip()


def _normalize_folder_group(value: Any) -> str:
    normalized = (value or "").strip().lower()
    if normalized in {"requirement", "requirements"}:
        return "Requirements"
    if normalized in {"supporting", "supporting documents", "reference"}:
        return "Supporting Documents"
    return "Deliverables - Templates"


def _normalize_toolkit_row(row: Any, fallback_stage_name: str = "") -> Dict[str, Any]:
    stage_name = _normalize_stage_name(getattr(row, "stage_name", None)) or fallback_stage_name
    requirement = (getattr(row, "requirement", None) or getattr(row, "item_name", None) or "").strip()
    return {
        "name": getattr(row, "name", None),
        "stage_name": stage_name,
        "requirement": requirement,
        "target_doctype": getattr(row, "target_doctype", None),
        "description": getattr(row, "description", None),
        "display_order": getattr(row, "display_order", None),
        "folder_group": _normalize_folder_group(getattr(row, "folder_group", None)),
        "template_file": getattr(row, "template_file", None),
        "is_active": bool(getattr(row, "is_active", 0)),
    }


def get_lifecycle_config_doc():
    if not frappe.db.exists("DocType", LIFECYCLE_CONFIG_DOCTYPE):
        return None

    try:
        return frappe.get_single(LIFECYCLE_CONFIG_DOCTYPE)
    except Exception:
        return None


def get_lifecycle_stages(include_inactive: bool = False) -> List[Dict[str, Any]]:
    doc = get_lifecycle_config_doc()
    if not doc:
        return []

    raw_stages = list(getattr(doc, "stages", None) or [])
    toolkit_rows = list(getattr(doc, "toolkit_items", None) or [])

    stages = [row for row in raw_stages if _is_child_row_active(row, include_inactive)]
    stages = sorted(
        stages,
        key=lambda row: ((getattr(row, "display_order", None) or 0), (getattr(row, "idx", None) or 0)),
    )

    toolkit_by_stage: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for row in toolkit_rows:
        if not _is_child_row_active(row, include_inactive):
            continue
        normalized = _normalize_toolkit_row(row)
        stage_name = normalized["stage_name"]
        if not stage_name:
            continue
        toolkit_by_stage[stage_name].append(normalized)

    for items in toolkit_by_stage.values():
        items.sort(
            key=lambda item: (
                item.get("display_order") or 0,
                item.get("name") or "",
            )
        )

    normalized_stages: List[Dict[str, Any]] = []
    for row in stages:
        stage_name = _normalize_stage_name(getattr(row, "stage_name", None))
        stage_requirements = _split_lines(getattr(row, "requirements", None))
        stage_deliverables = _split_lines(getattr(row, "deliverables", None))
        stage_toolkit_items = toolkit_by_stage.get(stage_name, [])

        grouped_toolkit_items = defaultdict(list)
        for item in stage_toolkit_items:
            grouped_toolkit_items[item["folder_group"]].append(item)

        normalized_stages.append(
            {
                "stage_name": stage_name,
                "display_order": getattr(row, "display_order", None),
                "is_active": bool(getattr(row, "is_active", 0)),
                "steps": _split_lines(getattr(row, "steps", None)),
                "requirements": stage_requirements,
                "deliverables": stage_deliverables,
                "toolkit_items": stage_toolkit_items,
                "toolkit_item_groups": dict(grouped_toolkit_items),
            }
        )

    # Preserve configured stages order and, for safety, include toolkit rows that have
    # been entered before the matching stage row exists.
    known_stage_names = {stage["stage_name"] for stage in normalized_stages}
    dangling_stage_names = [name for name in toolkit_by_stage.keys() if name not in known_stage_names]
    for stage_name in sorted(dangling_stage_names):
        items = toolkit_by_stage[stage_name]
        grouped_toolkit_items = defaultdict(list)
        for item in items:
            grouped_toolkit_items[item["folder_group"]].append(item)
        normalized_stages.append(
            {
                "stage_name": stage_name,
                "display_order": None,
                "is_active": True,
                "steps": [],
                "requirements": [],
                "deliverables": [],
                "toolkit_items": items,
                "toolkit_item_groups": dict(grouped_toolkit_items),
            }
        )

    return normalized_stages


def get_toolkit_items(include_inactive: bool = False) -> List[Dict[str, Any]]:
    stages = get_lifecycle_stages(include_inactive=include_inactive)
    items: List[Dict[str, Any]] = []
    for stage in stages:
        for item in stage.get("toolkit_items", []):
            item_copy = dict(item)
            item_copy["stage_name"] = stage.get("stage_name") or item_copy.get("stage_name") or ""
            items.append(item_copy)

    return items


def get_template_library_rows(include_inactive: bool = False) -> List[Dict[str, Any]]:
    rows = get_toolkit_items(include_inactive=include_inactive)
    return [
        {
            "name": row.get("name"),
            "stage_name": row.get("stage_name") or "",
            "requirement": row.get("requirement"),
            "description": row.get("description"),
            "doctype": row.get("target_doctype"),
            "template_docname": row.get("name"),
            "template_file": row.get("template_file"),
            "display_order": row.get("display_order"),
            "folder_group": row.get("folder_group"),
            "is_active": row.get("is_active", True),
        }
        for row in rows
    ]



def _lifecycle_row_key(row: Any) -> str:
    for fieldname in ("toolkit_item", "name", "requirement"):
        value = getattr(row, fieldname, None) if not isinstance(row, dict) else row.get(fieldname)
        if value:
            value = str(value).strip()
            if value:
                return value
    return ""


def build_project_lifecycle_rows(existing_rows: Optional[Iterable[Any]] = None, include_inactive: bool = False) -> List[Dict[str, Any]]:
    existing_map: Dict[str, Any] = {}
    for row in existing_rows or []:
        key = _lifecycle_row_key(row)
        if key:
            existing_map[key] = row

    rows: List[Dict[str, Any]] = []
    for item in get_template_library_rows(include_inactive=include_inactive):
        key = (item.get("name") or item.get("requirement") or "").strip()
        existing = existing_map.get(key) or existing_map.get((item.get("requirement") or "").strip())
        rows.append({
            "toolkit_item": key,
            "stage_name": item.get("stage_name") or "",
            "requirement": item.get("requirement") or "",
            "target_doctype": item.get("doctype") or "",
            "template_file": item.get("template_file") or None,
            "status": (getattr(existing, "status", None) if existing is not None else None) or (existing.get("status") if isinstance(existing, dict) else None) or "Not Started",
            "remarks": (getattr(existing, "remarks", None) if existing is not None else None) or (existing.get("remarks") if isinstance(existing, dict) else None) or "",
        })
    return rows


def get_project_lifecycle_rows(project: Optional[str] = None, docname: Optional[str] = None, include_inactive: bool = False) -> List[Dict[str, Any]]:
    existing_doc = None
    docname = (docname or "").strip()
    project = (project or "").strip()

    if docname and frappe.db.exists("HIS PM Project LifeCycle", docname):
        existing_doc = frappe.get_doc("HIS PM Project LifeCycle", docname)
    elif project:
        existing_doc_name = frappe.db.get_value("HIS PM Project LifeCycle", {"project": project}, "name")
        if existing_doc_name:
            existing_doc = frappe.get_doc("HIS PM Project LifeCycle", existing_doc_name)

    existing_rows = list(getattr(existing_doc, "lifecycle_items", None) or []) if existing_doc else []
    return build_project_lifecycle_rows(existing_rows=existing_rows, include_inactive=include_inactive)


def get_project_toolkit_folder_blueprint(include_inactive: bool = False) -> List[Dict[str, Any]]:
    """Return active project toolkit folders grouped by project phase.

    Source of truth: HIS Project Lifecycle Config -> Project Toolkit Folders.
    """
    doc = get_lifecycle_config_doc()
    if not doc:
        return []

    rows = list(getattr(doc, "project_toolkit_folders", None) or [])
    selected_folder_ids: List[str] = []
    for row in rows:
        folder_id = (getattr(row, "folder_name", None) or "").strip()
        if not folder_id:
            continue
        if include_inactive or bool(getattr(row, "is_active", 0)):
            selected_folder_ids.append(folder_id)

    if not selected_folder_ids:
        return []

    folder_docs = frappe.get_all(
        "HIS Project Folders",
        fields=["name", "folder_name", "project_phase", "is_active", "is_child_folder", "parent_folder"],
        filters={"name": ["in", list(dict.fromkeys(selected_folder_ids))]},
        limit_page_length=1000,
    )
    folder_by_id = {d.name: d for d in folder_docs}

    active_ids: List[str] = []
    for folder_id in selected_folder_ids:
        folder = folder_by_id.get(folder_id)
        if not folder:
            continue
        if include_inactive or bool(folder.get("is_active")):
            active_ids.append(folder_id)

    if not active_ids:
        return []

    nodes: Dict[str, Dict[str, Any]] = {}
    for folder_id in active_ids:
        folder = folder_by_id[folder_id]
        nodes[folder_id] = {
            "folder_id": folder_id,
            "folder_name": (folder.get("folder_name") or folder_id).strip(),
            "project_phase": (folder.get("project_phase") or "").strip(),
            "is_child_folder": bool(folder.get("is_child_folder")),
            "parent_folder": (folder.get("parent_folder") or "").strip(),
            "children": [],
        }

    root_ids: List[str] = []
    for folder_id in active_ids:
        node = nodes[folder_id]
        parent_id = node["parent_folder"]
        if node["is_child_folder"] and parent_id and parent_id in nodes:
            nodes[parent_id]["children"].append(node)
        else:
            root_ids.append(folder_id)

    phases: Dict[str, Dict[str, Any]] = {}
    for root_id in root_ids:
        node = nodes[root_id]
        phase_name = node["project_phase"] or "General"
        if phase_name not in phases:
            phases[phase_name] = {"phase_name": phase_name, "folders": []}
        phases[phase_name]["folders"].append(node)

    phase_order: List[str] = []
    for folder_id in active_ids:
        phase_name = (nodes[folder_id]["project_phase"] or "General")
        if phase_name not in phase_order:
            phase_order.append(phase_name)

    return [phases[phase_name] for phase_name in phase_order if phase_name in phases]


def get_project_toolkit_document_template_targets(include_inactive: bool = False) -> List[Dict[str, Any]]:
    """Return active document templates with their phase/folder availability targets."""
    doc = get_lifecycle_config_doc()
    if not doc:
        return []

    child_rows = list(getattr(doc, "project_toolkit_document_templates", None) or [])
    template_names: List[str] = []
    for row in child_rows:
        template_name = (getattr(row, "document_name", None) or "").strip()
        if not template_name:
            continue
        if include_inactive or bool(getattr(row, "is_active", 0)):
            template_names.append(template_name)

    if not template_names:
        return []

    targets: List[Dict[str, Any]] = []
    for template_name in list(dict.fromkeys(template_names)):
        if not frappe.db.exists("Project Toolkit Document Templates", template_name):
            continue

        template_doc = frappe.get_doc("Project Toolkit Document Templates", template_name)
        if not (include_inactive or bool(getattr(template_doc, "is_active", 0))):
            continue

        placements = []
        for row in list(getattr(template_doc, "project_phase", None) or []):
            if not (include_inactive or bool(getattr(row, "available", 0))):
                continue
            placements.append(
                {
                    "project_phase": (getattr(row, "project_phase", None) or "").strip(),
                    "folder": (getattr(row, "folder", None) or "").strip(),
                }
            )

        targets.append(
            {
                "document_name": (getattr(template_doc, "document_name", None) or template_name).strip(),
                "attachment": (getattr(template_doc, "attachment", None) or "").strip(),
                "placements": placements,
            }
        )

    return targets


def find_toolkit_item(requirement: Optional[str] = None, docname: Optional[str] = None):
    requirement = (requirement or "").strip()
    docname = (docname or "").strip()

    if docname:
        doc = get_lifecycle_config_doc()
        if doc and _is_field_available(doc, "toolkit_items"):
            for row in getattr(doc, "toolkit_items", None) or []:
                if row.name == docname:
                    return {"type": "config", "row": row, "doc": doc}
    if requirement:
        doc = get_lifecycle_config_doc()
        if doc and _is_field_available(doc, "toolkit_items"):
            matches = [
                row
                for row in getattr(doc, "toolkit_items", None) or []
                if (getattr(row, "requirement", None) or "").strip() == requirement
            ]
            if matches:
                return {"type": "config", "row": matches[0], "doc": doc}

    return None


def update_toolkit_template_file(
    requirement: Optional[str] = None,
    file_url: Optional[str] = None,
    docname: Optional[str] = None,
):
    if not file_url:
        frappe.throw("Template file is required.")

    resolved = find_toolkit_item(requirement=requirement, docname=docname)
    if not resolved:
        target = requirement or docname or "unknown item"
        frappe.throw(
            f"Requirement '{target}' does not exist in the HIS Project Lifecycle Toolkit configuration."
        )

    doc = resolved["doc"]
    row = resolved["row"]
    for child_row in getattr(doc, "toolkit_items", None) or []:
        if child_row.name == row.name:
            child_row.template_file = file_url
            child_row.is_active = 1
            break
    doc.save(ignore_permissions=True)
    return {"name": row.name, "template_file": file_url}
