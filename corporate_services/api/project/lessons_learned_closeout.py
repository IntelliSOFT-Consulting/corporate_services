import frappe
from frappe.utils import get_url_to_form

CLOSEOUT_STAGES = {"closeout", "close-out", "closure", "project close", "project closeout"}


def notify_on_closeout(doc, method=None):
    previous = doc.get_doc_before_save()
    if not previous:
        return

    prev_stage = _stage(previous)
    curr_stage = _stage(doc)

    if prev_stage == curr_stage:
        return
    if curr_stage not in CLOSEOUT_STAGES:
        return

    # Check whether a lessons learned report already exists for this project
    existing = frappe.db.exists(
        "Project Management Lessons Learned",
        {"project": doc.name},
    )
    if existing:
        return

    _send_closeout_prompt(doc)


def _stage(doc):
    val = getattr(doc, "status", None) or ""
    return val.strip().lower()


def _send_closeout_prompt(doc):
    pm_emails = _get_pm_emails(doc.name)
    if not pm_emails:
        return

    form_url = get_url_to_form("Project Management Lessons Learned", "new-project-management-lessons-learned-1")
    project_title = doc.project_name or doc.name

    subject = f'Action Required: Submit Lessons Learned for "{project_title}"'
    message = f"""
        Dear Project Manager,<br><br>
        The project <b>{project_title}</b> has entered the <b>Closeout</b> phase.<br><br>
        Please complete and submit the <b>Lessons Learned Report</b> to document key findings,
        root causes, recommendations, and next steps for future reference.<br><br>
        <a href="{form_url}" style="background:#00529B;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;">
          Start Lessons Learned Report
        </a><br><br>
        Regards,<br>
        Project Management Office
    """
    frappe.sendmail(recipients=pm_emails, subject=subject, message=message)


def _get_pm_emails(project_name):
    pms = frappe.db.get_all(
        "Project Manager",
        filters={"parent": project_name},
        fields=["employee"],
    )
    emails = []
    for pm in pms:
        if not pm.get("employee"):
            continue
        data = frappe.db.get_value(
            "Employee",
            pm["employee"],
            ["company_email", "personal_email"],
            as_dict=True,
        )
        if data:
            email = data.get("company_email") or data.get("personal_email")
            if email:
                emails.append(email)
    return emails
