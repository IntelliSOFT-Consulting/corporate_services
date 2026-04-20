import frappe
from frappe import _
from frappe.utils import getdate

EXCLUDED_EMPLOYMENT_TYPES = ("Consultant", "Intern")


def _exclusion_clause():
    return "({})".format(", ".join(f"'{t}'" for t in EXCLUDED_EMPLOYMENT_TYPES))


@frappe.whitelist()
def get_turnover_stats(year=None):
    if not year:
        year = getdate().year
    year = int(year)

    start = f"{year}-01-01"
    end = f"{year}-12-31"
    excl = _exclusion_clause()

    # Employees who left during the year (permanent staff only)
    left_result = frappe.db.sql(
        f"""
        SELECT COUNT(*) as cnt
        FROM `tabEmployee`
        WHERE status = 'Left'
          AND relieving_date >= %(start)s
          AND relieving_date <= %(end)s
          AND (employment_type IS NULL OR employment_type NOT IN {excl})
          AND docstatus < 2
        """,
        {"start": start, "end": end},
        as_dict=True,
    )
    employees_left = (left_result[0].cnt if left_result else 0) or 0

    # Headcount on Jan 1 of year (active on first day)
    hs_result = frappe.db.sql(
        f"""
        SELECT COUNT(*) as cnt
        FROM `tabEmployee`
        WHERE date_of_joining <= %(start)s
          AND (relieving_date IS NULL OR relieving_date >= %(start)s)
          AND (employment_type IS NULL OR employment_type NOT IN {excl})
          AND docstatus < 2
        """,
        {"start": start},
        as_dict=True,
    )
    headcount_start = (hs_result[0].cnt if hs_result else 0) or 0

    # Headcount on Dec 31 of year (active on last day)
    he_result = frappe.db.sql(
        f"""
        SELECT COUNT(*) as cnt
        FROM `tabEmployee`
        WHERE date_of_joining <= %(end)s
          AND (relieving_date IS NULL OR relieving_date >= %(end)s)
          AND (employment_type IS NULL OR employment_type NOT IN {excl})
          AND docstatus < 2
        """,
        {"end": end},
        as_dict=True,
    )
    headcount_end = (he_result[0].cnt if he_result else 0) or 0

    avg_headcount = (headcount_start + headcount_end) / 2.0 if (headcount_start + headcount_end) > 0 else 0
    turnover_rate = round((employees_left / avg_headcount) * 100, 2) if avg_headcount > 0 else 0.0

    # Monthly exits breakdown
    monthly = frappe.db.sql(
        f"""
        SELECT MONTH(relieving_date) as month, COUNT(*) as cnt
        FROM `tabEmployee`
        WHERE status = 'Left'
          AND relieving_date >= %(start)s
          AND relieving_date <= %(end)s
          AND (employment_type IS NULL OR employment_type NOT IN {excl})
          AND docstatus < 2
        GROUP BY MONTH(relieving_date)
        ORDER BY MONTH(relieving_date)
        """,
        {"start": start, "end": end},
        as_dict=True,
    )

    # Available years (earliest relieving_date to current year)
    year_range = frappe.db.sql(
        f"""
        SELECT MIN(YEAR(relieving_date)) as min_year
        FROM `tabEmployee`
        WHERE relieving_date IS NOT NULL
          AND (employment_type IS NULL OR employment_type NOT IN {excl})
          AND docstatus < 2
        """,
        as_dict=True,
    )
    min_year = (year_range[0].min_year or year) if year_range else year
    current_year = getdate().year
    available_years = list(range(current_year, int(min_year) - 1, -1))

    return {
        "year": year,
        "employees_left": employees_left,
        "headcount_start": headcount_start,
        "headcount_end": headcount_end,
        "avg_headcount": round(avg_headcount, 1),
        "turnover_rate": turnover_rate,
        "monthly_breakdown": monthly,
        "available_years": available_years,
    }


@frappe.whitelist()
def get_employee_exits(year=None, page=1, page_size=20, search=""):
    if not year:
        year = getdate().year
    year = int(year)
    page = int(page)
    page_size = int(page_size)
    offset = (page - 1) * page_size

    start = f"{year}-01-01"
    end = f"{year}-12-31"
    excl = _exclusion_clause()

    search_args = {"start": start, "end": end}
    search_clause = ""
    if search:
        search_clause = """
          AND (e.name LIKE %(search)s
            OR e.employee_name LIKE %(search)s
            OR e.department LIKE %(search)s
            OR e.designation LIKE %(search)s)
        """
        search_args["search"] = f"%{search}%"

    base_where = f"""
        e.status = 'Left'
        AND e.relieving_date >= %(start)s
        AND e.relieving_date <= %(end)s
        AND (e.employment_type IS NULL OR e.employment_type NOT IN {excl})
        AND e.docstatus < 2
        {search_clause}
    """

    total_result = frappe.db.sql(
        f"""
        SELECT COUNT(DISTINCT e.name) as cnt
        FROM `tabEmployee` e
        WHERE {base_where}
        """,
        search_args,
        as_dict=True,
    )
    total = (total_result[0].cnt if total_result else 0) or 0

    rows = frappe.db.sql(
        f"""
        SELECT
            e.name,
            e.employee_name,
            e.department,
            e.designation,
            e.date_of_joining,
            e.relieving_date,
            e.employment_type,
            ei.name            AS exit_interview,
            ei.status          AS interview_status,
            ei.employee_status AS interview_decision,
            ei.date            AS interview_date
        FROM `tabEmployee` e
        LEFT JOIN `tabExit Interview` ei
            ON ei.name = (
                SELECT name FROM `tabExit Interview`
                WHERE employee = e.name
                  AND docstatus != 2
                ORDER BY creation DESC
                LIMIT 1
            )
        WHERE {base_where}
        ORDER BY e.relieving_date DESC
        LIMIT {page_size} OFFSET {offset}
        """,
        search_args,
        as_dict=True,
    )

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "exits": rows,
    }


@frappe.whitelist()
def get_exit_detail(employee):
    emp = frappe.db.get_value(
        "Employee",
        employee,
        [
            "name", "employee_name", "department", "designation",
            "date_of_joining", "relieving_date", "employment_type",
            "company", "reports_to", "cell_number",
            "personal_email", "company_email", "gender", "status",
        ],
        as_dict=True,
    )

    if not emp:
        frappe.throw(_("Employee not found"))

    ei = frappe.db.get_value(
        "Exit Interview",
        {"employee": employee, "docstatus": ["!=", 2]},
        [
            "name", "status", "date", "employee_status",
            "interview_summary", "relieving_date",
        ],
        as_dict=True,
        order_by="creation desc",
    )

    return {
        "employee": emp,
        "exit_interview": ei,
    }
