import frappe
from frappe.model.workflow import apply_workflow

SUBMIT_TO_SUPERVISOR_ACTION = "Submit To supervisor"

RATING_SCORES = {
    "No Rating": 0,
    "Unsatisfactory": 1,
    "Requires Improvement": 2,
    "Satisfactory": 3,
    "Meets Expectations": 4,
    "Outstanding": 5,
}
MAX_PER_AREA = 5

# States from which the appraisal is considered graded (supervisor has submitted)
GRADED_STATES = ("Submitted to HR", "Needs Clarification", "Approved by HR", "Rejected By HR")

# Fallback bands when no template bands are defined (matched by highest min_percentage met)
DEFAULT_BANDS = [
    (93, "Exceptional", "Eligible for promotion and up to 15% salary increase or bonus consideration."),
    (84, "Strong Performer", "Eligible for up to 10% salary increase or bonus; consider for promotion."),
    (75, "Consistently Effective", "Maintain role; encourage continued growth and skill development."),
    (65, "Meets Expectation", "Acceptable performance; recommend moderate support or training."),
    (56, "Below Expectation", "Initiate a 3-month Performance Improvement Plan (PIP)."),
    (47, "Poor", "Issue formal warning; monitor closely for short-term improvement."),
    (0, "Unacceptable", "Consider separation, reassignment, or other disciplinary measures."),
]


def _get_bands(appraisal):
    """Return bands as a list of (min_percentage, rating, recommended_action), highest first."""
    template_name = appraisal.appraisal_template or frappe.db.get_value(
        "Performance Appraisal Template", {"is_active": 1}
    )
    if template_name:
        bands = frappe.get_all(
            "Performance Appraisal Score Band",
            filters={"parent": template_name},
            fields=["min_percentage", "rating", "recommended_action"],
        )
        if bands:
            return sorted(
                [(b.min_percentage, b.rating, b.recommended_action) for b in bands],
                key=lambda b: b[0],
                reverse=True,
            )
    return DEFAULT_BANDS


def grade_appraisal(appraisal):
    """Compute total/percentage and assign a performance band once the supervisor has submitted."""
    rows = appraisal.current_performance or []
    total = sum(RATING_SCORES.get(r.rating, 0) for r in rows)
    max_score = len(rows) * MAX_PER_AREA

    appraisal.total = total
    appraisal.max_score = max_score

    if appraisal.workflow_state not in GRADED_STATES or not max_score:
        appraisal.score_percentage = 0
        appraisal.performance_rating = None
        appraisal.recommended_action = None
        return

    percentage = round(total / max_score * 100, 2)
    appraisal.score_percentage = percentage

    for min_pct, rating, action in _get_bands(appraisal):
        if percentage >= min_pct:
            appraisal.performance_rating = rating
            appraisal.recommended_action = action
            break


def get_active_template():
    name = frappe.db.get_value("Performance Appraisal Template", {"is_active": 1})
    return frappe.get_doc("Performance Appraisal Template", name) if name else None


def create_appraisals_for_cycle(cycle):
    """Create one Performance Appraisal per cycle row and dispatch it to the supervisor."""
    template = (
        frappe.get_doc("Performance Appraisal Template", cycle.template)
        if cycle.template
        else get_active_template()
    )

    created = 0
    for row in cycle.employees:
        if row.appraisal:
            continue

        employee = frappe.get_doc("Employee", row.employee)

        if not employee.reports_to:
            row.status = "Skipped"
            row.remarks = "No supervisor (reports_to) set"
            continue

        appraisal = frappe.get_doc({
            "doctype": "Performance Appraisal",
            "employee": employee.name,
            "evaluation_type": cycle.evaluation_type,
            "appraisal_template": template.name if template else None,
            "from_start_date": cycle.from_start_date,
            "to_end_date": cycle.to_end_date,
            "date": cycle.date,
            "is_supervisor": "Yes" if frappe.db.exists("Employee", {"reports_to": employee.name}) else "No",
        })

        if template:
            for area in template.performance_areas:
                appraisal.append("current_performance", {
                    "performance_area": area.performance_area,
                    "criteria": area.criteria,
                    "rating": "No Rating",
                })
            for scale in template.rating_scale:
                appraisal.append("table_rating_scale", {
                    "score": scale.score,
                    "description": scale.description,
                })
            for comment in template.supervisor_comments:
                appraisal.append("supervisor_comments", {
                    "question": comment.question,
                    "prompt": comment.prompt,
                })

        appraisal.insert(ignore_permissions=True)

        # Move to "Submitted to Supervisor" -> fires alert() email to supervisor (CC employee)
        apply_workflow(appraisal, SUBMIT_TO_SUPERVISOR_ACTION)

        row.appraisal = appraisal.name
        row.status = "Created"
        row.remarks = None
        created += 1

    cycle.db_update_all()
    frappe.msgprint(frappe._("Created and dispatched {0} performance appraisal(s).").format(created))


COMPLETED_STATE = "Approved by HR"


@frappe.whitelist()
def get_appraisal_cycles(only_incomplete=0):
    """Cycle completion overview for the HR dashboard."""
    only_incomplete = int(only_incomplete or 0)

    cycles = frappe.get_all(
        "Performance Appraisal Cycle",
        filters={"docstatus": 1},
        fields=["name", "evaluation_type", "from_start_date", "to_end_date", "date"],
        order_by="creation desc",
    )

    result = []
    for cycle in cycles:
        rows = frappe.get_all(
            "Performance Appraisal Cycle Employee",
            filters={"parent": cycle.name, "appraisal": ["is", "set"]},
            fields=["appraisal"],
        )
        appraisal_names = [r.appraisal for r in rows]

        states = frappe.get_all(
            "Performance Appraisal",
            filters={"name": ["in", appraisal_names]} if appraisal_names else {"name": ""},
            fields=["name", "workflow_state"],
        )

        total = len(states)
        completed = sum(1 for s in states if s.workflow_state == COMPLETED_STATE)
        pending = total - completed
        is_complete = total > 0 and pending == 0

        if only_incomplete and is_complete:
            continue

        result.append({
            **cycle,
            "total": total,
            "completed": completed,
            "pending": pending,
            "status": "Completed" if is_complete else "In Progress",
            "pending_appraisals": [
                {"name": s.name, "workflow_state": s.workflow_state}
                for s in states if s.workflow_state != COMPLETED_STATE
            ],
        })

    return result


@frappe.whitelist()
def get_appraisal_analytics():
    """Aggregates for the dashboard charts (graded appraisals only)."""
    graded = frappe.get_all(
        "Performance Appraisal",
        filters={"performance_rating": ["is", "set"]},
        fields=["performance_rating", "score_percentage", "department"],
    )

    band_order = [b[1] for b in DEFAULT_BANDS]
    dist = {}
    for r in graded:
        dist[r.performance_rating] = dist.get(r.performance_rating, 0) + 1

    # keep canonical band order first, then any custom ratings
    ratings = [b for b in band_order if b in dist] + [b for b in dist if b not in band_order]
    rating_distribution = [{"rating": b, "count": dist[b]} for b in ratings]

    dept = {}
    for r in graded:
        if not r.department:
            continue
        d = dept.setdefault(r.department, {"sum": 0.0, "n": 0})
        d["sum"] += r.score_percentage or 0
        d["n"] += 1
    by_department = sorted(
        [{"department": k, "avg": round(v["sum"] / v["n"], 1)} for k, v in dept.items()],
        key=lambda x: x["avg"],
        reverse=True,
    )

    total_graded = len(graded)
    avg_percentage = round(
        sum(r.score_percentage or 0 for r in graded) / total_graded, 1
    ) if total_graded else 0

    return {
        "total_graded": total_graded,
        "avg_percentage": avg_percentage,
        "rating_distribution": rating_distribution,
        "by_department": by_department,
    }
