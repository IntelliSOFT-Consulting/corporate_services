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


@frappe.whitelist()
def get_portfolio_health():
    rows = frappe.db.sql(
        """
        select
            p.name,
            p.project_name,
            p.status,
            coalesce(p.percent_complete, 0) as percent_complete,
            p.expected_start_date,
            p.expected_end_date,
            p.customer,
            p.priority,
            group_concat(pm.employee_name separator ', ') as pm_names,
            case
                when p.expected_end_date < curdate()
                     and p.status not in ('Completed') then 'Red'
                when p.expected_end_date between curdate()
                     and date_add(curdate(), interval 14 day) then 'Amber'
                when p.expected_end_date is not null
                     and p.expected_start_date is not null
                     and datediff(curdate(), p.expected_start_date) >
                         datediff(p.expected_end_date, p.expected_start_date) * 0.6
                     and coalesce(p.percent_complete, 0) < 50 then 'Amber'
                else 'Green'
            end as rag
        from `tabProject` p
        left join `tabProject Manager` pm on pm.parent = p.name
        where p.status not in ('Cancelled', 'Completed')
        group by p.name
        order by
            case
                when p.expected_end_date < curdate() and p.status not in ('Completed') then 1
                when p.expected_end_date between curdate() and date_add(curdate(), interval 14 day) then 2
                else 3
            end,
            p.expected_end_date asc
        """,
        as_dict=True,
    )
    red = sum(1 for r in rows if r.get("rag") == "Red")
    amber = sum(1 for r in rows if r.get("rag") == "Amber")
    green = sum(1 for r in rows if r.get("rag") == "Green")
    return {"projects": rows, "summary": {"red": red, "amber": amber, "green": green}}


@frappe.whitelist()
def get_delivery_pipeline():
    stages = frappe.db.sql(
        """
        select distinct stage_name, display_order
        from `tabHIS Project Lifecycle Stage`
        where is_active = 1
        order by display_order asc, stage_name asc
        """,
        as_dict=True,
    )
    seen, unique_stages = set(), []
    for s in stages:
        if s.stage_name not in seen:
            seen.add(s.stage_name)
            unique_stages.append(s.stage_name)
    if not unique_stages:
        unique_stages = ["Prepare", "Plan", "Design", "Development", "Implementation", "Maintenance"]

    projects = frappe.db.sql(
        """
        select
            p.name,
            p.project_name,
            p.status,
            coalesce(p.percent_complete, 0) as percent_complete,
            p.expected_start_date,
            p.expected_end_date,
            p.customer,
            group_concat(pm.employee_name separator ', ') as pm_names
        from `tabProject` p
        left join `tabProject Manager` pm on pm.parent = p.name
        where p.status not in ('Cancelled')
        group by p.name
        order by p.expected_end_date asc
        """,
        as_dict=True,
    )
    n = len(unique_stages)
    for proj in projects:
        pct = float(proj.get("percent_complete") or 0)
        completed = int((pct / 100) * n)
        proj["stage_progress"] = [
            "complete" if i < completed else ("current" if i == completed else "pending")
            for i in range(n)
        ]
    return {"projects": projects, "stages": unique_stages}


@frappe.whitelist()
def get_overdue_deliverables():
    rows = frappe.db.sql(
        """
        select
            t.name,
            t.subject,
            t.project,
            t.exp_end_date,
            t.status,
            datediff(curdate(), t.exp_end_date) as days_overdue,
            p.project_name,
            p.customer,
            group_concat(pm.employee_name separator ', ') as pm_names
        from `tabTask` t
        join `tabProject` p on p.name = t.project
        left join `tabProject Manager` pm on pm.parent = t.project
        where t.project is not null
          and t.status not in ('Completed', 'Cancelled', 'Closed')
          and (
              t.status = 'Overdue'
              or (t.exp_end_date is not null and t.exp_end_date < curdate())
          )
          and p.status not in ('Cancelled', 'Completed')
        group by t.name
        order by days_overdue desc
        limit 100
        """,
        as_dict=True,
    )
    return {"tasks": rows, "total": len(rows)}


@frappe.whitelist()
def get_pm_workload():
    rows = frappe.db.sql(
        """
        select
            pm.employee,
            pm.employee_name,
            count(distinct p.name) as active_projects,
            count(distinct case
                when t.status not in ('Completed','Cancelled','Closed') then t.name
            end) as open_tasks,
            count(distinct case
                when t.status = 'Overdue'
                  or (t.exp_end_date < curdate()
                      and t.status not in ('Completed','Cancelled','Closed'))
                then t.name
            end) as overdue_tasks
        from `tabProject Manager` pm
        join `tabProject` p on p.name = pm.parent
            and p.status not in ('Completed','Cancelled')
        left join `tabTask` t on t.project = p.name
        group by pm.employee, pm.employee_name
        order by overdue_tasks desc, active_projects desc
        """,
        as_dict=True,
    )
    return {"pms": rows}


@frappe.whitelist()
def get_lessons_learned_trends():
    workflow_states = frappe.db.sql(
        """
        select
            coalesce(nullif(workflow_state, ''), 'Draft') as state,
            count(*) as count
        from `tabProject Management Lessons Learned`
        group by coalesce(nullif(workflow_state, ''), 'Draft')
        order by count desc
        """,
        as_dict=True,
    )

    recommendation_priorities = frappe.db.sql(
        """
        select
            coalesce(nullif(trim(r.priority), ''), 'Not set') as priority,
            count(*) as count
        from `tabLessons Learned Recommendation` r
        join `tabProject Management Lessons Learned` ll on ll.name = r.parent
        where ll.workflow_state = 'Approved'
        group by coalesce(nullif(trim(r.priority), ''), 'Not set')
        order by field(r.priority, 'High', 'Medium', 'Low') asc, count desc
        """,
        as_dict=True,
    )

    next_step_statuses = frappe.db.sql(
        """
        select
            coalesce(nullif(trim(ns.status), ''), 'Not set') as status,
            count(*) as count
        from `tabLessons Learned Next Step` ns
        join `tabProject Management Lessons Learned` ll on ll.name = ns.parent
        where ll.workflow_state = 'Approved'
        group by coalesce(nullif(trim(ns.status), ''), 'Not set')
        order by count desc
        """,
        as_dict=True,
    )

    coverage = frappe.db.sql(
        """
        select
            sum(case when exists (
                select 1 from `tabLessons Learned Root Cause` rc where rc.parent = ll.name
            ) then 1 else 0 end) as with_root_causes,
            sum(case when exists (
                select 1 from `tabLessons Learned Recommendation` r where r.parent = ll.name
            ) then 1 else 0 end) as with_recommendations,
            sum(case when exists (
                select 1 from `tabLessons Learned Next Step` ns where ns.parent = ll.name
            ) then 1 else 0 end) as with_next_steps,
            count(*) as total
        from `tabProject Management Lessons Learned` ll
        where ll.workflow_state = 'Approved'
        """,
        as_dict=True,
    )

    root_causes = frappe.db.sql(
        """
        select
            rc.issue,
            rc.root_cause,
            rc.area_affected,
            ll.name as report_name,
            ll.project_title,
            ll.reporter_name
        from `tabLessons Learned Root Cause` rc
        join `tabProject Management Lessons Learned` ll on ll.name = rc.parent
        where ll.workflow_state = 'Approved'
          and (rc.issue is not null or rc.root_cause is not null)
        order by ll.name, rc.idx
        """,
        as_dict=True,
    )

    recommendations = frappe.db.sql(
        """
        select
            r.recommendation,
            r.priority,
            r.area,
            ll.name as report_name,
            ll.project_title,
            ll.reporter_name
        from `tabLessons Learned Recommendation` r
        join `tabProject Management Lessons Learned` ll on ll.name = r.parent
        where ll.workflow_state = 'Approved'
          and r.recommendation is not null
        order by field(r.priority, 'High', 'Medium', 'Low'), ll.name, r.idx
        """,
        as_dict=True,
    )

    next_steps = frappe.db.sql(
        """
        select
            ns.action_item,
            ns.responsible_person,
            ns.deadline,
            ns.status,
            ll.name as report_name,
            ll.project_title
        from `tabLessons Learned Next Step` ns
        join `tabProject Management Lessons Learned` ll on ll.name = ns.parent
        where ll.workflow_state = 'Approved'
          and ns.action_item is not null
        order by ns.deadline asc, ll.name, ns.idx
        """,
        as_dict=True,
    )

    return {
        "workflow_states": workflow_states,
        "recommendation_priorities": recommendation_priorities,
        "next_step_statuses": next_step_statuses,
        "coverage": coverage[0] if coverage else {},
        "root_causes": root_causes,
        "recommendations": recommendations,
        "next_steps": next_steps,
    }


@frappe.whitelist()
def search_lessons_learned_kb(q=None, area=None, priority=None):
    q = (q or "").strip()
    area = (area or "").strip()
    priority = (priority or "").strip()

    conditions = ["ll.workflow_state = 'Approved'"]
    params = {}

    if q:
        conditions.append(
            """(
                ll.project_title like %(q)s
                or exists (
                    select 1 from `tabLessons Learned Root Cause` rc
                    where rc.parent = ll.name
                      and (rc.issue like %(q)s or rc.root_cause like %(q)s)
                )
                or exists (
                    select 1 from `tabLessons Learned Recommendation` r
                    where r.parent = ll.name
                      and r.recommendation like %(q)s
                )
                or exists (
                    select 1 from `tabLessons Learned Next Step` ns
                    where ns.parent = ll.name
                      and ns.action_item like %(q)s
                )
            )"""
        )
        params["q"] = f"%{q}%"

    if area:
        conditions.append(
            """exists (
                select 1 from `tabLessons Learned Recommendation` r
                where r.parent = ll.name and r.area = %(area)s
            )"""
        )
        params["area"] = area

    if priority:
        conditions.append(
            """exists (
                select 1 from `tabLessons Learned Recommendation` r
                where r.parent = ll.name and r.priority = %(priority)s
            )"""
        )
        params["priority"] = priority

    where = " and ".join(conditions)
    reports = frappe.db.sql(
        f"""
        select ll.name as report_name, ll.project_title, ll.reporter_name,
               ll.workflow_state, ll.date_of_report
        from `tabProject Management Lessons Learned` ll
        where {where}
        order by ll.date_of_report desc
        limit 50
        """,
        params,
        as_dict=True,
    )

    names = [r["report_name"] for r in reports]
    if not names:
        return []

    fmt = ",".join(["%s"] * len(names))

    root_causes = frappe.db.sql(
        f"select parent, issue, root_cause from `tabLessons Learned Root Cause` where parent in ({fmt}) order by idx",
        names, as_dict=True,
    )
    recommendations = frappe.db.sql(
        f"select parent, recommendation, priority, area from `tabLessons Learned Recommendation` where parent in ({fmt}) order by idx",
        names, as_dict=True,
    )
    next_steps = frappe.db.sql(
        f"select parent, action_item, responsible_person, deadline, status from `tabLessons Learned Next Step` where parent in ({fmt}) order by idx",
        names, as_dict=True,
    )

    rc_map = {}
    for rc in root_causes:
        rc_map.setdefault(rc["parent"], []).append(rc)
    rec_map = {}
    for rec in recommendations:
        rec_map.setdefault(rec["parent"], []).append(rec)
    ns_map = {}
    for ns in next_steps:
        ns_map.setdefault(ns["parent"], []).append(ns)

    for r in reports:
        n = r["report_name"]
        r["root_causes"] = rc_map.get(n, [])
        r["recommendations"] = rec_map.get(n, [])
        r["next_steps"] = ns_map.get(n, [])

    return reports


@frappe.whitelist()
def export_lessons_learned_docx(report_name=None):
    if not report_name:
        frappe.throw("report_name is required.")

    doc = frappe.get_doc("Project Management Lessons Learned", report_name)

    root_causes = frappe.db.get_all(
        "Lessons Learned Root Cause",
        filters={"parent": report_name},
        fields=["issue", "root_cause", "area_affected"],
        order_by="idx",
    )
    recommendations = frappe.db.get_all(
        "Lessons Learned Recommendation",
        filters={"parent": report_name},
        fields=["recommendation", "priority", "area"],
        order_by="idx",
    )
    next_steps = frappe.db.get_all(
        "Lessons Learned Next Step",
        filters={"parent": report_name},
        fields=["action_item", "responsible_person", "deadline", "status"],
        order_by="idx",
    )
    answers = frappe.db.get_all(
        "Lessons Learned Answer",
        filters={"parent": report_name},
        fields=["question", "response"],
        order_by="idx",
    )

    from docx import Document
    from docx.shared import Pt, RGBColor, Inches
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn
    import io, os

    word = Document()

    # Page margins
    for section in word.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1.2)
        section.right_margin = Inches(1.2)

    BRAND = RGBColor(0x00, 0x52, 0x9B)   # IntelliSOFT blue

    def heading(text, level=1):
        p = word.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(13 if level == 1 else 11)
        run.font.color.rgb = BRAND
        return p

    def body(text):
        p = word.add_paragraph(str(text or "-"))
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(4)
        p.runs[0].font.size = Pt(10)
        return p

    def add_table(headers, rows):
        tbl = word.add_table(rows=1, cols=len(headers))
        tbl.style = "Table Grid"
        hrow = tbl.rows[0]
        for i, h in enumerate(headers):
            cell = hrow.cells[i]
            cell.text = h
            run = cell.paragraphs[0].runs[0]
            run.bold = True
            run.font.size = Pt(9)
            run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            shading = cell._tc.get_or_add_tcPr()
            from docx.oxml import OxmlElement
            shd = OxmlElement("w:shd")
            shd.set(qn("w:fill"), "00529B")
            shd.set(qn("w:color"), "auto")
            shd.set(qn("w:val"), "clear")
            shading.append(shd)
        for row_data in rows:
            row = tbl.add_row()
            for i, val in enumerate(row_data):
                row.cells[i].text = str(val or "-")
                row.cells[i].paragraphs[0].runs[0].font.size = Pt(9)
        word.add_paragraph()

    # ── Header ──
    p = word.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("INTELLISOFT CONSULTING")
    run.bold = True
    run.font.size = Pt(16)
    run.font.color.rgb = BRAND

    p2 = word.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r2 = p2.add_run("Lessons Learned Report")
    r2.font.size = Pt(13)
    r2.font.color.rgb = RGBColor(0x44, 0x44, 0x44)

    word.add_paragraph()

    # ── Project Info ──
    heading("Project Information")
    info_tbl = word.add_table(rows=0, cols=2)
    info_tbl.style = "Table Grid"
    for label, value in [
        ("Report No.", doc.name),
        ("Project", doc.project_title or doc.project or "-"),
        ("Client", getattr(doc, "client", None) or "-"),
        ("Reporter", doc.reporter_name or "-"),
        ("Designation", getattr(doc, "designation_of_reporter", None) or "-"),
        ("Date of Report", str(doc.date_of_report or "-")),
        ("Expected Start", str(getattr(doc, "expected_start_date", None) or "-")),
        ("Expected End", str(getattr(doc, "expected_end_date", None) or "-")),
        ("Workflow Status", doc.workflow_state or "-"),
    ]:
        row = info_tbl.add_row()
        row.cells[0].text = label
        row.cells[0].paragraphs[0].runs[0].bold = True
        row.cells[0].paragraphs[0].runs[0].font.size = Pt(9)
        row.cells[1].text = str(value)
        row.cells[1].paragraphs[0].runs[0].font.size = Pt(9)
    word.add_paragraph()

    # ── Narrative ──
    if answers:
        heading("Narrative Report")
        for ans in answers:
            p = word.add_paragraph()
            run = p.add_run(f"{ans.get('question', '')}:")
            run.bold = True
            run.font.size = Pt(10)
            from html.parser import HTMLParser
            class _Strip(HTMLParser):
                def __init__(self):
                    super().__init__()
                    self.parts = []
                def handle_data(self, d):
                    self.parts.append(d)
            s = _Strip()
            s.feed(str(ans.get("response") or ""))
            body("".join(s.parts).strip() or "-")

    # ── Root Cause Analysis ──
    if root_causes:
        heading("Root Cause Analysis")
        add_table(
            ["Issue", "Root Cause", "Area Affected"],
            [(r.issue, r.root_cause, r.area_affected) for r in root_causes],
        )

    # ── Recommendations ──
    if recommendations:
        heading("Recommendations")
        add_table(
            ["Recommendation", "Priority", "Area"],
            [(r.recommendation, r.priority, r.area) for r in recommendations],
        )

    # ── Next Steps ──
    if next_steps:
        heading("Next Steps / Follow-up")
        add_table(
            ["Action Item", "Responsible Person", "Deadline", "Status"],
            [(n.action_item, n.responsible_person, str(n.deadline or ""), n.status) for n in next_steps],
        )

    # ── Footer note ──
    word.add_paragraph()
    p = word.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("IntelliSOFT Consulting - Project Management Office - Confidential")
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor(0x88, 0x88, 0x88)

    # ── Save ──
    buf = io.BytesIO()
    word.save(buf)
    buf.seek(0)

    fname = f"LL-{report_name}.docx"
    file_doc = frappe.get_doc({
        "doctype": "File",
        "file_name": fname,
        "is_private": 1,
        "content": buf.read(),
    })
    file_doc.save(ignore_permissions=True)

    return {"file_url": file_doc.file_url}


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
