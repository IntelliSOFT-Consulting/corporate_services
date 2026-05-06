import frappe
from frappe import _
from frappe.utils import today

from corporate_services.api.notification.staff_requisition.bulk_rejection import (
    send_bulk_rejection_emails,
)


STAGE_APPLICATION_RECEIVED = "APPLICATION RECEIVED"
STAGE_REFERENCE_CHECK = "REFERENCE CHECK"
STAGE_OFFER_PREP = "OFFER_PREP"
STAGE_OFFER_SENT = "OFFER SENT"
STAGE_NEGOTIATION = "NEGOTIATION"
STAGE_OFFER_ACCEPTED = "OFFER ACCEPTED"
STAGE_OFFER_DECLINED = "OFFER DECLINED"
STAGE_CONTRACT_NDA_SIGNING = "CONTRACT/NDA SIGNING"
STAGE_JOB_OFFER_COMPLETE = "JOB OFFER COMPLETE"
STAGE_RECRUITMENT_CLOSED = "RECRUITMENT CLOSED"


POST_OFFER_STAGES = {
    STAGE_OFFER_SENT,
    STAGE_NEGOTIATION,
    STAGE_OFFER_ACCEPTED,
    STAGE_CONTRACT_NDA_SIGNING,
    STAGE_JOB_OFFER_COMPLETE,
    STAGE_RECRUITMENT_CLOSED,
}


@frappe.whitelist()
def validate_job_offer_stage(doc, method=None):
    stage = (doc.get("custom_application_stage") or "").strip()

    if not stage:
        doc.custom_application_stage = STAGE_APPLICATION_RECEIVED
        stage = STAGE_APPLICATION_RECEIVED

    background_required = int(doc.get("custom_mandatory_background_check_required") or 0) == 1
    background_completed = int(doc.get("custom_background_reference_check_completed") or 0) == 1

    if background_required and stage in POST_OFFER_STAGES and not background_completed:
        frappe.throw(
            _(
                "Mandatory background/reference check must be completed before entering post-offer stages."
            )
        )

    if stage in {STAGE_JOB_OFFER_COMPLETE, STAGE_RECRUITMENT_CLOSED}:
        if int(doc.get("custom_contract_signed") or 0) != 1:
            frappe.throw(_("Contract signature must be recorded before completing Job Offer."))

        if int(doc.get("custom_nda_signed") or 0) != 1:
            frappe.throw(_("NDA signature must be recorded before completing Job Offer."))


@frappe.whitelist()
def handle_job_offer_stage_updates(doc, method=None):
    current_stage = (doc.get("custom_application_stage") or "").strip()
    previous_doc = doc.get_doc_before_save()
    previous_stage = (previous_doc.custom_application_stage or "").strip() if previous_doc else ""

    if current_stage == previous_stage:
        return

    if current_stage == STAGE_OFFER_SENT and not doc.get("custom_offer_issued_on"):
        frappe.db.set_value("Job Applicant", doc.name, "custom_offer_issued_on", today())

    if current_stage == STAGE_NEGOTIATION and not doc.get("custom_offer_response_status"):
        frappe.db.set_value("Job Applicant", doc.name, "custom_offer_response_status", "Negotiation")

    if current_stage == STAGE_OFFER_ACCEPTED:
        updates = {
            "custom_offer_response_status": "Accepted",
            "status": "Accepted",
        }
        frappe.db.set_value("Job Applicant", doc.name, updates)

    if current_stage == STAGE_OFFER_DECLINED:
        updates = {
            "custom_offer_response_status": "Declined",
            "status": "Rejected",
        }
        frappe.db.set_value("Job Applicant", doc.name, updates)

    if current_stage == STAGE_RECRUITMENT_CLOSED:
        _close_recruitment_and_trigger_onboarding(doc)


@frappe.whitelist()
def close_recruitment(applicant_name: str):
    doc = frappe.get_doc("Job Applicant", applicant_name)
    _close_recruitment_and_trigger_onboarding(doc)
    return {"success": True, "message": _("Recruitment closed and onboarding kickoff created.")}


def _close_recruitment_and_trigger_onboarding(doc):
    if int(doc.get("custom_contract_signed") or 0) != 1 or int(doc.get("custom_nda_signed") or 0) != 1:
        frappe.throw(_("Contract and NDA must both be signed before closing recruitment."))

    if doc.job_title:
        try:
            send_bulk_rejection_emails(doc.job_title, selected_candidate_name=doc.name)
        except Exception:
            frappe.log_error(frappe.get_traceback(), "Bulk Rejection on Recruitment Close Failed")

        _archive_job_opening(doc.job_title)

    if not doc.get("custom_recruitment_closed_on"):
        frappe.db.set_value("Job Applicant", doc.name, "custom_recruitment_closed_on", today())

    _create_onboarding_kyc_todo(doc)

    frappe.get_doc("Job Applicant", doc.name).add_comment(
        "Comment",
        _(
            "Recruitment closed. Remaining candidates rejection process initiated, role archived, and onboarding KYC kickoff created."
        ),
    )


def _archive_job_opening(job_opening_name: str):
    if not frappe.db.exists("Job Opening", job_opening_name):
        return

    updates = {"status": "Closed"}
    if frappe.db.has_column("Job Opening", "closed_on"):
        updates["closed_on"] = today()

    frappe.db.set_value("Job Opening", job_opening_name, updates)


def _create_onboarding_kyc_todo(doc):
    description = _(
        "Start onboarding immediately for {0}: send standardized KYC form, create ERP profile from KYC, generate downloadable staff report, and update centralized department-wise active staff KYC spreadsheet."
    ).format(doc.applicant_name or doc.name)

    owners = _get_hr_managers() or [frappe.session.user]
    for owner in owners:
        if frappe.db.exists(
            "ToDo",
            {
                "allocated_to": owner,
                "reference_type": "Job Applicant",
                "reference_name": doc.name,
                "status": "Open",
                "description": description,
            },
        ):
            continue

        frappe.get_doc(
            {
                "doctype": "ToDo",
                "allocated_to": owner,
                "description": description,
                "reference_type": "Job Applicant",
                "reference_name": doc.name,
                "priority": "High",
            }
        ).insert(ignore_permissions=True)


def _get_hr_managers():
    users = frappe.get_all(
        "Has Role",
        filters={"role": "HR Manager", "parenttype": "User"},
        pluck="parent",
    )
    return [u for u in users if u and u != "Administrator"]
