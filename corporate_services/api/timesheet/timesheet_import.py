import frappe
import csv
import io
import os
import tempfile
from frappe.utils.file_manager import get_file
from datetime import datetime, timedelta
from frappe import _
import openpyxl

def get_activity_field_mapping():
    """
    Dynamically generate activity field mapping based on custom fields 
    associated with Timesheet doctype.
    """
    try:
        custom_fields = frappe.get_all('Custom Field', 
            filters={
                'dt': 'Timesheet', 
                'fieldname': ['like', 'custom_%']
            }, 
            fields=['fieldname', 'label']
        )
        
        activity_field_mapping = {}
        
        activity_types = frappe.get_all('Activity Type', fields=['name'])
        
        for activity_type in activity_types:
            name = activity_type['name']
            matching_field = None
            for field in custom_fields:
                if (name.lower() in field['label'].lower() or 
                    name.lower() in field['fieldname'].lower()):
                    matching_field = field['fieldname']
                    break
            
            if matching_field:
                activity_field_mapping[name] = matching_field
            else:
                activity_field_mapping[name] = None
        
        return activity_field_mapping
    except Exception as e:
        frappe.log_error(f"Error in get_activity_field_mapping: {str(e)}")
        return {}

def calculate_total_hours(project_timesheets, activity_timesheets):
    """Calculate total hours from project and activity timesheets."""
    total_hours = 0
    for timesheet in list(project_timesheets.values()) + list(activity_timesheets.values()):
        for time_log in timesheet.time_logs:
            total_hours += time_log.hours
    return total_hours

def create_timesheet(doc, project=None, activity_type=None, month_name=None, total_hours=0):
    """Create a new timesheet document."""
    timesheet = frappe.new_doc("Timesheet")
    timesheet.employee = doc.employee
    timesheet.custom_month = month_name
    timesheet.total_working_hours = total_hours
    timesheet.custom_timesheet_submission = doc.name
    
    if project:
        timesheet.parent_project = project
        timesheet.custom_timesheet_type = "Project Based"
    if activity_type:
        timesheet.custom_activity_type = activity_type
        timesheet.custom_timesheet_type = "Other Activities"
    
    return timesheet

def is_time_overlap(employee, from_time, to_time):
    """Check if the time entry overlaps with existing entries for the employee."""
    try:
        submissions = frappe.get_all("Timesheet Submission", 
            filters={"employee": employee}, 
            fields=["name"]
        )
        
        for submission in submissions:
            details = frappe.get_all("Timesheet Detail",
                filters={
                    "parent": submission.name,
                    "from_time": ["<=", to_time],
                    "to_time": [">=", from_time]
                },
                fields=["from_time", "to_time"]
            )
            
            for entry in details:
                if not (to_time <= entry["from_time"] or from_time >= entry["to_time"]):
                    return True
        
        return False
    except Exception as e:
        frappe.log_error(f"Error checking time overlap: {str(e)}")
        return False

def create_timesheet_detail_entry(timesheet, from_time, to_time, activity_type, task, day, hours, project=None, activity_field_mapping=None):
    """Create a timesheet detail entry."""
    try:
        timesheet_detail = {
            "activity_type": activity_type,
            "hours": hours,
            "custom_date": day,
            "from_time": from_time,
            "to_time": to_time,
            "is_billable": 1,
        }
        
        if project:
            existing_projects = {p["project_name"]: p["name"] for p in frappe.get_all("Project", fields=["project_name", "name"])}
            project_id = existing_projects.get(project)
            timesheet_detail["project"] = project_id
            timesheet_detail["custom_tasks"] = task
        else:
            field_name = activity_field_mapping.get(activity_type, None)
            if field_name:
                timesheet_detail[field_name] = hours

            timesheet_detail["custom_tasks"] = task
        
        timesheet.append("time_logs", timesheet_detail)
        
    except Exception as e:
        frappe.log_error(f"Error creating timesheet detail entry: {str(e)}")

def save_timesheets(timesheets):
    """Save timesheets with time logs."""
    for timesheet in timesheets.values():
        try:
            if timesheet.time_logs:
                timesheet.insert()
                timesheet.save()
                frappe.db.commit()
            else:
                frappe.log_error(f"Timesheet for {timesheet.employee} has no time logs. Skipping.", "timesheet_import")
        except Exception as e:
            frappe.log_error(f"Error saving timesheet: {str(e)}", "timesheet_import")

@frappe.whitelist()
def timesheet_import(docname):
    """Imports timesheet data from a file."""
    try:
        doc = frappe.get_doc('Timesheet Submission', docname)
        employee = doc.employee
        
        file_url = doc.timesheet
        _file = frappe.get_doc("File", {"file_url": file_url})
        
        if _file.file_url:
            file_content = get_file(_file.file_url)[1]
        else:
            frappe.throw(_("File URL is missing. Please upload the file again."))
        
        if not file_content:
            frappe.log_error(f"No content retrieved from file: {file_url}", "timesheet_import")
            return "error"
        
        file_extension = _file.file_name.split('.')[-1].lower()
        data = None
        if file_extension == 'csv':
            csvfile = io.StringIO(file_content.decode('utf-8') if isinstance(file_content, bytes) else file_content)
            reader = csv.reader(csvfile)
            data = list(reader)
        elif file_extension in ['xls', 'xlsx']:
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_extension}") as temp_file:
                temp_file.write(file_content)
                temp_file_path = temp_file.name

            try:
                workbook = openpyxl.load_workbook(temp_file_path, data_only=True)
                sheet = workbook.active
                data = [[cell.value for cell in row] for row in sheet.iter_rows()]
            finally:
                os.unlink(temp_file_path) 
        else:
            frappe.throw(_("Unsupported file format. Please upload a CSV or Excel file."))
        
        if not data:
            frappe.throw(_("No data found in the uploaded file."))

        header = data[1]
        
        # Find the index of "Total Hours" column to exclude it
        total_hours_col_index = None
        for idx, col_name in enumerate(header):
            if col_name and str(col_name).strip().lower() == "total hours":
                total_hours_col_index = idx
                break
        
        existing_projects = {p["project_name"]: p["name"] for p in frappe.get_all("Project", fields=["project_name", "name"])}
        activity_types = frappe.get_all('Activity Type', fields=['name'])
        
        activity_field_mapping = get_activity_field_mapping()

        from_time_tracker = {}
        project_timesheets = {}
        activity_timesheets = {}
        non_empty_activities = set()

        minimum_hours = frappe.db.get_value('Employee', employee, 'custom_hrs_per_month')
        
        # Filter out any row that has 'TOTAL' or 'TOTAL HRS' in the first column
        filtered_data = [row for row in data[2:] if row and row[0] not in ['TOTAL', 'TOTAL HRS']]
        
        # First pass to identify non-empty activities/projects
        for row in filtered_data:
            if not row or len(row) < 2:
                continue

            activity_type = row[0]
            if activity_type in [activity['name'] for activity in activity_types]:
                current_activity = activity_type
                current_project = None
                continue
            elif activity_type in existing_projects:
                current_project = activity_type
                current_activity = "Projects"
                continue

            # Check cells but exclude Total Hours column
            for idx, cell in enumerate(row[2:], start=2):
                # Skip the Total Hours column
                if total_hours_col_index is not None and idx == total_hours_col_index:
                    continue
                    
                if cell and str(cell).strip() and (not isinstance(cell, str) or cell.lower() != 'total'):
                    try:
                        if float(cell) > 0:
                            if current_project:
                                non_empty_activities.add(("project", current_project))
                            else:
                                non_empty_activities.add(("activity", current_activity))
                            break
                    except (ValueError, TypeError):
                        continue

        # Second pass to process data
        for row in filtered_data:
            if not row or len(row) < 2:
                continue

            activity_type = row[0]
            if activity_type in [activity['name'] for activity in activity_types]:
                current_activity = activity_type
                current_project = None
                continue
            elif activity_type in existing_projects:
                current_project = activity_type
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
                    project_timesheets[project_name] = create_timesheet(doc, project=project_name, month_name=doc.month_year)
                target_timesheet = project_timesheets[project_name]
            else:
                if current_activity not in activity_timesheets:
                    activity_timesheets[current_activity] = create_timesheet(doc, activity_type=current_activity, month_name=doc.month_year)
                target_timesheet = activity_timesheets[current_activity]

            if len(row) > 1:
                for idx in range(2, len(header)):
                    if total_hours_col_index is not None and idx == total_hours_col_index:
                        continue
                        
                    if idx >= len(row) or not row[idx]:
                        continue

                    day_str = header[idx]
                    
                    if day_str and str(day_str).strip().lower() == "total hours":
                        continue
                    
                    try:
                        hours = float(row[idx])
                        if hours == 0:
                            continue

                        day = int(day_str)
                        date_str = doc.month_year
                        month = int(date_str.split('-')[0])
                        year = int(date_str.split('-')[1])

                        if day >= 28:
                            month -= 1
                            if month == 0:
                                month = 12
                                year -= 1

                        month_name = datetime(year, month, 1).strftime('%B')
                        month = datetime.strptime(month_name, "%B").month

                        start_of_day = f"{year}-{month:02d}-{day:02d} 08:00:00"
                        from_time = datetime.strptime(start_of_day, '%Y-%m-%d %H:%M:%S')

                        if day in from_time_tracker:
                            from_time = from_time_tracker[day] + timedelta(minutes=1)

                        to_time = from_time + timedelta(hours=hours)

                        if is_time_overlap(doc.employee, from_time, to_time):
                            frappe.log_error(f"Time entry overlaps with existing timesheet entries: {from_time} - {to_time}", "timesheet_import")
                            continue

                        create_timesheet_detail_entry(
                            target_timesheet, 
                            from_time, 
                            to_time, 
                            current_activity, 
                            task, 
                            day, 
                            hours, 
                            current_project, 
                            activity_field_mapping
                        )
                        from_time_tracker[day] = to_time
                       
                    except ValueError as e:
                        continue

        total_hours = calculate_total_hours(project_timesheets, activity_timesheets)

        if total_hours < minimum_hours:
            frappe.throw(_("Total hours are less than {} minimum hours.".format(minimum_hours)))

        if total_hours >= minimum_hours:
            save_timesheets(project_timesheets)
            save_timesheets(activity_timesheets)
            
            return {"status": "success", "total_hours": total_hours}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "timesheet_import")
        return "error"
    