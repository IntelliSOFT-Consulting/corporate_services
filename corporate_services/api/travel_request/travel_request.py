import frappe

@frappe.whitelist()
def get_per_diem_rates(place):
    if not frappe.has_permission("Per Diem Rates", "read"):
        frappe.throw("You do not have permission to access this resource.")
    
    return frappe.get_all("Per Diem Rates", 
                      filters={"place_of_travel": place}, 
                      fields=["place_of_travel", "accommodation_max", "accommodation_min", 
                              "meal_incidentals_expenses_max", "meal_incidentals_expenses_min"])

@frappe.whitelist()
def get_local_per_diem_rates(place):
    if not frappe.has_permission("Local Per Diem Rates", "read"):
        frappe.throw("You do not have permission to access this resource.")
    place = (place or "").strip()
    if not place:
        return []

    # Prefer exact docname match (Link field stores record name).
    if frappe.db.exists("Local Per Diem Rates", place):
        row = frappe.get_doc("Local Per Diem Rates", place)
        return [{
            "from": row.get("from"),
            "destination": row.get("destination"),
            "province": row.get("province"),
            "travel_region": row.get("travel_region"),
            "transport_means_of_travel": row.get("transport_means_of_travel"),
            "fares": row.get("fares"),
            "accommodation_min": row.get("accommodation_min"),
            "accommodation_max": row.get("accommodation_max"),
            "meals_incidentals_min": row.get("meals_incidentals_min"),
            "meals__incidentals__max": row.get("meals__incidentals__max"),
        }]

    # Fallback for legacy names: exact destination text match.
    rows = frappe.get_all(
        "Local Per Diem Rates",
        filters={"destination": place},
        fields=[
            "from",
            "destination",
            "province",
            "travel_region",
            "transport_means_of_travel",
            "fares",
            "accommodation_min",
            "accommodation_max",
            "meals_incidentals_min",
            "meals__incidentals__max",
        ],
        limit_page_length=1,
    )
    return [{
        "from": r.get("from"),
        "destination": r.get("destination"),
        "province": r.get("province"),
        "travel_region": r.get("travel_region"),
        "transport_means_of_travel": r.get("transport_means_of_travel"),
        "fares": r.get("fares"),
        "accommodation_min": r.get("accommodation_min"),
        "accommodation_max": r.get("accommodation_max"),
        "meals_incidentals_min": r.get("meals_incidentals_min"),
        "meals__incidentals__max": r.get("meals__incidentals__max"),
    } for r in rows]

@frappe.whitelist()
def get_travel_request_costs(travel_request):
    if not frappe.has_permission("Travel Request", "read"):
        frappe.throw("You do not have permission to access this resource.")

    # Fetch main travel request fields
    travel_request_data = frappe.get_all("Travel Request", 
                                         filters={"name": travel_request}, 
                                         fields=["name", "employee", "purpose_of_travel", "custom_expected_support"])

    # Fetch child table data
    child_table_data = frappe.get_all("Travel Request Activity Participants", 
                                      filters={"parent": travel_request, "parenttype": "Travel Request"},
                                      fields=["units", "pax", "rate", "total"])

    return {
        "travel_request_data": travel_request_data,
        "custom_activity_participants_table": child_table_data
    }
