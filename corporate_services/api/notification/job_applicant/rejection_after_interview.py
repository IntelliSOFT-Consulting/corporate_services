import frappe
from frappe.utils import get_fullname
from frappe import _
from corporate_services.api.notification.dispatch_log import on_transition, filter_recipients

DEFAULT_EMAIL_TEMPLATE = "Rejection After Interview"


def _render_template(doc, signature_name=None):
    """
    Fetches the 'Rejection After Interview' Email Template and renders it
    using Jinja with context variables matching the template placeholders.

    Falls back to a hardcoded message if the template does not exist.
    """
    candidate_name = doc.applicant_name
    role_title     = doc.custom_role or ""
    company_name   = frappe.defaults.get_global_default("company") or ""
    sig_name       = signature_name or get_fullname(frappe.session.user)

    context = {
        "candidate_name": candidate_name,
        "role_title":     role_title,
        "company_name":   company_name,
        "signature_name": sig_name,
    }

    # --- Try ERPNext Email Template first ---
    if frappe.db.exists("Email Template", DEFAULT_EMAIL_TEMPLATE):
        template = frappe.get_doc("Email Template", DEFAULT_EMAIL_TEMPLATE)

        raw_subject = template.subject or ""
        raw_body    = template.response_html or template.response or ""

        subject = frappe.render_template(raw_subject, context)
        message = frappe.render_template(raw_body, context)

        frappe.logger().info(
            "Rejection email: using Email Template '{}'".format(DEFAULT_EMAIL_TEMPLATE)
        )
        return subject, message

    # --- Fallback: hardcoded subject + body ---
    frappe.logger().info(
        "Rejection email: template '{}' not found, using hardcoded fallback.".format(DEFAULT_EMAIL_TEMPLATE)
    )

    subject = "Application Outcome - {} at {}".format(role_title, company_name)
    message = """
        <div class="py-4">
          <div class="row justify-content-center">
            <div class="col-12 col-md-8">
              <p>Dear {candidate_name},</p>
              <p>
                Thank you for taking the time to interview for the role of
                <strong>{role_title}</strong> at <strong>{company_name}</strong>.
              </p>
              <p>
                After careful consideration, we will not be progressing with your application
                at this time. This decision was difficult given the high quality of candidates.
              </p>
              <p>
                We appreciate your interest in {company_name} and encourage you to apply
                for future opportunities.
              </p>
              <p class="mb-0">Kind regards,</p>
              <p class="mb-0"><strong>{signature_name}</strong></p>
              <p class="mb-0">Human Resources</p>
              <p>{company_name}</p>
            </div>
          </div>
        </div>
    """.format(**context)

    return subject, message



def _send_email(recipients, subject, message):
    frappe.sendmail(
        recipients=recipients,
        subject=subject,
        message=message,
        now=True,
    )


def _log_communication(doc, candidate_email, subject, message):
    try:
        comm = frappe.get_doc({
            "doctype":            "Communication",
            "communication_type": "Communication",
            "communication_medium": "Email",
            "sent_or_received":   "Sent",
            "subject":            subject,
            "content":            message,
            "sender":             frappe.session.user,
            "recipients":         candidate_email,
            "reference_doctype":  doc.doctype,
            "reference_name":     doc.name,
            "status":             "Linked",
        })
        comm.insert(ignore_permissions=True)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Rejection Email - Communication Log Failed")



@frappe.whitelist()
def send_rejection_email(applicant_name, signature_name=None):
    try:
        doc = frappe.get_doc("Job Applicant", applicant_name)

        candidate_email = doc.email_id
        if not candidate_email:
            frappe.throw(_("No email address found for applicant {0}".format(doc.applicant_name)))

        subject, message = _render_template(doc, signature_name)

        _send_email(
            recipients=[candidate_email],
            subject=subject,
            message=message,
        )

        _log_communication(doc, candidate_email, subject, message)

        frappe.logger().info(
            "Rejection email sent to {} <{}>".format(doc.applicant_name, candidate_email)
        )

        return {"status": "success", "message": _("Rejection email sent to {0}".format(doc.applicant_name))}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Rejection After Interview Email Failed")
        return {"status": "error", "message": str(e)}


def alert(doc, method):
    """
    Automatically sends rejection email when a Job Applicant workflow
    state changes to "Rejected After Interview".
    """
    if not on_transition(doc):
        return

    if doc.workflow_state != "Rejected After Interview":
        return

    candidate_email = doc.email_id
    if not candidate_email:
        frappe.log_error(
            "No email found for applicant: {}".format(doc.applicant_name),
            "Rejection After Interview - Missing Email"
        )
        return

    subject, message = _render_template(doc)

    _recips = filter_recipients(doc, [candidate_email])
    if not _recips:
        return

    _send_email(
        recipients=_recips,
        subject=subject,
        message=message,
    )

    _log_communication(doc, candidate_email, subject, message)
