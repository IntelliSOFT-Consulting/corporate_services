import frappe


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
    if not frappe.db.exists("DocType", "HIS Project Lifecycle Config"):
        return {
            "intro_title": "Project Start-to-End Guide",
            "intro_description": "",
            "stages": [],
        }

    try:
        doc = frappe.get_single("HIS Project Lifecycle Config")
    except Exception:
        return {
            "intro_title": "Project Start-to-End Guide",
            "intro_description": "",
            "stages": [],
        }

    stages = sorted(
        [row for row in (doc.stages or []) if row.is_active],
        key=lambda x: (x.display_order or 0, x.idx or 0),
    )

    return {
        "intro_title": doc.intro_title,
        "intro_description": doc.intro_description,
        "stages": [
            {
                "stage_name": row.stage_name,
                "steps": _split_lines(row.steps),
                "requirements": _split_lines(row.requirements),
                "deliverables": _split_lines(row.deliverables),
            }
            for row in stages
        ],
    }


@frappe.whitelist()
def get_template_library():
    rows = frappe.get_all(
        "HIS Project Requirement Template",
        fields=[
            "name",
            "requirement",
            "target_doctype",
            "description",
            "template_file",
            "display_order",
            "is_active",
        ],
        filters={"is_active": 1},
        limit_page_length=200,
        order_by="display_order asc, modified asc",
    )
    return [
        {
            "requirement": row["requirement"],
            "description": row.get("description"),
            "doctype": row.get("target_doctype"),
            "template_docname": row.get("name"),
            "template_file": row.get("template_file"),
            "display_order": row.get("display_order"),
        }
        for row in rows
    ]


@frappe.whitelist()
def link_template_file(requirement, file_url):
    requirement = (requirement or "").strip()
    if not requirement:
        frappe.throw("Requirement is required.")
    if not file_url:
        frappe.throw("Template file is required.")

    docname = frappe.db.get_value("HIS Project Requirement Template", {"requirement": requirement}, "name")
    if not docname:
        frappe.throw(
            f"Requirement '{requirement}' does not exist in HIS Project Requirement Template. "
            "Please create and configure it first."
        )

    doc = frappe.get_doc("HIS Project Requirement Template", docname)
    doc.template_file = file_url
    doc.is_active = 1
    doc.save(ignore_permissions=True)

    return {"name": doc.name, "template_file": doc.template_file}


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
