import frappe


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
