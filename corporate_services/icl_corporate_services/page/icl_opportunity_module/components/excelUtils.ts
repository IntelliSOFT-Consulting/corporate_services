import * as XLSX from "xlsx";
import { Employee } from "./MentionInput";

export interface ParsedItem {
  proposal_section: string;
  description: string;
  status: string;
  employees: Employee[];
}

export function downloadChecklistTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Proposal Section", "Description", "Status", "Employee", "Employee Name"],
    ["Introduction", "Write executive summary", "Pending", "EMP-001", "John Doe"],
    ["Budget", "Review cost sheet", "Pending", "EMP-002", "Jane Smith"],
  ]);
  ws["!cols"] = [{ wch: 22 }, { wch: 40 }, { wch: 16 }, { wch: 14 }, { wch: 24 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Checklist Items");
  XLSX.writeFile(wb, "checklist_items_template.xlsx");
}

export function parseChecklistFile(
  file: File
): Promise<{ rows: ParsedItem[]; error: string | null }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        if (raw.length < 2) {
          return resolve({ rows: [], error: "File is empty or has no data rows." });
        }

        const headers = (raw[0] as string[]).map((h) =>
          String(h).toLowerCase().replace(/[^a-z0-9]/g, "")
        );

        const col = (name: string) => {
          const variants: Record<string, string[]> = {
            proposal_section: ["proposalsection", "section"],
            description: ["description", "task", "item"],
            status: ["status"],
            employee: ["employee", "assignedto", "assigned", "employeeid"],
            employee_name: ["employeename", "name", "fullname"],
          };
          return (variants[name] || [name]).reduce(
            (found, v) => (found >= 0 ? found : headers.indexOf(v)),
            -1
          );
        };

        const descCol = col("description");
        if (descCol < 0) {
          return resolve({ rows: [], error: 'No "Description" column found. Download the template to see the expected format.' });
        }

        const rows: ParsedItem[] = [];
        for (let i = 1; i < raw.length; i++) {
          const row = raw[i] as any[];
          const desc = String(row[descCol] ?? "").trim();
          if (!desc) continue;

          const empId = col("employee") >= 0 ? String(row[col("employee")] ?? "").trim() : "";
          const empName = col("employee_name") >= 0 ? String(row[col("employee_name")] ?? "").trim() : "";
          const employees: Employee[] = empId
            ? [{ name: empId, employee_name: empName || empId }]
            : [];

          rows.push({
            proposal_section: col("proposal_section") >= 0 ? String(row[col("proposal_section")] ?? "").trim() : "",
            description: desc,
            status: col("status") >= 0 ? String(row[col("status")] ?? "Pending").trim() || "Pending" : "Pending",
            employees,
          });
        }

        if (rows.length === 0) {
          return resolve({ rows: [], error: "No valid rows found. Make sure the Description column has data." });
        }

        resolve({ rows, error: null });
      } catch (err: any) {
        resolve({ rows: [], error: `Could not parse file: ${err.message || err}` });
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
