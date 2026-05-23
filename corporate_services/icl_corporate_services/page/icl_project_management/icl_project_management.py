import frappe

from corporate_services.api.project.lifecycle_toolkit import (
    DEFAULT_INTRO_DESCRIPTION,
    DEFAULT_INTRO_TITLE,
    get_lifecycle_stages,
    get_template_library_rows,
    update_toolkit_template_file,
)


@frappe.whitelist()
def get_dashboard_data():
    summary = _get_summary()
    status_breakdown = _get_status_breakdown()
    projects = _get_projects()
    return {
        "summary": summary,
        "status_breakdown": status_breakdown,
        "projects": projects,
    }


def _split_lines(value):
    if not value:
        return []
    return [line.strip() for line in str(value).splitlines() if line.strip()]


@frappe.whitelist()
def get_lifecycle_config():
    return {
        "intro_title": _get_intro_title(),
        "intro_description": _get_intro_description(),
        "stages": get_lifecycle_stages(),
    }


@frappe.whitelist()
def get_template_library():
    return get_template_library_rows()


@frappe.whitelist()
def link_template_file(requirement=None, file_url=None, docname=None):
    requirement = (requirement or "").strip()
    docname = (docname or "").strip()
    if not requirement and not docname:
        frappe.throw("Requirement is required.")
    if not file_url:
        frappe.throw("Template file is required.")

    return update_toolkit_template_file(requirement=requirement, file_url=file_url, docname=docname)


def _get_summary():
    rows = frappe.db.sql(
        """
        select
            count(name) as total_projects,
            sum(case when status = 'Completed' then 1 else 0 end) as completed_projects,
            sum(case when status in ('Open', 'Working') then 1 else 0 end) as active_projects,
            avg(coalesce(percent_complete, 0)) as average_progress
        from `tabProject`
        where ifnull(status, '') != 'Cancelled'
        """,
        as_dict=True,
    )
    return rows[0] if rows else {}


def _get_status_breakdown():
    return frappe.db.sql(
        """
        select
            coalesce(status, 'Not Set') as status,
            count(*) as count
        from `tabProject`
        where ifnull(status, '') != 'Cancelled'
        group by coalesce(status, 'Not Set')
        order by count desc
        """,
        as_dict=True,
    )


def _get_projects():
    return frappe.db.sql(
        """
        select
            name,
            project_name,
            status,
            percent_complete,
            expected_start_date,
            expected_end_date,
            priority,
            modified
        from `tabProject`
        where ifnull(status, '') != 'Cancelled'
        order by modified desc
        """,
        as_dict=True,
    )


def _get_intro_title():
    doc = _get_lifecycle_doc()
    if doc and getattr(doc, "intro_title", None):
        return doc.intro_title
    return DEFAULT_INTRO_TITLE


def _get_intro_description():
    doc = _get_lifecycle_doc()
    if doc and getattr(doc, "intro_description", None):
        return doc.intro_description
    return DEFAULT_INTRO_DESCRIPTION


def _get_lifecycle_doc():
    if not frappe.db.exists("DocType", "HIS Project Lifecycle Config"):
        return None
    try:
        return frappe.get_single("HIS Project Lifecycle Config")
    except Exception:
        return None
