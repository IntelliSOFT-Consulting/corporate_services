import frappe
import re


@frappe.whitelist()
def get_project_details(project_name):
    if not project_name:
        frappe.throw("Project is required.")

    project = frappe.get_doc("Project", project_name)
    return {
        "name": project.name,
        "project_name": project.project_name,
        "status": project.status,
        "priority": project.priority,
        "percent_complete": project.percent_complete,
        "expected_start_date": project.expected_start_date,
        "expected_end_date": project.expected_end_date,
        "department": project.department,
        "project_type": project.project_type,
        "company": project.company,
        "customer": project.customer,
        "notes": project.notes,
        "creation": project.creation,
        "modified": project.modified,
    }


@frappe.whitelist()
def get_project_template_targets(project_name):
    if not project_name:
        frappe.throw("Project is required.")

    templates = frappe.get_all(
        "HIS Project Requirement Template",
        filters={"is_active": 1},
        fields=["requirement", "target_doctype", "display_order"],
        order_by="display_order asc, modified asc",
        limit_page_length=200,
    )

    candidates = ["project_name", "project", "project_id"]
    out = []

    for template in templates:
        doctype = template["target_doctype"]
        if not doctype:
            continue
        search_fields = candidates

        fieldname = None
        first_name = None
        match_count = 0

        try:
            meta = frappe.get_meta(doctype)
            for f in search_fields:
                if meta.get_field(f):
                    fieldname = f
                    break

            if fieldname:
                docs = frappe.get_all(
                    doctype,
                    filters={fieldname: project_name},
                    fields=["name"],
                    limit_page_length=2,
                    order_by="modified desc",
                )
                match_count = len(docs)
                first_name = docs[0]["name"] if docs else None
        except Exception:
            # Keep the template visible even when the user lacks access
            fieldname = fieldname or None
            first_name = None
            match_count = 0

        out.append(
            {
                "label": template["requirement"],
                "doctype": doctype,
                "project_field": fieldname,
                "first_name": first_name,
                "match_count": match_count,
            }
        )

    return out


@frappe.whitelist()
def get_project_folder_tree(project_name):
    if not project_name:
        frappe.throw("Project is required.")

    root_file_name = f"Project - {project_name}"
    root_name = frappe.db.get_value(
        "File",
        {"is_folder": 1, "file_name": root_file_name, "folder": "Home"},
        "name",
    )
    if not root_name:
        return {"root": None, "children": []}

    def _children(parent_name):
        rows = frappe.get_all(
            "File",
            filters={"is_folder": 1, "folder": parent_name},
            fields=["name", "file_name", "folder", "creation", "modified"],
            order_by="file_name asc",
        )
        out = []
        for row in rows:
            out.append(
                {
                    "name": row["name"],
                    "file_name": row["file_name"],
                    "folder": row["folder"],
                    "creation": row["creation"],
                    "modified": row["modified"],
                    "children": _children(row["name"]),
                }
            )
        return out

    root_doc = frappe.get_doc("File", root_name)
    return {
        "root": {"name": root_doc.name, "file_name": root_doc.file_name},
        "children": _children(root_doc.name),
    }


@frappe.whitelist()
def get_project_google_drive_folders(project_name):
    if not project_name:
        frappe.throw("Project is required.")

    comments = frappe.get_all(
        "Comment",
        filters={
            "reference_doctype": "Project",
            "reference_name": project_name,
            "comment_type": "Comment",
        },
        fields=["name", "content", "creation", "owner"],
        order_by="creation desc",
        limit_page_length=200,
    )

    rows = []
    seen = set()
    link_pattern = re.compile(r'https?://drive\.google\.com/drive/folders/[A-Za-z0-9_-]+')
    name_pattern = re.compile(r"Google Drive folder created:\s*.*?>(.*?)</a>", re.IGNORECASE)

    for row in comments:
        content = row.get("content") or ""
        if "Google Drive folder created" not in content:
            continue

        link_match = link_pattern.search(content)
        if not link_match:
            continue
        folder_link = link_match.group(0)

        folder_name = "Google Drive Folder"
        name_match = name_pattern.search(content)
        if name_match and name_match.group(1).strip():
            folder_name = name_match.group(1).strip()

        key = f"{folder_name}|{folder_link}"
        if key in seen:
            continue
        seen.add(key)

        rows.append(
            {
                "folder_name": folder_name,
                "folder_link": folder_link,
                "created_on": row.get("creation"),
                "created_by": row.get("owner"),
            }
        )

    return rows
