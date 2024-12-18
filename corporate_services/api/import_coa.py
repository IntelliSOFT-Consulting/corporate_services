import frappe
import pandas as pd
import csv
from typing import List, Dict, Any

root_accounts = [ "Assets", "Liabilities", "Equity", "Income", "Expenses" ]

def create_root_accounts(root_accounts):
    try:
        company = frappe.get_list("Company")
        company = company[0]['name']
        for account in root_accounts:
            create_account_sql(account, company, is_group=1)
    except Exception as e:
        print(e)

def delete_all_accounts():
    try:
        # Fetch all Account records
        accounts = frappe.get_list("Account", fields=["name"])
        
        if not accounts:
            print("No accounts found to delete.")
            return

        # Loop through the accounts and delete each one
        for account in accounts:
            account_name = account.get("name")
            if account_name:
                try:
                    frappe.delete_doc("Account", account_name, force=1)
                    print(f"Deleted account: {account_name}")
                except Exception as e:
                    frappe.log_error(f"Error while deleting accounts: {str(e)}", "Delete All Accounts Error")
                    print(f"An error occurred: {str(e)}")
        frappe.db.commit()
        print("All accounts deleted successfully.")
    except Exception as e:
        frappe.log_error(f"Error while deleting accounts: {str(e)}", "Delete All Accounts Error")
        print(f"An error occurred: {str(e)}")



def import_accounts_v2(doc, method=None):
    """
    Import accounts from a spreadsheet into ERPNext
    
    :param file_path: Path to the CSV or Excel file containing account data
    :param company: Name of the company to import accounts for
    """
    
    # if doc.coa_template_file and doc.import_on_save:
    if doc.coa_template_file:      
        file_doc = frappe.get_list("File", filters={
            'attached_to_name': "Chart of Accounts Utilities"
        })
        file_doc = frappe.get_doc("File", file_doc[0]['name'])
        file_path = file_doc.get_full_path()
       # Determine file type and read accordingly
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif file_path.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file_path)
        else:
            raise ValueError("Unsupported file format. Use CSV or Excel.")
    
        # Validate required columns
        required_columns = ['Account Name', 'Account Type', 'Parent Account']
        for col in required_columns:
            if col not in df.columns:
                raise ValueError(f"Missing required column: {col}")
    
        create_root_accounts(root_accounts)

        # Prepare accounts for import
        company = frappe.get_list("Company")
        company = company[0]['name']
        for _, row in df.iterrows():
            create_account_sql(row['Account Name'], "IntelliSOFT Consulting Limited", 0, row['Root Type'], "Assets")



def create_account_sql(account_name, company,is_group=0, root_type=None, parent_account=None, account_type=None):
    try:
        # SQL query to insert account
        if parent_account:
            sql_query = """
                INSERT INTO `tabAccount` 
                (`name`, `account_name`, `company`, `parent_account`, `is_group`, `account_type`, `lft`, `rgt`, `root_type`, `balance_must_be`, `docstatus`)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
            """
            values = (account_name, account_name, company, parent_account, is_group, account_type, 0, 0, root_type, None, 0)
        else:
            sql_query = """
                INSERT INTO `tabAccount` 
                (`name`, `account_name`, `company`, `is_group`, `account_type`, `lft`, `rgt`, `root_type`, `balance_must_be`, `docstatus`)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
            """
            values = (account_name, account_name, company, is_group, account_type, 0, 0, root_type, None, 0)

        # Execute SQL
        frappe.db.sql(sql_query, values)
        frappe.db.commit()  # Commit changes
        print(f"Account '{account_name}' created successfully in the database.")
    except Exception as e:
        frappe.log_error(f"Error creating account '{account_name}': {str(e)}", "Account Creation Error")
        print(f"Error: {str(e)}")

# Example Usage
# create_account_sql("New Account", "Test Company")  # Without parent
# create_account_sql("Child Account", "Test Company", "Parent Account - Test Company")  # With parent


