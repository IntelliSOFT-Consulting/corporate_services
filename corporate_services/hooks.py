app_name = "corporate_services"
app_title = "ICL Corporate Services"
app_publisher = "IntelliSOFT Consulting"
app_description = "IntelliSOFT Corporate Services ERPNext Customizations"
app_email = "dev@intellisoftkenya.com"
app_license = "mit"
# required_apps = []

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/corporate_services/css/corporate_services.css"
# app_include_js = "/assets/corporate_services/js/corporate_services.js"

# include js, css files in header of web template
# web_include_css = "/assets/corporate_services/css/corporate_services.css"
# web_include_js = "/assets/corporate_services/js/corporate_services.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "corporate_services/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "corporate_services/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "corporate_services.utils.jinja_methods",
# 	"filters": "corporate_services.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "corporate_services.install.before_install"
# after_install = "corporate_services.api.setup_utils.post_install"

# Uninstallation
# ------------

# before_uninstall = "corporate_services.uninstall.before_uninstall"
# after_uninstall = "corporate_services.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "corporate_services.utils.before_app_install"
# after_app_install = "corporate_services.utils.after_app_install"


after_migrate = "corporate_services.api.setup_utils.post_install"


# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "corporate_services.utils.before_app_uninstall"
# after_app_uninstall = "corporate_services.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "corporate_services.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	# "*": {
# 	# 	"on_update": "method",
# 	# 	"on_cancel": "method",
# 	# 	"on_trash": "method"
# 	# },
#     "Employee Grievance":{
#         "on_update": "corporate_services.api.notifications.employee_grievance"
#     },
#     "Travel Request":{
#         "on_update": "corporate_services.api.notifications.alert_supervisor_travel_request"
#     },
#     "Leave Application":{
#         "on_update": "corporate_services.api.notifications.alert_supervisor_leave_application"
#     },
#     "Asset Custodianship Requisition":{
#         "on_update": "corporate_services.api.notifications.alert_supervisor_asset_requisition"
#     },
#     "Work Continuity Plan":{
#         "on_update": "corporate_services.api.notifications.alert_supervisor_work_continuity_plan_submission"
#     }
# }



def generate_doc_events(event_maps):
    doc_events = {}
    for event_type, event_map in event_maps.items():
        for doctype, method in event_map.items():
            if doctype not in doc_events:
                doc_events[doctype] = {}
            doc_events[doctype][event_type] = method
    return doc_events

on_update_map = {
    "Employee Grievance": "corporate_services.api.notification.notifications.employee_grievance",
    
    "Travel Request": "corporate_services.api.notification.travel_request.alert",
        
    "Leave Application": "corporate_services.api.notification.leave_application.alert",
        
    "Work Continuity Plan": "corporate_services.api.notification.work_continuity_plan.alert",
    
    "Asset Custodianship Requisition": "corporate_services.api.notification.asset_custotianship_requisition.alert",
    
    "Asset Requisition": "corporate_services.api.notification.asset_requisition.alert",
    
    
    # timesheet submission
    "Timesheet Submission":"corporate_services.api.notification.timesheet.alert"

}




event_maps = {
    "on_update": on_update_map,
}

doc_events = generate_doc_events(event_maps)



# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"corporate_services.tasks.all"
# 	],
# 	"daily": [
# 		"corporate_services.tasks.daily"
# 	],
# 	"hourly": [
# 		"corporate_services.tasks.hourly"
# 	],
# 	"weekly": [
# 		"corporate_services.tasks.weekly"
# 	],
# 	"monthly": [
# 		"corporate_services.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "corporate_services.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "corporate_services.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "corporate_services.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["corporate_services.utils.before_request"]
# after_request = ["corporate_services.utils.after_request"]

# Job Events
# ----------
# before_job = ["corporate_services.utils.before_job"]
# after_job = ["corporate_services.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"corporate_services.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

fixtures = [
    "Leave Type",
    "Leave Application",
    "Employee Training Feedback Form",
    "Overnight Stay",
    "Workflow",
    "Workflow State",
    "Role",
    "Asset Custodianship Requisition",
    "Asset Requisition - Equipment Description",
    "Asset Movement Item",
    "Asset Movement",
    "Work Continuity Plan",
    "Work Continuity Plan Form",
    "Employee Evaluation",
    "Employee Evaluation Form Characteristics",
    "Report",
    "Navbar Settings",
    "HR Settings",
    "Designation",
    "Department",
    "Client Script",
    "Workflow Action Master",
    "Employee Grievance",
    "Employee List",
    "Employee",
    "Dashboard",
    "Number Card",
    "Letter Head",
    "Workspace"
    # "Notification",
    # "Dashboard Chart",
    # "Dashboard"
]