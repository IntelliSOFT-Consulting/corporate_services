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
