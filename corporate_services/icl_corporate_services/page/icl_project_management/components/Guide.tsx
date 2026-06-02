import React from "react";

export interface GuideProps {
  title?: string;
  description?: string;
  steps?: string[];
}

function onOpenLifecycle() {
  const frappe = (globalThis as any).frappe;
  frappe?.set_route("Form", "HIS Project Lifecycle Config");
}

const Guide: React.FC<GuideProps> = ({
  title = "HIS Project Quick Guide",
  description = "For every new Health Information System (HIS) project, follow the lifecycle stages.",
  steps = [
    "Start by creating the project record and project charter.",
    "Capture all required lifecycle deliverables as the project progresses.",
    "Track completion using the HIS PM Project LifeCycle checklist.",
  ],
}) => {
  return (
    <section className="guide-component">
      <div className="card border mb-3">
        <div className="card-body">
          <h6 className="mb-2">{title}</h6>
          <p className="text-muted mb-2">{description}</p>
          {steps.length > 0 && (
            <ol>
              {steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          )}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onOpenLifecycle();
            }}
          >
            Open HIS Lifecycle Config
          </a>
        </div>
      </div>
    </section>
  );
};

export default Guide;
