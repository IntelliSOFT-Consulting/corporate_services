import React, { useEffect, useState } from "react";
import { TemplateResource } from "./types";

export function TemplatesTab() {
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<TemplateResource[]>([]);
  const [error, setError] = useState<string | null>(null);

  function loadLibrary() {
    setLoading(true);
    setError(null);
    globalThis.frappe
      .call({
        method:
          "corporate_services.icl_corporate_services.page.icl_project_management.icl_project_management.get_template_library",
      })
      .then((r: any) => {
        setResources((r && r.message) || []);
        setLoading(false);
      })
      .catch((e: any) => {
        setError(e?.message || "Could not load template library.");
        setLoading(false);
      });
  }

  useEffect(() => {
    loadLibrary();
  }, []);

  function openUploadDialog(requirement: string) {
    new globalThis.frappe.ui.FileUploader({
      allow_multiple: false,
      restrictions: {
        allowed_file_types: [".doc", ".docx", ".pdf"],
      },
      on_success: (file: any) => {
        globalThis.frappe.call({
          method:
            "corporate_services.icl_corporate_services.page.icl_project_management.icl_project_management.link_template_file",
          args: {
            requirement,
            file_url: file.file_url,
          },
          callback: () => {
            globalThis.frappe.show_alert({
              message: "Template saved",
              indicator: "green",
            });
            loadLibrary();
          },
        });
      },
    });
  }

  if (loading) {
    return (
      <div className="container-fluid p-3 text-muted">
        Loading project requirements templates...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid p-3">
        <div className="alert alert-danger mb-0">{error}</div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-3">
      <div className="alert alert-info mb-3" role="alert">
        Standard templates from the Project Toolkit Document Templates
        library. Download a template, fill it in, and upload the completed
        version here to keep the shared copy current.
      </div>
      <div className="row">
        {resources.map((item, idx) => (
          <div
            className="col-lg-6 mb-3"
            key={`${item.requirement || "resource"}-${idx}`}
          >
            <div className="card border h-100">
              <div className="card-body">
                <h6 className="mb-2 d-flex align-items-center" style={{ gap: 8 }}>
                  {item.requirement || ""}
                  {!item.is_active && (
                    <span className="badge badge-secondary" style={{ fontSize: 10 }}>Inactive</span>
                  )}
                </h6>
                <p className="text-muted mb-2">{item.description || ""}</p>
                {item.doctype && (
                  <div className="small text-muted mb-2">
                    Target: {item.doctype}
                  </div>
                )}
                <div className="small mb-3">
                  {item.template_file ? (
                    <span className="text-success">Template uploaded</span>
                  ) : (
                    <span className="text-warning">No template uploaded</span>
                  )}
                </div>
                <div className="d-flex flex-wrap" style={{ gap: 8 }}>
                  {item.doctype && (
                    <button
                      className="btn btn-sm btn-default"
                      onClick={() =>
                        globalThis.frappe?.set_route("List", item.doctype)
                      }
                    >
                      View List
                    </button>
                  )}
                  <button
                    className="btn btn-sm btn-default"
                    onClick={() =>
                      item.requirement && openUploadDialog(item.requirement)
                    }
                  >
                    Upload/Replace Template
                  </button>
                  <button
                    className="btn btn-sm btn-default"
                    onClick={() => {
                      if (!item.template_file) {
                        globalThis.frappe.show_alert({
                          message: "No template uploaded yet",
                          indicator: "orange",
                        });
                        return;
                      }
                      globalThis.open(item.template_file, "_blank");
                    }}
                  >
                    Download Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
