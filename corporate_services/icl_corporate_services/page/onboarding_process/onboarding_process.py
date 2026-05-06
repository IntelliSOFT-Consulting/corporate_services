import frappe
from frappe.utils import add_months, getdate, nowdate


@frappe.whitelist()
def get_page_data():
    today = getdate(nowdate())
    three_months_ago = add_months(today, -3)

    new_employees = frappe.db.sql(
        """
        select
            emp.name,
            emp.employee_name,
            emp.department,
            emp.designation,
            emp.date_of_joining,
            emp.status,
            os.name as onboarding_schedule
        from `tabEmployee` emp
        left join `tabOnboarding Schedule` os on os.employee = emp.name
        where emp.date_of_joining >= %(from_date)s
        order by emp.date_of_joining desc
        """,
        {"from_date": str(three_months_ago)},
        as_dict=True,
    )

    employee_names = [e.name for e in new_employees]

    surveys = []
    if employee_names:
        surveys = frappe.get_all(
            "New Hire Feedback Survey 30-Day",
            filters={"employee": ["in", employee_names]},
            fields=["name", "employee", "employee_name", "date_of_joining", "status"],
            order_by="creation desc",
        )

    onboarding_schedules = []
    if employee_names:
        onboarding_schedules = frappe.db.sql(
            """
            select
                os.name,
                os.employee,
                os.employee_name,
                emp.department,
                emp.date_of_joining,
                os.internship_commencement,
                os.for_interns_send_internship_commencement_form,
                os.`30_day_feedback_survey` as thirty_day_feedback_survey,
                os.formal_supervisory_end_of_probationary_review
            from `tabOnboarding Schedule` os
            left join `tabEmployee` emp on emp.name = os.employee
            where os.employee in %(employees)s
            order by emp.date_of_joining desc
            """,
            {"employees": employee_names},
            as_dict=True,
        )

    internship_commencements = [
        {
            "employee": row.employee,
            "employee_name": row.employee_name,
            "department": row.department,
            "date_of_joining": str(row.date_of_joining) if row.date_of_joining else "",
            "internship_commencement": row.internship_commencement,
            "form_sent": bool(row.for_interns_send_internship_commencement_form),
            "onboarding_schedule": row.name,
        }
        for row in onboarding_schedules
        if row.internship_commencement or row.for_interns_send_internship_commencement_form
    ]

    return {
        "new_employees": [
            {
                "employee": e.name,
                "employee_name": e.employee_name,
                "department": e.department or "",
                "designation": e.designation or "",
                "date_of_joining": str(e.date_of_joining) if e.date_of_joining else "",
                "status": e.status or "",
                "onboarding_schedule": e.onboarding_schedule or "",
            }
            for e in new_employees
        ],
        "surveys": [
            {
                "name": s.name,
                "employee": s.employee,
                "employee_name": s.employee_name,
                "date_of_joining": str(s.date_of_joining) if s.date_of_joining else "",
                "status": s.status or "",
            }
            for s in surveys
        ],
        "onboarding_schedules": [
            {
                "name": row.name,
                "employee": row.employee,
                "employee_name": row.employee_name,
                "department": row.department or "",
                "date_of_joining": str(row.date_of_joining) if row.date_of_joining else "",
                "survey_sent": bool(row.thirty_day_feedback_survey),
                "probation_review": bool(row.formal_supervisory_end_of_probationary_review),
            }
            for row in onboarding_schedules
        ],
        "internship_commencements": internship_commencements,
    }
