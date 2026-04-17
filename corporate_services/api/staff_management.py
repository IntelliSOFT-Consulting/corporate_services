import frappe
from frappe import _
from frappe.utils import today, get_first_day, getdate, add_months


@frappe.whitelist()
def get_staff_stats():
    today_date = today()
    first_day = str(get_first_day(today_date))

    total_active = frappe.db.count(
        "Employee", {"status": "Active", "docstatus": ["<", 2]}
    )

    new_this_month = frappe.db.count(
        "Employee",
        {
            "status": "Active",
            "date_of_joining": ["between", [first_day, today_date]],
            "docstatus": ["<", 2],
        },
    )

    on_leave_result = frappe.db.sql(
        """
        SELECT COUNT(DISTINCT employee) AS cnt
        FROM `tabLeave Application`
        WHERE status = 'Approved'
          AND docstatus = 1
          AND from_date <= %(today)s
          AND to_date >= %(today)s
        """,
        {"today": today_date},
        as_dict=True,
    )
    on_leave_today = (on_leave_result[0].cnt if on_leave_result else 0) or 0

    dept_counts = frappe.db.sql(
        """
        SELECT COALESCE(department, 'Unassigned') AS department, COUNT(*) AS cnt
        FROM `tabEmployee`
        WHERE status = 'Active' AND docstatus < 2
        GROUP BY department
        ORDER BY cnt DESC
        """,
        as_dict=True,
    )

    type_counts = frappe.db.sql(
        """
        SELECT COALESCE(employment_type, 'Unspecified') AS employment_type, COUNT(*) AS cnt
        FROM `tabEmployee`
        WHERE status = 'Active' AND docstatus < 2
        GROUP BY employment_type
        ORDER BY cnt DESC
        """,
        as_dict=True,
    )

    dept_count = frappe.db.count(
        "Department", {"is_group": 0}
    )

    return {
        "total_active": total_active,
        "new_this_month": new_this_month,
        "on_leave_today": on_leave_today,
        "dept_count": dept_count,
        "department_breakdown": dept_counts,
        "employment_type_breakdown": type_counts,
    }


@frappe.whitelist()
def get_employees(page=1, page_size=20, search="", department="", employment_type=""):
    page = int(page)
    page_size = int(page_size)
    offset = (page - 1) * page_size

    conditions = "e.status = 'Active' AND e.docstatus < 2"
    args = {}

    if search:
        conditions += """
          AND (e.name LIKE %(search)s
            OR e.employee_name LIKE %(search)s
            OR e.designation LIKE %(search)s
            OR e.department LIKE %(search)s)
        """
        args["search"] = f"%{search}%"

    if department:
        conditions += " AND e.department = %(department)s"
        args["department"] = department

    if employment_type:
        conditions += " AND e.employment_type = %(employment_type)s"
        args["employment_type"] = employment_type

    total_result = frappe.db.sql(
        f"SELECT COUNT(*) AS cnt FROM `tabEmployee` e WHERE {conditions}",
        args,
        as_dict=True,
    )
    total = (total_result[0].cnt if total_result else 0) or 0

    employees = frappe.db.sql(
        f"""
        SELECT e.name, e.employee_name, e.department, e.designation,
               e.employment_type, e.date_of_joining, e.status,
               e.company_email, e.cell_number, e.image, e.reports_to, e.gender
        FROM `tabEmployee` e
        WHERE {conditions}
        ORDER BY e.employee_name ASC
        LIMIT {page_size} OFFSET {offset}
        """,
        args,
        as_dict=True,
    )

    return {
        "total": total,
        "employees": employees,
        "page": page,
        "page_size": page_size,
    }


@frappe.whitelist()
def get_employees_on_leave(date=None):
    check_date = date or today()

    rows = frappe.db.sql(
        """
        SELECT la.employee, la.employee_name, la.leave_type,
               la.from_date, la.to_date, la.total_leave_days,
               e.department, e.designation
        FROM `tabLeave Application` la
        JOIN `tabEmployee` e ON e.name = la.employee
        WHERE la.status = 'Approved'
          AND la.docstatus = 1
          AND la.from_date <= %(date)s
          AND la.to_date >= %(date)s
        ORDER BY la.employee_name ASC
        """,
        {"date": check_date},
        as_dict=True,
    )
    return rows


@frappe.whitelist()
def get_employee_profile(employee):
    emp = frappe.db.get_value(
        "Employee",
        employee,
        [
            "name", "employee_name", "department", "designation",
            "employment_type", "date_of_joining", "status", "company",
            "reports_to", "cell_number", "personal_email", "company_email",
            "gender", "date_of_birth", "image", "notice_number_of_days",
        ],
        as_dict=True,
    )

    if not emp:
        frappe.throw(_("Employee not found"))

    # Recent approved leaves (last 6 months)
    six_months_ago = str(add_months(getdate(), -6))
    recent_leaves = frappe.db.sql(
        """
        SELECT leave_type, from_date, to_date, total_leave_days, status
        FROM `tabLeave Application`
        WHERE employee = %(employee)s
          AND docstatus = 1
          AND status = 'Approved'
          AND from_date >= %(since)s
        ORDER BY from_date DESC
        LIMIT 10
        """,
        {"employee": employee, "since": six_months_ago},
        as_dict=True,
    )

    # Current leave allocations with used days and balance
    today_date = today()
    allocations = frappe.db.sql(
        """
        SELECT
            la.leave_type,
            la.total_leaves_allocated,
            la.carry_forwarded_leaves_count,
            la.from_date,
            la.to_date,
            COALESCE((
                SELECT SUM(lapp.total_leave_days)
                FROM `tabLeave Application` lapp
                WHERE lapp.employee = la.employee
                  AND lapp.leave_type = la.leave_type
                  AND lapp.docstatus = 1
                  AND lapp.status = 'Approved'
                  AND lapp.from_date >= la.from_date
                  AND lapp.to_date <= la.to_date
            ), 0) AS leaves_taken
        FROM `tabLeave Allocation` la
        WHERE la.employee = %(employee)s
          AND la.docstatus = 1
          AND la.from_date <= %(today)s
          AND la.to_date >= %(today)s
        ORDER BY la.leave_type ASC
        """,
        {"employee": employee, "today": today_date},
        as_dict=True,
    )
    # Compute balance on each row
    for row in allocations:
        row["balance"] = (row["total_leaves_allocated"] or 0) - (row["leaves_taken"] or 0)

    # Travel requests (last 12 months)
    one_year_ago = str(add_months(getdate(), -12))
    travel_requests = frappe.db.sql(
        """
        SELECT name, travel_type, purpose_of_travel, workflow_state,
               custom_travel_date, custom_local_travel,
               custom_duty_station, custom_local_place_of_travel,
               custom_place_of_travel_per_diem, creation
        FROM `tabTravel Request`
        WHERE employee = %(employee)s
          AND docstatus != 2
          AND (custom_travel_date >= %(since)s OR custom_travel_date IS NULL)
        ORDER BY creation DESC
        LIMIT 15
        """,
        {"employee": employee, "since": one_year_ago},
        as_dict=True,
    )

    # Travel request reconciliations
    travel_reconciliations = frappe.db.sql(
        """
        SELECT name, travel_request, trip_dates_from, trip_datesto,
               total_advance, total_spent, total_balance,
               currency, docstatus, creation
        FROM `tabTravel Request Reconciliation`
        WHERE employee = %(employee)s
          AND docstatus != 2
        ORDER BY creation DESC
        LIMIT 10
        """,
        {"employee": employee},
        as_dict=True,
    )

    # Leave applications (last 12 months — all statuses for visibility)
    leave_applications = frappe.db.sql(
        """
        SELECT name, leave_type, from_date, to_date,
               total_leave_days, status, description
        FROM `tabLeave Application`
        WHERE employee = %(employee)s
          AND docstatus != 2
          AND from_date >= %(since)s
        ORDER BY from_date DESC
        LIMIT 20
        """,
        {"employee": employee, "since": one_year_ago},
        as_dict=True,
    )

    # Asset requisitions
    asset_requisitions = frappe.db.sql(
        """
        SELECT name, requisition_date, urgency
        FROM `tabAsset Requisition`
        WHERE requested_by = %(employee)s
        ORDER BY requisition_date DESC
        LIMIT 10
        """,
        {"employee": employee},
        as_dict=True,
    )

    # Timesheet submissions
    timesheet_submissions = frappe.db.sql(
        """
        SELECT name, employee, employee_name, month_year,
               total_working_hours, status, workflow_state, creation
        FROM `tabTimesheet Submission`
        WHERE employee = %(employee)s
          AND docstatus != 2
        ORDER BY creation DESC
        LIMIT 24
        """,
        {"employee": employee},
        as_dict=True,
    )

    return {
        "employee": emp,
        "recent_leaves": recent_leaves,
        "leave_allocations": allocations,
        "travel_requests": travel_requests,
        "travel_reconciliations": travel_reconciliations,
        "leave_applications": leave_applications,
        "asset_requisitions": asset_requisitions,
        "timesheet_submissions": timesheet_submissions,
    }
