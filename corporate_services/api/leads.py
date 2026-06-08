import frappe


@frappe.whitelist()
def get_lead_detail(name):
    """Return a single Lead with its linked Opportunities and Projects.

    Opportunities link to a Lead via opportunity_from='Lead' and party_name=<lead>.
    Projects link to an Opportunity via the custom_bid field.
    Permission-aware: the lead read check plus get_list role permissions apply.
    """
    doc = frappe.get_doc("Lead", name)
    doc.check_permission("read")
    lead = doc.as_dict()

    opportunities = frappe.get_list(
        "Opportunity",
        filters={"opportunity_from": "Lead", "party_name": name},
        fields=[
            "name", "title", "status", "sales_stage", "workflow_state",
            "opportunity_amount", "currency", "expected_closing",
            "opportunity_owner", "transaction_date",
        ],
        order_by="transaction_date desc",
        ignore_permissions=False,
    )

    opp_names = [o["name"] for o in opportunities]
    projects = []
    if opp_names:
        projects = frappe.get_list(
            "Project",
            filters={"custom_bid": ["in", opp_names]},
            fields=[
                "name", "project_name", "status", "percent_complete",
                "expected_start_date", "expected_end_date", "custom_bid",
            ],
            order_by="modified desc",
            ignore_permissions=False,
        )

    return {
        "lead": lead,
        "opportunities": opportunities,
        "projects": projects,
    }
