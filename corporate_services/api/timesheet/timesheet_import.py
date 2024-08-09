import frappe
import csv
import io
from frappe.utils.file_manager import get_file
from datetime import datetime, timedelta

@frappe.whitelist()
def timesheet_import(docname):
    try:
        doc = frappe.get_doc('Timesheet Submission', docname)
        
        file_url = doc.timesheet
        _file = frappe.get_doc("File", {"file_url": file_url})
        file_content = get_file(_file.file_url)[1]
        
        if not file_content:
            frappe.log_error(f"No content retrieved from file: {file_url}", "timesheet_import")
            return "error"
        
        csvfile = io.StringIO(file_content)
        reader = csv.reader(csvfile)
        header = next(reader)

        existing_projects = {p["project_name"]: p["name"] for p in frappe.get_all("Project", fields=["project_name", "name"])}

        from_time_tracker = {}

        project_timesheets = {}
        activity_timesheets = {}
        non_empty_activities = set()

        current_project = None
        current_activity = None

        for row in reader:
            if not row:
                continue

            if len(row) > 0 and row[0]:
                if row[0] in ['Meetings', 'Proposals', 'Recurring Tasks', 'Other Tasks/Activities', 'Training/Workshops/Connectathons']:
                    current_activity = row[0]
                    current_project = None
                else:
                    current_project = row[0]
                    if current_project not in existing_projects:
                        frappe.log_error(f"Project '{current_project}' does not exist in the system.", "timesheet_import")
                        continue
                    current_activity = "Projects"
                continue

            if any(float(cell) > 0 for cell in row[2:] if cell):
                if current_project:
                    non_empty_activities.add(("project", current_project))
                else:
                    non_empty_activities.add(("activity", current_activity))

        csvfile.seek(0)
        next(reader)

        for row in reader:
            if not row:
                continue

            if len(row) > 0 and row[0]:
                if row[0] in ['Meetings', 'Proposals', 'Recurring Tasks', 'Other Tasks/Activities', 'Training/Workshops/Connectathons']:
                    current_activity = row[0]
                    current_project = None
                else:
                    current_project = row[0]
                    if current_project not in existing_projects:
                        continue
                    current_activity = "Projects"
                continue

            if current_project and ("project", current_project) not in non_empty_activities:
                continue
            if not current_project and ("activity", current_activity) not in non_empty_activities:
                continue

            task = row[1]

            if current_project:
                project_name = existing_projects[current_project]
                
                if project_name not in project_timesheets:
                    project_timesheets[project_name] = create_timesheet(doc, project_name)
                target_timesheet = project_timesheets[project_name]
            else:
                if current_activity not in activity_timesheets:
                    activity_timesheets[current_activity] = create_timesheet(doc, None, current_activity)
                target_timesheet = activity_timesheets[current_activity]

            if len(row) > 1:
                for idx in range(2, len(header)):
                    if idx >= len(row):
                        continue

                    day_str = header[idx]
                    if row[idx]:
                        try:
                            hours = float(row[idx])
                            if hours == 0:
                                continue
                            
                            day = int(day_str)
                            current_year = datetime.now().year
                            month_name = doc.month
                            month = datetime.strptime(month_name, "%B").month

                            start_of_day = f"{current_year}-{month:02d}-{day:02d} 08:00:00"
                            from_time = datetime.strptime(start_of_day, '%Y-%m-%d %H:%M:%S')

                            if day in from_time_tracker:
                                from_time = from_time_tracker[day] + timedelta(minutes=1)

                            to_time = from_time + timedelta(hours=hours)

                            if is_time_overlap(doc.employee, from_time, to_time):
                                frappe.log_error(f"Time entry overlaps with existing timesheet entries: {from_time} - {to_time}", "timesheet_import")
                                continue

                            create_timesheet_detail_entry(target_timesheet, from_time, to_time, current_activity, task, day, hours, current_project)

                            from_time_tracker[day] = to_time
                           
                        except ValueError as e:
                            frappe.log_error(f"Invalid value in row: {row[idx]} - {e}", "timesheet_import")

        save_timesheets(project_timesheets)
        save_timesheets(activity_timesheets)

        return "success"
    
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "timesheet_import")
        return "error"

def create_timesheet(doc, project=None, activity_type=None):
    timesheet = frappe.new_doc("Timesheet")
    timesheet.employee = doc.employee
    timesheet.custom_month = doc.month
    
    if project:
        timesheet.parent_project = project
    if activity_type:
        timesheet.custom_activity_type = activity_type
    timesheet.insert()
    return timesheet

def save_timesheets(timesheets):
    for timesheet in timesheets.values():
        try:
            timesheet.save()
            frappe.db.commit()
        except Exception as e:
            frappe.log_error(f"Error saving timesheet: {str(e)}", "timesheet_import")

def is_time_overlap(employee, from_time, to_time):
    """ Check if the time entry overlaps with existing entries for the employee """
    submissions = frappe.get_all("Timesheet Submission", filters={"employee": employee}, fields=["name"])
    
    for submission in submissions:
        details = frappe.get_all("Timesheet Detail",
            filters={"parent": submission.name,
                     "from_time": ["<=", to_time],
                     "to_time": [">=", from_time]},
            fields=["from_time", "to_time"]
        )
        
        for entry in details:
            if not (to_time <= entry["from_time"] or from_time >= entry["to_time"]):
                return True

    return False

def create_timesheet_detail_entry(timesheet, from_time, to_time, activity_type, task, day, hours, project=None):
    try:
        timesheet_detail = {
            "activity_type": activity_type,
            "hours": hours,
            "custom_date": day,
            "from_time": from_time,
            "to_time": to_time,
        }
        if activity_type == "Projects":
            existing_projects = {p["project_name"]: p["name"] for p in frappe.get_all("Project", fields=["project_name", "name"])}
            project_id = existing_projects[project]
            timesheet_detail["project"] = project_id
            timesheet_detail["custom_tasks"] = task
        elif activity_type == "Meetings":
            timesheet_detail["custom_meetings"] = task
        elif activity_type == "Training/Workshops/Connectathons":
            timesheet_detail["custom_trainingworkshopsconnectathons"] = task
        elif activity_type == "Proposals":
            timesheet_detail["custom_proposals"] = task
        elif activity_type == "Recurring Tasks":
            timesheet_detail["custom_recurring_tasks"] = task
        elif activity_type == "Other Tasks/Activities":
            timesheet_detail["custom_other_tasksactivities"] = task

        timesheet.append("time_logs", timesheet_detail)

    except Exception as e:
        frappe.log_error(f"Error creating timesheet detail entry: {str(e)}", "timesheet_import")
