import React, { useState } from "react";
import StylizedEyeIcon from "./StylizedEyeIcon.jsx";

export default function LiveEyeCheckerModal({ onClose, onOpenDoctor }) {
  const [forceBlink, setForceBlink] = useState(false);
  const [trackMouse, setTrackMouse] = useState(true);

  const handleManualBlink = () => {
    setForceBlink(true);
    setTimeout(() => setForceBlink(false), 250);
  };

  return (
    <div
      className="zzc-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="zzc-modal"
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "580px",
          padding: "24px",
          boxShadow: "0 20px 40px -15px rgba(0,0,0,0.2)",
          border: "1px solid #e2e8f0",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#e6f4f1", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #00796b" }}>
              <StylizedEyeIcon width={22} height={14} live={true} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>
                Live Eyes Checking & Inspector
              </h3>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b" }}>
                Interactive live eye simulation, animations, and checking suite
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              cursor: "pointer",
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
            }}
          >
            ✕
          </button>
        </div>

        {/* Hero Interactive Eye Box */}
        <div
          style={{
            background: "linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%)",
            borderRadius: "14px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            border: "1.5px solid #99f6e4",
            boxShadow: "inset 0 2px 6px rgba(0,0,0,0.03)",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#0f766e", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            Interactive Live Eye (Tracks Cursor & Blinks)
          </div>

          <div
            style={{
              padding: "16px 28px",
              background: "#ffffff",
              borderRadius: "50px",
              boxShadow: "0 10px 25px -5px rgba(15, 118, 110, 0.15)",
              border: "2px solid #14b8a6",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <StylizedEyeIcon
              size={130}
              live={true}
              tracking={trackMouse}
              forceBlink={forceBlink}
            />
          </div>

          <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#0f766e" }}>
            {trackMouse ? "👀 Move your cursor around — the pupil follows you in real time!" : "Eye is in natural idle glance mode"}
          </p>

          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <button
              onClick={handleManualBlink}
              style={{
                padding: "6px 14px",
                background: "#00796b",
                color: "#ffffff",
                border: "none",
                borderRadius: "20px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,121,107,0.3)",
              }}
            >
              Trigger Blink Now
            </button>
            <button
              onClick={() => setTrackMouse((prev) => !prev)}
              style={{
                padding: "6px 14px",
                background: trackMouse ? "#ccfbf1" : "#ffffff",
                color: "#0f766e",
                border: "1px solid #14b8a6",
                borderRadius: "20px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {trackMouse ? "✓ Mouse Tracking: ON" : "Mouse Tracking: OFF"}
            </button>
          </div>
        </div>

        {/* Live Size & Component Comparison */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem", color: "#1e293b" }}>
            Live Sizes in Action (Organic Staggered Blinking)
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
            {[
              { label: "Table (20px)", size: 20 },
              { label: "Button (28px)", size: 28 },
              { label: "Card (40px)", size: 40 },
              { label: "Badge (56px)", size: 56 },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "12px 8px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    width: item.size + 14,
                    height: item.size + 14,
                    borderRadius: "50%",
                    border: "1.5px solid #00796b",
                    background: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  <StylizedEyeIcon size={item.size} live={true} delay={idx * 0.7} />
                </div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Eye Locations in Application */}
        <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "14px", border: "1px solid #e2e8f0" }}>
          <h4 style={{ margin: "0 0 8px", fontSize: "0.88rem", color: "#0f172a" }}>
            Where Live Eyes are Active for Doctor Checking:
          </h4>
          <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.82rem", color: "#475569", lineHeight: 1.6 }}>
            <li>
              <strong>Daily Reports Table:</strong> In the <em>View</em> column beside every visit row.
            </li>
            <li>
              <strong>Doctors in My Region:</strong> In the <em>View</em> column to check complete doctor profile & details.
            </li>
            <li>
              <strong>Plan Management:</strong> Beside assigned doctors and schedule rows to instantly inspect doctor details.
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              background: "#00796b",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.88rem",
              cursor: "pointer",
            }}
          >
            Done Checking
          </button>
        </div>
      </div>
    </div>
  );
}
