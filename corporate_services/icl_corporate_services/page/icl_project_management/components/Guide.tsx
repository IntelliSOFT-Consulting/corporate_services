import React from "react";

export interface GuideProps {
  title?: string;
  description?: string;
  steps?: string[];
}

const Guide: React.FC<GuideProps> = ({
  title = "HIS Project Quick Guide",
  description = "For every new Health Information System (HIS) project, follow the lifecycle stages below to ensure consistent, high-quality delivery.",
  steps = [
    "Create the project record and project charter before work begins.",
    "Capture all required lifecycle deliverables as the project progresses.",
    "Track completion using the HIS PM Project LifeCycle checklist.",
    "Log lessons learned at project close to inform future engagements.",
  ],
}) => {
  return (
    <div className="card border mb-3">
      <div className="card-body">
        <div className="d-flex align-items-start gap-3">
          <div style={{ flex: 1 }}>
            <h6 className="mb-1" style={{ fontSize: 14, fontWeight: 600 }}>{title}</h6>
            <p className="text-muted mb-2" style={{ fontSize: 13 }}>{description}</p>
            <ol className="mb-0 pl-3" style={{ fontSize: 13 }}>
              {steps.map((step, i) => (
                <li key={i} className="mb-1">{step}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Guide;
