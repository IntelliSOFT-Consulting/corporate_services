import React from "react";

function SummaryCards({ cards }) {
  return (
    <div className="row g-3 mb-4">
      {cards.map((c) => (
        <div key={c.label} className="col-6 col-md-6 col-lg-3">
          <div className="card h-100">
            <div className="card-body text-center py-3">
              <div style={{ fontSize: 11, color: "#6c757d", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {c.label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: c.color, marginTop: 4 }}>
                {c.value}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SummaryCards;
