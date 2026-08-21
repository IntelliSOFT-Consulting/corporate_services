from collections import defaultdict

import frappe
from frappe.utils import add_days, getdate, nowdate

TASK_DEFINITIONS = [
    {"field": "inform_chosen_staff", "label": "Inform chosen staff", "offset_days": -30},
    {
        "field": "conduct_background_checks_if_applicable",
        "label": "Conduct background checks",
        "offset_days": -30,
    },
    {"field": "send_kyc", "label": "Send KYC", "offset_days": -7},
    {"field": "send_contract_nda", "label": "Send contract / NDA", "offset_days": -7},
    {"field": "create_an_erp_profile", "label": "Create ERP profile", "offset_days": -7},
    {
        "field": "create_official_company_email_address",
        "label": "Create official company email",
        "offset_days": -7,
    },
    {
        "field": "add_to_company_communication_platforms_and_relevant_groups",
        "label": "Add to company communication platforms",
        "offset_days": -7,
    },
    {
        "field": "arrange_company_transport_registration",
        "label": "Arrange company transport registration",
        "offset_days": -7,
    },
    {
        "field": "prepare_company_laptop_for_their_use_if_applicable",
        "label": "Prepare company laptop",
        "offset_days": -7,
    },
    {"field": "send_welcome_email", "label": "Send welcome email", "offset_days": 0},
    {
        "field": "send_company_wide_email_intro",
        "label": "Send company-wide introduction",
        "offset_days": 0,
    },
    {
        "field": "provide_necessary_stationery_and_equipment",
        "label": "Provide stationery and equipment",
        "offset_days": 0,
    },
    {
        "field": "conduct_in_person_onboarding_meeting",
        "label": "Conduct onboarding meeting",
        "offset_days": 0,
    },
    {
        "field": "introduce_new_hire_to_other_members_of_the_organization",
        "label": "Introduce new hire to team",
        "offset_days": 0,
    },
    {"field": "tour_of_office_and_facilities", "label": "Tour office", "offset_days": 0},
    {
        "field": "lunch_with_new_hire_supervisor_hr_new_hire",
        "label": "Lunch with supervisor / HR",
        "offset_days": 0,
    },
    {
        "field": "officially_hand_them_over_to_their_supervisor",
        "label": "Hand over to supervisor",
        "offset_days": 0,
    },
    {
        "field": "formal_supervisory_end_of_probationary_review",
        "label": "Formal supervisory end-of-probation review",
        "offset_days": 90,
    },
]

INTERN_TASK = {
    "field": "for_interns_send_internship_commencement_form",
    "label": "Send internship commencement form",
    "offset_days": 0,
}


@frappe.whitelist()
def get_dashboard_data(employee=None):
    schedule_rows = _get_schedule_rows(employee)
    if not schedule_rows:
        return {
            "summary": {
                "total_employees": 0,
                "average_completion_pct": 0,
                "employees_with_overdue_tasks": 0,
                "completed_onboarding": 0,
            },
            "employees": [],
            "cohorts": [],
            "departments": [],
            "probation_reviews": [],
        }

    employee_names = [row.employee for row in schedule_rows if row.employee]
    probation_map = _get_probation_appraisal_map(employee_names)

    employee_rows = []
    for row in schedule_rows:
        employee_rows.append(_build_employee_row(row, probation_map))

    summary = _build_summary(employee_rows)

    return {
        "summary": summary,
        "employees": employee_rows,
        "cohorts": _aggregate(employee_rows, "cohort"),
        "departments": _aggregate(employee_rows, "department"),
        "probation_reviews": _build_probation_rows(employee_rows),
    }


def _get_schedule_rows(employee=None):
    conditions = []
    params = {}

    if employee:
        conditions.append("os.employee = %(employee)s")
        params["employee"] = employee

    where_clause = f"where {' and '.join(conditions)}" if conditions else ""

    return frappe.db.sql(
        f"""
        select
            os.name,
            os.employee,
            os.employee_name,
            os.employee_email,
            os.inform_chosen_staff,
            os.conduct_background_checks_if_applicable,
            os.send_kyc,
            os.send_contract_nda,
            os.create_an_erp_profile,
            os.create_official_company_email_address,
            os.add_to_company_communication_platforms_and_relevant_groups,
            os.arrange_company_transport_registration,
            os.prepare_company_laptop_for_their_use_if_applicable,
            os.send_welcome_email,
            os.send_company_wide_email_intro,
            os.for_interns_send_internship_commencement_form,
            os.internship_commencement,
            os.provide_necessary_stationery_and_equipment,
            os.conduct_in_person_onboarding_meeting,
            os.introduce_new_hire_to_other_members_of_the_organization,
            os.tour_of_office_and_facilities,
            os.lunch_with_new_hire_supervisor_hr_new_hire,
            os.officially_hand_them_over_to_their_supervisor,
            os.formal_supervisory_end_of_probationary_review,
            emp.department,
            emp.designation,
            emp.date_of_joining,
            emp.status as employee_status
        from `tabOnboarding Schedule` os
        left join `tabEmployee` emp on emp.name = os.employee
        {where_clause}
        order by emp.date_of_joining desc, os.employee_name asc
        """,
        params,
        as_dict=True,
    )


def _get_probation_appraisal_map(employee_names):
    if not employee_names:
        return {}

    docs = frappe.get_all(
        "Performance Appraisal",
        filters={
            "employee": ["in", employee_names],
            "evaluation_type": "Probation ( 90 days)",
        },
        fields=["name", "employee", "date"],
        order_by="creation desc",
    )

    latest = {}
    for doc in docs:
        latest.setdefault(doc.employee, doc)

    return latest


def _build_employee_row(row, probation_map):
    start_date = getdate(row.date_of_joining) if row.date_of_joining else None
    today = getdate(nowdate())
    probation_doc = probation_map.get(row.employee)

    task_definitions = list(TASK_DEFINITIONS)
    if _is_intern(row):
        task_definitions.append(INTERN_TASK)

    completed_tasks = 0
    overdue_tasks = []

    for task in task_definitions:
        is_completed = bool(getattr(row, task["field"], 0))
        if is_completed:
            completed_tasks += 1
            continue

        if start_date:
            due_date = getdate(add_days(start_date, task["offset_days"]))
            if due_date < today:
                overdue_tasks.append(task["label"])

    total_tasks = len(task_definitions)
    completion_pct = round((completed_tasks / total_tasks) * 100, 1) if total_tasks else 0
    cohort = start_date.strftime("%B %Y") if start_date else "No Joining Date"
    probation_due = bool(start_date and getdate(add_days(start_date, 90)) <= today)

    return {
        "employee": row.employee,
        "employee_name": row.employee_name or row.employee,
        "department": row.department or "Unassigned",
        "designation": row.designation or "",
        "employee_status": row.employee_status or "",
        "onboarding_schedule": row.name,
        "date_of_joining": str(start_date) if start_date else "",
        "cohort": cohort,
        "completed_tasks": completed_tasks,
        "total_tasks": total_tasks,
        "completion_pct": completion_pct,
        "completed_onboarding": int(completion_pct == 100),
        "overdue_task_count": len(overdue_tasks),
        "overdue_tasks": overdue_tasks,
        "probation_due": probation_due,
        "probation_supervisor_complete": int(
            bool(row.formal_supervisory_end_of_probationary_review)
        ),
        "probation_employee_complete": int(bool(probation_doc)),
        "probation_document": probation_doc.name if probation_doc else None,
        "internship_commencement": row.internship_commencement,
    }


def _build_summary(employee_rows):
    total = len(employee_rows)
    return {
        "total_employees": total,
        "average_completion_pct": round(
            sum(row["completion_pct"] for row in employee_rows) / total, 1
        )
        if total
        else 0,
        "employees_with_overdue_tasks": sum(
            1 for row in employee_rows if row["overdue_task_count"] > 0
        ),
        "completed_onboarding": sum(row["completed_onboarding"] for row in employee_rows),
        "probation_supervisor_completed": sum(
            row["probation_supervisor_complete"] for row in employee_rows if row["probation_due"]
        ),
    }


def _aggregate(employee_rows, key):
    groups = defaultdict(
        lambda: {
            "label": "",
            "employee_count": 0,
            "completed_onboarding": 0,
            "employees_with_overdue_tasks": 0,
            "completion_total": 0,
        }
    )

    for row in employee_rows:
        bucket = groups[row[key]]
        bucket["label"] = row[key]
        bucket["employee_count"] += 1
        bucket["completed_onboarding"] += row["completed_onboarding"]
        bucket["employees_with_overdue_tasks"] += int(row["overdue_task_count"] > 0)
        bucket["completion_total"] += row["completion_pct"]

    aggregated = []
    for label, data in groups.items():
        employee_count = data["employee_count"]
        aggregated.append(
            {
                "label": label,
                "employee_count": employee_count,
                "average_completion_pct": round(data["completion_total"] / employee_count, 1)
                if employee_count
                else 0,
                "completed_onboarding": data["completed_onboarding"],
                "employees_with_overdue_tasks": data["employees_with_overdue_tasks"],
            }
        )

    return sorted(aggregated, key=lambda row: row["label"])


def _build_probation_rows(employee_rows):
    rows = []
    for row in employee_rows:
        rows.append(
            {
                "employee": row["employee"],
                "employee_name": row["employee_name"],
                "department": row["department"],
                "date_of_joining": row["date_of_joining"],
                "probation_due": row["probation_due"],
                "supervisor_completion": bool(row["probation_supervisor_complete"]),
                "employee_completion": bool(row["probation_employee_complete"]),
                "probation_document": row["probation_document"],
            }
        )

    return sorted(rows, key=lambda row: row["employee_name"])


def _is_intern(row):
    designation = (row.designation or "").lower()
    return "intern" in designation or bool(row.internship_commencement)
