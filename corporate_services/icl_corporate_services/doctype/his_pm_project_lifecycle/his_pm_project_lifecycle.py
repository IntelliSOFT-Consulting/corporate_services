# Copyright (c) 2026, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

from frappe.model.document import Document

from corporate_services.api.project.lifecycle_toolkit import build_project_lifecycle_rows


class HISPMProjectLifeCycle(Document):
    def validate(self):
        self.sync_lifecycle_items()

    def sync_lifecycle_items(self):
        existing_rows = list(getattr(self, "lifecycle_items", None) or [])
        self.set("lifecycle_items", build_project_lifecycle_rows(existing_rows=existing_rows))
