import React, { useState } from "react";
import {
  Kanban,
  Users,
  Building2,
  Calendar,
  DollarSign,
  Clock,
  Plus,
  ArrowRight,
  CheckCircle2,
  PhoneCall,
  Mail,
  MoreVertical,
  Activity,
} from "lucide-react";
import DoctorAvatar from "./DoctorAvatar.jsx";
import "./HealthcareSalesCrmDashboard.css";

// Pipeline Stages: New | Contacted | Interested | Follow-up | Converted
const INITIAL_PIPELINE = {
  New: [
    {
      id: "crm-1",
      clinic: "Apex Pet PolyClinic",
      contact: "Dr. Sandeep Rao",
      phone: "+91 98450 66778",
      dealValue: "₹ 85,000",
      productInterest: "Surgical Anesthesia Monitor",
      lastActivity: "Lead captured from veterinary conference",
      priority: "High",
    },
    {
      id: "crm-2",
      clinic: "Healthy Paws Veterinary Hub",
      contact: "Dr. Nivedita Sen",
      phone: "+91 99001 44332",
      dealValue: "₹ 45,000",
      productInterest: "Routine Vaccine Packs",
      lastActivity: "Web enquiry received",
      priority: "Medium",
    },
  ],
  Contacted: [
    {
      id: "crm-3",
      clinic: "Koramangala Pet Hospital",
      contact: "Dr. Ramesh Nair",
      phone: "+91 98860 33221",
      dealValue: "₹ 1,20,000",
      productInterest: "Digital X-Ray Consumables",
      lastActivity: "Introductory phone call completed",
      priority: "High",
    },
  ],
  Interested: [
    {
      id: "crm-4",
      clinic: "CureVet Speciality Clinic",
      contact: "Dr. Meena Iyer",
      phone: "+91 97410 77889",
      dealValue: "₹ 2,10,000",
      productInterest: "Biochemistry Blood Analyzer",
      lastActivity: "Sample demonstration scheduled for Thursday",
      priority: "High",
    },
    {
      id: "crm-5",
      clinic: "FurCare Veterinary Center",
      contact: "Dr. Alok Verma",
      phone: "+91 94481 22990",
      dealValue: "₹ 60,000",
      productInterest: "Bravecto Wholesale Supply",
      lastActivity: "Product brochure & quotation sent",
      priority: "Low",
    },
  ],
  "Follow-up": [
    {
      id: "crm-6",
      clinic: "Greenfield Pet Emergency Care",
      contact: "Dr. Vijay Prasad",
      phone: "+91 96112 88443",
      dealValue: "₹ 3,50,000",
      productInterest: "Annual Pharmaceutical Supply Contract",
      lastActivity: "Commercial proposal revision requested",
      priority: "High",
    },
  ],
  Converted: [
    {
      id: "crm-7",
      clinic: "St. Jude Veterinary Hospital",
      contact: "Dr. Anita Joseph",
      phone: "+91 98451 99331",
      dealValue: "₹ 4,80,000",
      productInterest: "Full Clinic Suite Equipment & Pharmacy",
      lastActivity: "Contract signed, PO received",
      priority: "High",
    },
  ],
};

export default function HealthcareSalesCrmDashboard({ onOpenDetailedSalesCrm = () => {} }) {
  const [activeSection, setActiveSection] = useState("Deals"); // Leads | Doctors | Clinics | Activities | Deals | Follow-ups
  const [pipelineData, setPipelineData] = useState(INITIAL_PIPELINE);

  const stages = ["New", "Contacted", "Interested", "Follow-up", "Converted"];

  return (
    <div className="hc-salescrm-view">
      {/* ── Page Header ── */}
      <div className="hc-page-header">
        <div>
          <h2 className="hc-view-title">Sales CRM & Pipeline</h2>
          <p className="hc-view-subtitle">
            Healthcare clinical partnership pipeline, opportunity stages and veterinarian outreach.
          </p>
        </div>
        <div className="hc-salescrm-head-btns">
          <button
            type="button"
            className="hc-btn-secondary"
            onClick={() => onOpenDetailedSalesCrm("manager")}
          >
            Open Full Field Portal
          </button>
          <button
            type="button"
            className="hc-btn-primary"
            onClick={() => alert("Creating new clinical deal opportunity...")}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Deal</span>
          </button>
        </div>
      </div>

      {/* ── CRM Navigation Sections (Section 18 Requirement) ── */}
      <div className="hc-crm-sections-bar">
        {[
          { key: "Deals", label: "Deal Pipeline", icon: Kanban },
          { key: "Leads", label: "Leads", icon: Users },
          { key: "Doctors", label: "Doctors", icon: Activity },
          { key: "Clinics", label: "Clinics", icon: Building2 },
          { key: "Activities", label: "Activities", icon: Clock },
          { key: "Follow-ups", label: "Follow-ups", icon: Calendar },
        ].map((sec) => {
          const Icon = sec.icon;
          return (
            <button
              key={sec.key}
              type="button"
              className={`hc-crm-sec-btn ${activeSection === sec.key ? "active" : ""}`}
              onClick={() => setActiveSection(sec.key)}
            >
              <Icon size={15} />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Kanban Pipeline Board (Section 18 Requirement) ── */}
      {activeSection === "Deals" && (
        <div className="hc-kanban-board">
          {stages.map((stage) => {
            const cards = pipelineData[stage] || [];
            return (
              <div className="hc-kanban-col" key={stage}>
                <div className="hc-kanban-col-head">
                  <div className="hc-stage-title-wrap">
                    <span className="hc-stage-dot" />
                    <h4 className="hc-stage-title">{stage}</h4>
                  </div>
                  <span className="hc-stage-count">{cards.length}</span>
                </div>

                <div className="hc-kanban-cards-wrap">
                  {cards.map((card) => (
                    <div className="hc-kanban-card" key={card.id}>
                      <div className="hc-kcard-top">
                        <span className="hc-kcard-clinic">{card.clinic}</span>
                        <span
                          className={`hc-badge ${
                            card.priority === "High" ? "hc-badge-danger" : "hc-badge-warning"
                          }`}
                        >
                          {card.priority}
                        </span>
                      </div>

                      <div className="hc-kcard-doctor">
                        <DoctorAvatar name={card.contact} size={28} />
                        <div>
                          <strong>{card.contact}</strong>
                          <span className="hc-kcard-phone">{card.phone}</span>
                        </div>
                      </div>

                      <div className="hc-kcard-product-box">
                        <span className="hc-kcard-product">{card.productInterest}</span>
                        <strong className="hc-kcard-value">{card.dealValue}</strong>
                      </div>

                      <p className="hc-kcard-activity">🕒 {card.lastActivity}</p>
                    </div>
                  ))}

                  {cards.length === 0 && (
                    <div className="hc-kanban-empty">
                      <span>No deals in this stage</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Leads / Activities / Follow-ups alternate display */}
      {activeSection !== "Deals" && (
        <div className="hc-crm-alt-panel">
          <div className="hc-panel-header">
            <h4>{activeSection} Directory & Overview</h4>
            <p>Showing scheduled items, contacts and priority queue for {activeSection.toLowerCase()}.</p>
          </div>
          <div className="hc-crm-alt-cards">
            {Object.values(pipelineData)
              .flat()
              .map((item) => (
                <div className="hc-alt-contact-card" key={item.id}>
                  <div className="hc-alt-head">
                    <DoctorAvatar name={item.contact} size={42} />
                    <div>
                      <strong>{item.contact}</strong>
                      <p>{item.clinic}</p>
                    </div>
                    <span className="hc-badge hc-badge-info">{item.dealValue}</span>
                  </div>
                  <div className="hc-alt-details">
                    <p>Interested in: <strong>{item.productInterest}</strong></p>
                    <p>Recent Update: <span>{item.lastActivity}</span></p>
                  </div>
                  <div className="hc-alt-actions">
                    <a href={`tel:${item.phone}`} className="hc-btn-secondary" style={{ padding: "6px 12px", textDecoration: "none" }}>
                      <PhoneCall size={13} />
                      <span>Call Doctor</span>
                    </a>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
