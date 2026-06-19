export function openForm(doctype: string, name?: string) {
  (globalThis as any).frappe?.set_route("Form", doctype, name);
}

export function frappeCall(method: string, args?: Record<string, any>) {
  return (globalThis as any).frappe.call({ method, args });
}

export function showAlert(
  message: string,
  indicator: "green" | "red" | "orange" | "blue" = "blue",
  seconds = 5,
) {
  (globalThis as any).frappe?.show_alert({ message, indicator }, seconds);
}
