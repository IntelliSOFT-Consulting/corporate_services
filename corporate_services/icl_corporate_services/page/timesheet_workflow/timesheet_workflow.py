import frappe
from frappe import _
from frappe.utils import today, get_first_day, get_last_day


# ---------------------------------------------------------------------------
# Role context helpers (mirrors the logic in the Script Report)
# ---------------------------------------------------------------------------

def _get_role_context():
    """
    Determine the effective viewing role for the logged-in user.

    Returns a dict:
      role      → "hr_finance" | "supervisor" | "employee"
      employee  → Employee dict (name, employee_name) or None
      reportees → list of Employee dicts who report to this user
    """
    user = frappe.session.user
    roles = frappe.get_roles(user)

    if any(r in roles for r in ["System Manager", "HR Manager", "Finance", "HR User"]):
        return {"role": "hr_finance", "employee": None, "reportees": []}

    employee = frappe.db.get_value(
        "Employee",
        {"user_id": user, "status": "Active"},
        ["name", "employee_name"],
        as_dict=True,
    )
    if not employee:
        return {"role": "employee", "employee": None, "reportees": []}

    reportees = frappe.get_all(
        "Employee",
        filters={"reports_to": employee["name"], "status": "Active"},
        fields=["name", "employee_name", "department", "designation"],
    )
    if reportees:
        return {"role": "supervisor", "employee": employee, "reportees": reportees}

    return {"role": "employee", "employee": employee, "reportees": []}


@frappe.whitelist()
def get_role_context():
    """Return role context so the frontend can adapt its UI."""
    return _get_role_context()


# ---------------------------------------------------------------------------
# Employee directory
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_all_employees():
    """
    Returns active employees scoped to the caller's role:
    - HR / Finance / System Manager → all active employees
    - Supervisor                    → only direct reportees
    - Employee                      → empty (they have no directory)
    """
    ctx = _get_role_context()

    if ctx["role"] == "hr_finance":
        return frappe.get_all(
            "Employee",
            filters={"status": "Active"},
            fields=["name", "employee_name", "department", "designation"],
            order_by="employee_name asc",
        )

    if ctx["role"] == "supervisor":
        return sorted(ctx["reportees"], key=lambda e: e.get("employee_name") or "")

    return []  # Employees don't see a directory


# ---------------------------------------------------------------------------
# Timesheet submissions
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_all_timesheet_submissions(month_year=None):
    """
    Return Timesheet Submissions scoped to the caller's role.
    Optional month_year filter in MM-YYYY format.
    """
    ctx = _get_role_context()
    fields = [
        "name", "employee", "employee_name", "month_year",
        "total_working_hours", "status", "workflow_state", "creation",
    ]

    if ctx["role"] == "hr_finance":
        filters = {"docstatus": ["!=", 2]}
        if month_year:
            filters["month_year"] = month_year
        return frappe.get_all(
            "Timesheet Submission",
            filters=filters,
            fields=fields,
            order_by="creation desc",
        )

    if ctx["role"] == "supervisor":
        allowed = [ctx["employee"]["name"]] + [r["name"] for r in ctx["reportees"]]
        params = list(allowed)
        month_cond = ""
        if month_year:
            month_cond = " AND month_year = %s"
            params.append(month_year)
        placeholders = ", ".join(["%s"] * len(allowed))
        return frappe.db.sql(
            f"""
            SELECT name, employee, employee_name, month_year,
                   total_working_hours, status, workflow_state, creation
            FROM `tabTimesheet Submission`
            WHERE docstatus != 2
              AND employee IN ({placeholders})
              {month_cond}
            ORDER BY creation DESC
            """,
            params,
            as_dict=True,
        )

    if ctx["role"] == "employee" and ctx.get("employee"):
        filters = {"docstatus": ["!=", 2], "employee": ctx["employee"]["name"]}
        if month_year:
            filters["month_year"] = month_year
        return frappe.get_all(
            "Timesheet Submission",
            filters=filters,
            fields=fields,
            order_by="creation desc",
        )

    return []


@frappe.whitelist()
def get_timesheet_submissions_by_employee(employee_name, month_year=None):
    """
    Return Timesheet Submissions for a specific employee, with access control.
    employee_name may be an Employee ID (EMP-0001) or the human-readable name.
    """
    ctx = _get_role_context()

    # Resolve to an Employee ID
    emp_doc = (
        frappe.db.get_value("Employee", {"name": employee_name}, ["name", "employee_name"], as_dict=True)
        or frappe.db.get_value("Employee", {"employee_name": employee_name}, ["name", "employee_name"], as_dict=True)
    )
    emp_id = emp_doc["name"] if emp_doc else None

    # Access control
    if ctx["role"] == "employee":
        if not ctx.get("employee") or ctx["employee"]["name"] != emp_id:
            frappe.throw(_("Not permitted"), frappe.PermissionError)

    elif ctx["role"] == "supervisor":
        allowed = {ctx["employee"]["name"]} | {r["name"] for r in ctx["reportees"]}
        if emp_id not in allowed:
            frappe.throw(_("Not permitted"), frappe.PermissionError)

    # HR / Finance: no restriction

    filters = {"docstatus": ["!=", 2]}
    if emp_id:
        filters["employee"] = emp_id
    else:
        filters["employee_name"] = employee_name

    if month_year:
        filters["month_year"] = month_year

    return frappe.get_all(
        "Timesheet Submission",
        filters=filters,
        fields=[
            "name", "employee", "employee_name", "month_year",
            "total_working_hours", "status", "workflow_state", "creation",
        ],
        order_by="creation desc",
    )


@frappe.whitelist()
def get_not_submitted_employees(month_year):
    """
    Return active employees in the caller's scope who have NOT submitted
    a timesheet for the given month_year.
    - Supervisor → only their direct reportees
    - HR / Finance → all active employees
    - Employee → not allowed
    """
    ctx = _get_role_context()
    if ctx["role"] == "employee":
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    submitted_ids = set(
        frappe.db.sql_list(
            "SELECT employee FROM `tabTimesheet Submission` WHERE month_year = %s AND docstatus != 2",
            month_year,
        )
    )

    if ctx["role"] == "supervisor":
        candidates = ctx["reportees"]
    else:
        candidates = frappe.get_all(
            "Employee",
            filters={"status": "Active"},
            fields=["name", "employee_name", "department", "designation"],
        )

    return [emp for emp in candidates if emp["name"] not in submitted_ids]


# ---------------------------------------------------------------------------
# Submission details (unchanged logic, kept as-is)
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_timesheet_submission_details(submission_name):
    """
    Get detailed breakdown of a specific timesheet submission.
    Access-controlled: employees can only see their own.
    """
    ctx = _get_role_context()
    submission = frappe.get_doc("Timesheet Submission", submission_name)

    # Access control
    if ctx["role"] == "employee":
        if not ctx.get("employee") or ctx["employee"]["name"] != submission.employee:
            frappe.throw(_("Not permitted"), frappe.PermissionError)
    elif ctx["role"] == "supervisor":
        allowed = {ctx["employee"]["name"]} | {r["name"] for r in ctx["reportees"]}
        if submission.employee not in allowed:
            frappe.throw(_("Not permitted"), frappe.PermissionError)

    if not getattr(submission, "timesheet_per_project", None):
        return {
            "submission": {
                "name": submission.name,
                "employee": submission.employee,
                "employee_name": submission.employee_name,
                "month_year": submission.month_year,
                "total_working_hours": submission.total_working_hours or 0,
                "status": submission.status,
                "workflow_state": submission.workflow_state,
                "creation": submission.creation,
            },
            "projects": [],
            "tasks": [],
            "timesheets": [],
            "total_entries": 0,
        }

    timesheets = []
    projects = {}
    tasks = {}
    timesheet_names = {row.get("timesheet") for row in submission.timesheet_per_project if row.get("timesheet")}

    for timesheet_name in timesheet_names:
        try:
            timesheet_doc = frappe.get_doc("Timesheet", timesheet_name)
            if hasattr(timesheet_doc, "time_logs") and timesheet_doc.time_logs:
                for time_log in timesheet_doc.time_logs:
                    ts_entry = {
                        "parent": timesheet_name,
                        "date": time_log.get("custom_date"),
                        "hours": time_log.get("hours") or 0,
                        "activity_type": time_log.get("activity_type"),
                        "project": time_log.get("project"),
                        "task": time_log.get("custom_tasks"),
                    }
                    timesheets.append(ts_entry)

                    project = time_log.get("project") or "No Project"
                    projects.setdefault(project, {"project": project, "hours": 0, "tasks": set(), "entries": 0})
                    projects[project]["hours"] += time_log.get("hours") or 0
                    if time_log.get("custom_tasks"):
                        projects[project]["tasks"].add(time_log.get("custom_tasks"))
                    projects[project]["entries"] += 1

                    task = time_log.get("custom_tasks") or "No Task"
                    task_key = f"{task}|{project}"
                    tasks.setdefault(task_key, {"task": task, "project": project, "hours": 0, "entries": 0})
                    tasks[task_key]["hours"] += time_log.get("hours") or 0
                    tasks[task_key]["entries"] += 1
        except Exception as exc:
            frappe.log_error(f"Error fetching timesheet {timesheet_name}: {exc}")

    project_list = sorted(
        [{"project": k, "hours": v["hours"], "task_count": len(v["tasks"]), "entries": v["entries"]}
         for k, v in projects.items()],
        key=lambda x: x["hours"],
        reverse=True,
    )

    return {
        "submission": {
            "name": submission.name,
            "employee": submission.employee,
            "employee_name": submission.employee_name,
            "month_year": submission.month_year,
            "total_working_hours": submission.total_working_hours or 0,
            "status": submission.status,
            "workflow_state": submission.workflow_state,
            "creation": submission.creation,
        },
        "projects": project_list,
        "tasks": sorted(tasks.values(), key=lambda x: x["hours"], reverse=True),
        "timesheets": timesheets,
        "total_entries": len(timesheets),
    }


# ---------------------------------------------------------------------------
# Salary slip helper (unchanged)
# ---------------------------------------------------------------------------

@frappe.whitelist()
def create_salary_slip_from_timesheet(submission_name, employee):
    try:
        submission = frappe.get_doc("Timesheet Submission", submission_name)

        if submission.status != "Approved":
            frappe.throw(_("Only approved timesheet submissions can be used to create salary slips"))

        existing_slip = frappe.db.exists(
            "Salary Slip",
            {"custom_timesheet_submission": submission_name, "docstatus": ["<", 2]},
        )
        if existing_slip:
            frappe.throw(
                _("A Salary Slip already exists for this submission: {0}").format(existing_slip)
            )

        employee_doc = frappe.get_doc("Employee", employee)

        try:
            from dateutil import parser
            month_date = parser.parse(submission.month_year)
            start_date = get_first_day(month_date)
            end_date = get_last_day(month_date)
        except Exception:
            start_date = get_first_day(today())
            end_date = get_last_day(today())

        return {
            "employee": employee,
            "employee_name": employee_doc.employee_name,
            "company": employee_doc.company,
            "posting_date": today(),
            "start_date": start_date,
            "end_date": end_date,
            "salary_slip_based_on_timesheet": 1,
            "custom_timesheet_submission": submission_name,
            "custom_total_working_hours": submission.total_working_hours,
            "custom_month_year": submission.month_year,
        }

    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), _("Prepare Salary Slip Data Error"))
        frappe.throw(_("Error: {0}").format(str(exc)))


# ---------------------------------------------------------------------------
# Legacy stubs (kept for any lingering references)
# ---------------------------------------------------------------------------

@frappe.whitelist()
def say_hello():
    return {"message": "Hello from the backend!"}


@frappe.whitelist()
def get_current_employee():
    user = frappe.session.user
    employee = frappe.db.get_value(
        "Employee", {"user_id": user}, ["name", "employee_name"], as_dict=True
    )
    if employee:
        return employee
    full_name = frappe.db.get_value("User", user, "full_name")
    return {"name": user, "employee_name": full_name or user}
