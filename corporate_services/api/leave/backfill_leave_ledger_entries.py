import re

import frappe
from frappe.utils import getdate
from hrms.hr.doctype.leave_ledger_entry.leave_ledger_entry import create_leave_ledger_entry

MARKER_RE = re.compile(r"\[AUTO_LEAVE_ACCRUAL:(\d{4}-\d{2})\] Added ([\d.]+) leave day\(s\)\.")


def _get_accrual_markers(allocation_name):
    """Return (period_key, leave_days, comment_date) tuples, oldest first, for the
    monthly accrual markers written by update_annual_leave_allocations()."""
    comments = frappe.get_all(
        "Comment",
        filters={
            "reference_doctype": "Leave Allocation",
            "reference_name": allocation_name,
            "content": ["like", "%[AUTO_LEAVE_ACCRUAL:%"],
        },
        fields=["content", "creation"],
        order_by="creation asc",
    )

    markers = []
    for comment in comments:
        match = MARKER_RE.search(comment.content or "")
        if match:
            period_key, leave_days = match.groups()
            markers.append((period_key, float(leave_days), getdate(comment.creation)))
    return markers


@frappe.whitelist()
def backfill_missing_leave_ledger_entries(dry_run=1):
    """
    One-off repair for allocations updated by the old buggy update_annual_leave_allocations()
    code, which used db_update() and skipped Leave Ledger Entry creation.

    For each Leave Allocation carrying an AUTO_LEAVE_ACCRUAL marker, matches markers against
    existing (non carry-forward) Leave Ledger Entries by leaves amount + month. Any marker
    with no matching entry gets a catch-up Leave Ledger Entry created, dated to when the
    marker was originally recorded.
    """
    frappe.only_for("System Manager")
    dry_run = int(dry_run)
    allocation_names = frappe.get_all(
        "Comment",
        filters={
            "reference_doctype": "Leave Allocation",
            "content": ["like", "%[AUTO_LEAVE_ACCRUAL:%"],
        },
        pluck="reference_name",
        distinct=True,
    )

    report = []

    for allocation_name in allocation_names:
        allocation_doc = frappe.get_doc("Leave Allocation", allocation_name)
        if allocation_doc.docstatus != 1:
            continue

        markers = _get_accrual_markers(allocation_name)
        if not markers:
            continue

        existing_entries = frappe.get_all(
            "Leave Ledger Entry",
            filters={
                "transaction_type": "Leave Allocation",
                "transaction_name": allocation_name,
                "is_carry_forward": 0,
                "docstatus": 1,
            },
            fields=["name", "leaves", "from_date"],
        )
        # pool of entries not yet matched to a marker
        available = list(existing_entries)

        for period_key, leave_days, marker_date in markers:
            match = next(
                (
                    e
                    for e in available
                    if abs(e.leaves - leave_days) < 1e-6
                    and getdate(e.from_date).year == marker_date.year
                    and getdate(e.from_date).month == marker_date.month
                ),
                None,
            )
            if match:
                available.remove(match)
                continue

            # no ledger entry found for this month's accrual -> missing, needs backfill
            report.append(
                {
                    "allocation": allocation_name,
                    "employee": allocation_doc.employee,
                    "period": period_key,
                    "leave_days": leave_days,
                }
            )

            if not dry_run:
                create_leave_ledger_entry(
                    allocation_doc,
                    dict(
                        leaves=leave_days,
                        from_date=marker_date,
                        to_date=allocation_doc.to_date,
                        is_carry_forward=0,
                    ),
                    submit=True,
                )

    if not dry_run:
        frappe.db.commit()

    return {
        "dry_run": bool(dry_run),
        "missing_count": len(report),
        "details": report,
    }
