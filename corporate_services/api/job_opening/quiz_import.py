# Copyright (c) 2026, IntelliSOFT Consulting and contributors

import frappe

from corporate_services.icl_corporate_services.doctype.quiz.quiz import (
    _get_file_rows,
    _upsert_question,
    download_quiz_import_template,
)


def _build_quiz_title(job_opening, label):
    base_title = (job_opening.job_title or job_opening.name or "Job Opening").strip()
    suffix = frappe.generate_hash(length=8).upper()
    return f"{base_title} - {label} - {suffix}"


def _create_quiz_from_file(job_opening, file_url, label):
    rows = _get_file_rows(file_url)
    if not rows:
        frappe.throw(f"No rows were found in the uploaded {label.lower()} file.")

    created_count = 0
    updated_count = 0
    skipped_count = 0
    linked_count = 0
    linked_questions = set()
    question_links = []

    for row in rows:
        question_doc, action = _upsert_question(row)

        if question_doc.name not in linked_questions:
            question_links.append(
                {
                    "question": question_doc.name,
                    "question_text": question_doc.question,
                }
            )
            linked_questions.add(question_doc.name)
            linked_count += 1

        if action == "created":
            created_count += 1
        elif action == "updated":
            updated_count += 1
        else:
            skipped_count += 1

    if not question_links:
        frappe.throw(f"No valid questions were found in the uploaded {label.lower()} file.")

    quiz = frappe.get_doc(
        {
            "doctype": "Quiz",
            "quiz_title": _build_quiz_title(job_opening, label),
            "description": f"Auto-generated from Job Opening {job_opening.name} ({label})",
            "status": "Active",
            "passing_score_": 70,
            "questions": question_links,
        }
    )
    quiz.insert()

    return {
        "name": quiz.name,
        "created_count": created_count,
        "updated_count": updated_count,
        "skipped_count": skipped_count,
        "linked_count": linked_count,
    }


@frappe.whitelist()
def download_job_opening_quiz_template(file_type="xlsx"):
    return download_quiz_import_template(file_type=file_type)


@frappe.whitelist()
def import_job_opening_requirement_quizzes(
    docname,
    minimum_requirements_file_url=None,
    preferred_profile_file_url=None,
):
    if not minimum_requirements_file_url and not preferred_profile_file_url:
        frappe.throw("Please upload at least one sheet.")

    job_opening = frappe.get_doc("Job Opening", docname)
    job_opening.check_permission("write")

    minimum_summary = None
    preferred_summary = None

    if minimum_requirements_file_url:
        minimum_summary = _create_quiz_from_file(
            job_opening,
            minimum_requirements_file_url,
            "Minimum Requirements",
        )
        job_opening.db_set("custom_minimum_requirement_quiz", minimum_summary["name"])

    if preferred_profile_file_url:
        preferred_summary = _create_quiz_from_file(
            job_opening,
            preferred_profile_file_url,
            "Preferred Profile",
        )
        job_opening.db_set("custom_preferred_profile", preferred_summary["name"])

    frappe.db.commit()

    return {
        "job_opening": job_opening.name,
        "minimum_quiz": minimum_summary,
        "preferred_quiz": preferred_summary,
    }
