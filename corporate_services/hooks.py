app_name = "corporate_services"
app_title = "ICL Corporate Services"
app_publisher = "IntelliSOFT Consulting"
app_description = "IntelliSOFT Corporate Services ERPNext Customizations"
app_email = "bamolo@intellisoftkenya.com"
app_license = "mit"
# required_apps = []

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = ["/assets/corporate_services/css/modern_ui_theme.css"]
app_include_css = [
    "/assets/corporate_services/css/survey_manager.css"
]
# app_include_js = [
#     "/assets/corporate_services/js/custom.js",
#     "/assets/corporate_services/js/theme.js"
# ]
# # Website context - override home page
# website_context = {
#     "custom_theme_enabled": True
# }

# # Override home page template
# website_route_rules = [
#     {"from_route": "/", "to_route": "/welcome"},
#     {"from_route": "/app/home", "to_route": "/welcome"},
#     {"from_route": "/desk", "to_route": "/welcome"},
# ]
# home_page = "welcome"

# include js in page
page_js = {
    "timesheet-workflow": "public/js/timesheet_workflow.js",
    # Desk React page for managing surveys (loaded on /app/survey-manager)
    "survey-manager": "public/js/survey_admin.js",
    # Desk React page for the opportunity module (loaded on /app/icl-opportunity-module)
    "icl-opportunity-module": "public/js/opportunity_module.js",
    # Desk React page for the project module (loaded on /app/icl-project-module)
    "icl-project-module": "public/js/project_module.js",
}

# Custom Pages
page = [
    "corporate_services.icl_corporate_services.page.timesheet_workflow.timesheet_workflow"
]



# after_login = "your_app_name.auth.after_login"

# # Boot session - add custom settings
# boot_session = "corporate_services.boot.boot_session"

# app_include_js = "/assets/corporate_services/js/corporate_services.js"
# app_include_js ="/assets/corporate_services/js/workflow_confirmation.js"

# include js, css files in header of web template
# web_include_css = "/assets/corporate_services/css/corporate_services.css"
web_include_js = [
    # React public survey page bundle (built to public/js)
    "/assets/corporate_services/js/survey_public.js",
]

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "corporate_services/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

doctype_js = {
    "Job Opening": "public/js/job_opening.js",
}
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

before_migrate = [
    "corporate_services.api.setup_utils.before_migrate_cleanup"
]

after_migrate = [
    "corporate_services.api.setup_utils.post_install"
]


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
    "Travel Request": "corporate_services.api.notification.travel_request.travel_request.alert",
    "Travel Request Reconciliation": "corporate_services.api.notification.travel_request.travel_request_reconciliation.alert",
    "Leave Application": "corporate_services.api.notification.leave_application.alert",
    "Work Continuity Plan": "corporate_services.api.notification.work_continuity_plan.alert",
    "Asset Custodianship Requisition": "corporate_services.api.notification.asset_custotianship_requisition.alert",
    "Asset Requisition": "corporate_services.api.notification.asset_requisition.alert",
    "Timesheet Submission":"corporate_services.api.timesheet.finance_timesheet_submission.finance_timesheet_submission",
    "Project":"corporate_services.api.notification.project.project_manager.alert",
    "Employee Grievance":"corporate_services.api.notification.grievance.grievance.alert",
    "Supplier Quote Submission": "corporate_services.api.supplier.vat_calc.calc",
    "Asset Damage Loss Theft Report Form": "corporate_services.api.notification.assets.loss_damage_loss_report.alert",
    "Chart of Accounts Utilities": "corporate_services.api.import_coa.import_accounts_v2",
    "Opportunity": "corporate_services.api.notification.project.opportunity.alert",
    "General Requisition Form": "corporate_services.api.notification.requisition.general_requisition.alert",
    "Appraisal": "corporate_services.api.notification.appraisal.appraisal.alert",
    "Asset Movement": "corporate_services.api.notification.assets.asset_handover.alert",
    "Task":"corporate_services.api.notification.project.project_task.task_on_update",
    "Supplier Quote Submission":"corporate_services.api.supplier.finance_alert.alert",
    "Staff Requisition":"corporate_services.api.notification.staff_requisition.staff_requisition.alert",
    "Consultant Time Off Application":"corporate_services.api.notification.consultant_time_off.time_off_application.alert",
    # "Job Applicant": "corporate_services.api.job_applicant.v2.application_received",
    "Monthly Reflection":"corporate_services.api.notification.monthly_reflection.monthly_reflection.alert",
    "Exit Interview":"corporate_services.api.notification.exit_interview.exit_interview.alert",
    # "Supplier Quote Submission": [
    #     "corporate_services.api.supplier.finance_alert.alert",
    #     "corporate_services.api.supplier.vat_calc.calc"
    # ]
}

job_applicant_on_update_map = {
    "Job Applicant": [
        "corporate_services.api.job_applicant.v2.application_received",
        "corporate_services.api.notification.job_applicant.rejection_after_interview.alert"
    ]
}

timesheet_notifications ={
    "Timesheet Submission":"corporate_services.api.notification.timesheet.alert",
}

before_workflow_action_map = {
    "Timesheet Submission":"corporate_services.api.timesheet.before_workflow_action.before_workflow_action_timesheet_submission",
} 

event_maps = {
    "on_update": {
        **on_update_map,
        **before_workflow_action_map,
        **timesheet_notifications,
        "Timesheet Submission": [
            on_update_map["Timesheet Submission"],
            before_workflow_action_map["Timesheet Submission"],
            timesheet_notifications["Timesheet Submission"]
        ],
        **job_applicant_on_update_map
    },
    # "onload": {
    #     "Project": "corporate_services.api.project.payment_entry.fetch_payments"
    # },
    "after_insert": {
        "Opportunity": "corporate_services.api.project.opportunity_handlers.create_folder_for_opportunity",
        "Survey Response": "corporate_services.api.survey.on_survey_response_insert",
    },
    "on_trash": {
        "Survey Response": "corporate_services.api.survey.on_survey_response_delete",
    },
    "before_save": {
        "Opportunity": "corporate_services.api.project.opportunity_handlers.save_bid_document_to_opportunity_folder"
    },
   "before_delete": {
        "Timesheet Submission": "corporate_services.api.timesheet.overrides.timesheet_submission.prevent_default_delete",
        "Timesheet": "corporate_services.api.timesheet.overrides.timesheet_submission.prevent_timesheet_delete_if_linked",
    },
    "validate": {
        "Timesheet Submission": "corporate_services.api.timesheet.overrides.timesheet_submission.override_link_validation",
        "Timesheet": "corporate_services.api.timesheet.overrides.timesheet_submission.override_link_validation"
    },
}



doc_events = generate_doc_events(event_maps)



# Scheduled Tasks
# ---------------



scheduler_events = {
	# "all": [
	# 	"corporate_services.tasks.all"
	# ],
	"daily": [
		# "corporate_services.tasks.daily"
        "corporate_services.api.notification.project.scheduled_tasks.send_deliverable_notifications",
        "corporate_services.api.notification.onboarding.onboarding_.send_30day_onboarding_surveys",
        "corporate_services.api.quarterly_leave.quarterly_leave.send_quarterly_notifications",
        "corporate_services.api.notification.monthly_reflection.monthly_reflection.send_monthly_reflection_reminder_if_due",
        "corporate_services.api.notification.monthly_reflection.monthly_reflection.send_monthly_reflection_overdue_reminders_if_due",
        # "corporate_services.api.notification.onboarding.onboarding_notifications.send_policy_comprehension_quiz"
	],
	# "hourly": [
	# 	"corporate_services.tasks.hourly"
	# ],
	# "weekly": [
	# 	"corporate_services.tasks.weekly"
	# ],
	"monthly": [
		"corporate_services.api.leave.update_annual_leave_allocations.process_leave_allocations"
		# "corporate_services.api.leave.update_annual_leave_allocations.update_annual_leave_allocations"
	],
    "cron": {
        "0 8,10,12,14,16,17 * * *": [
            "corporate_services.api.notification.staff_requisition.staff_requisition.send_approval_overdue_reminders"
        ]
    }
}

# Testing
# -------

# before_tests = "corporate_services.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# # 	"frappe.desk.doctype.event.event.get_events": "corporate_services.event.get_events"
#  "frappe.core.doctype.user.user.switch_theme": "corporate_services.overrides.switch_theme.switch_theme"
# }

#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps

override_doctype_dashboards = {
    "Timesheet Submission": "corporate_services.api.timesheet.overrides.timesheet_submission.override_dashboard_data",
    "Timesheet": "corporate_services.api.timesheet.overrides.timesheet_submission.override_dashboard_data"
}

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
    "Workflow",
    "Workflow State",
    "Workflow Action Master",
    "Role",
	"Role Profile",
    "Report",
    "Navbar Settings",
    "HR Settings",
    "Designation",
    "Client Script",
    "Server Script",
    "Number Card",
    "Letter Head",
    "Workspace",
    "Web Page",
    "Web Form",
    "Print Format",
    "Email Template",
    # "Dashboard Chart",
    # "Notification",
    # "Dashboard",
    # "Website Settings",
    "Website Theme",
    "Portal Settings",
    "Performance Score Bands",
    "Performance Appraisal Rating scale",
    "Custom HTML Block",
    "KPI Template Instructions",
    "Custom DocPerm",
]
