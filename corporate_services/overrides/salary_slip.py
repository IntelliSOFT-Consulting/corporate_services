import frappe
from hrms.payroll.doctype.salary_slip.salary_slip import SalarySlip as HRMSSalarySlip


class CorporateServicesSalarySlip(HRMSSalarySlip):
    def get_emp_and_working_day_details(self):
        try:
            return super().get_emp_and_working_day_details()
        except ImportError as exc:
            message = str(exc)
            if "process_loan_interest_accrual_for_term_loans" not in message:
                raise

            # HRMS currently imports a Lending symbol that is not present in the
            # installed lending app version. Swallow that specific failure so
            # salary slip creation can proceed for the timesheet workflow.
            frappe.log_error(
                frappe.get_traceback(),
                "Salary Slip loan accrual compatibility shim",
            )
            return
