import React, { useState } from "react";
import {
  Users,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  TrendingUp,
  TrendingDown,
  Stethoscope,
  HeartHandshake,
  DollarSign,
  AlertCircle,
  Plus,
  Eye,
  ChevronRight,
  Filter,
  Activity,
  ArrowRight,
} from "lucide-react";
import DoctorAvatar from "./DoctorAvatar.jsx";
import "./HealthcareDashboard.css";

export default function HealthcareDashboard({
  data = {},
  onNavigate = () => {},
  onNewAppointment = () => {},
  onSelectDoctor = () => {},
}) {
  const [appointmentFilter, setAppointmentFilter] = useState("All");

  // Benchmark / API statistics
  const totalDoctors = data.doctors?.length ? data.doctors.length : 1248;
  const totalPetParents = data.petParents?.length ? data.petParents.length : 8426;
  const totalPets = data.pets?.length ? data.pets.length : 12840;
  const todayAppointmentsCount = 186;
  const pendingAppointmentsCount = 24;
  const revenueTotal = "₹ 2,48,600";

  const kpis = [
    {
      label: "Total Doctors",
      value: totalDoctors.toLocaleString("en-IN"),
      trend: "+8.4%",
      trendUp: true,
      compare: "vs last month",
      icon: Stethoscope,
      color: "#0284c7",
      bg: "rgba(2, 132, 199, 0.08)",
      key: "doctors",
    },
    {
      label: "Pet Parents",
      value: totalPetParents.toLocaleString("en-IN"),
      trend: "+6.2%",
      trendUp: true,
      compare: "vs last month",
      icon: Users,
      color: "#0d9488",
      bg: "rgba(13, 148, 136, 0.08)",
      key: "pet_parents",
    },
    {
      label: "Active Pets",
      value: totalPets.toLocaleString("en-IN"),
      trend: "+9.3%",
      trendUp: true,
      compare: "vs last month",
      icon: HeartHandshake,
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.08)",
      key: "pets",
    },
    {
      label: "Today's Appointments",
      value: todayAppointmentsCount,
      trend: "+12.5%",
      trendUp: true,
      compare: "vs yesterday",
      icon: Calendar,
      color: "#8b5cf6",
      bg: "rgba(139, 92, 246, 0.08)",
      key: "appointments",
    },
    {
      label: "Pending Appointments",
      value: pendingAppointmentsCount,
      trend: "-4.2%",
      trendUp: false,
      compare: "vs yesterday",
      icon: AlertCircle,
      color: "#f59e0b",
      bg: "rgba(245, 158, 11, 0.08)",
      key: "appointments",
    },
    {
      label: "Revenue",
      value: revenueTotal,
      trend: "+14.8%",
      trendUp: true,
      compare: "vs last month",
      icon: DollarSign,
      color: "#059669",
      bg: "rgba(5, 150, 105, 0.08)",
      key: "orders",
    },
  ];

  // Appointments mock/real list
  const allAppointments = [
    {
      id: 1,
      doctor: "Dr. Priya Kumar",
      specialization: "Veterinary Surgeon",
      pet: "Bruno",
      petParent: "Arun Kumar",
      time: "10:30 AM",
      location: "Clinic – BTM Layout",
      status: "Confirmed",
    },
    {
      id: 2,
      doctor: "Dr. Rajesh Sharma",
      specialization: "Canine Specialist",
      pet: "Max",
      petParent: "Kavitha R",
      time: "11:15 AM",
      location: "Clinic – Indiranagar",
      status: "Scheduled",
    },
    {
      id: 3,
      doctor: "Dr. Suresh Babu",
      specialization: "General Physician",
      pet: "Milo",
      petParent: "Vikas Verma",
      time: "12:00 PM",
      location: "Clinic – Koramangala",
      status: "Confirmed",
    },
    {
      id: 4,
      doctor: "Dr. Anitha Reddy",
      specialization: "Dermatologist",
      pet: "Bella",
      petParent: "Sneha Patel",
      time: "02:30 PM",
      location: "Clinic – Whitefield",
      status: "Completed",
    },
    {
      id: 5,
      doctor: "Dr. Priya Kumar",
      specialization: "Veterinary Surgeon",
      pet: "Charlie",
      petParent: "Deepak S",
      time: "03:45 PM",
      location: "Clinic – BTM Layout",
      status: "Cancelled",
    },
  ];

  const filteredAppointments = allAppointments.filter((item) => {
    if (appointmentFilter === "All") return true;
    return item.status.toLowerCase() === appointmentFilter.toLowerCase();
  });

  return (
    <div className="hc-dashboard-container">
      {/* ── Top Header Greeting Banner ── */}
      <div className="hc-welcome-card">
        <div className="hc-welcome-left">
          <div className="hc-welcome-title-row">
            <span className="hc-welcome-emoji">👋</span>
            <h1 className="hc-welcome-title">Good morning, Admin</h1>
          </div>
          <p className="hc-welcome-sub">
            Here's what's happening with your clinic today. All systems operational.
          </p>
        </div>

        <div className="hc-welcome-right">
          <div className="hc-date-pill">
            <CalendarDays size={15} style={{ color: "var(--hc-primary)" }} />
            <span>Today, 24 Sep 2026</span>
          </div>
          <button
            type="button"
            className="hc-btn-primary"
            onClick={onNewAppointment}
          >
            <Plus size={15} />
            <span>New Appointment</span>
          </button>
        </div>
      </div>

      {/* ── KPI Cards Grid ── */}
      <div className="hc-kpi-grid">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              className="hc-kpi-card"
              onClick={() => onNavigate(k.key)}
              title={`View ${k.label}`}
            >
              <div className="hc-kpi-top">
                <span className="hc-kpi-label">{k.label}</span>
                <div
                  className="hc-kpi-icon-box"
                  style={{ background: k.bg, color: k.color }}
                >
                  <Icon size={18} />
                </div>
              </div>

              <div className="hc-kpi-val">{k.value}</div>

              <div className="hc-kpi-footer">
                <span className={`hc-kpi-trend ${k.trendUp ? "up" : "down"}`}>
                  {k.trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{k.trend}</span>
                </span>
                <span className="hc-kpi-compare">{k.compare}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Two Column Healthcare Dashboard ── */}
      <div className="hc-dash-layout">
        {/* Left Column: Today's Appointments Section */}
        <div className="hc-dash-left">
          <div className="hc-card hc-appointments-section">
            <div className="hc-card-header">
              <div>
                <h2 className="hc-card-title">Today's Appointments</h2>
                <p className="hc-card-sub">
                  Live consultations and clinical visits scheduled for today.
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="hc-filter-tabs">
                {["All", "Scheduled", "Confirmed", "Completed", "Cancelled"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`hc-filter-tab-btn ${appointmentFilter === tab ? "active" : ""}`}
                    onClick={() => setAppointmentFilter(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Appointment Cards List */}
            <div className="hc-appointment-cards-list">
              {filteredAppointments.length === 0 ? (
                <div className="hc-empty-appointments">
                  <Calendar size={32} style={{ opacity: 0.5 }} />
                  <p>No {appointmentFilter.toLowerCase()} appointments for today.</p>
                </div>
              ) : (
                filteredAppointments.map((apt) => (
                  <div key={apt.id} className="hc-appointment-item-card">
                    <div className="hc-apt-doctor-col">
                      <DoctorAvatar name={apt.doctor} size={42} />
                      <div className="hc-apt-doc-info">
                        <strong className="hc-apt-doc-name">{apt.doctor}</strong>
                        <span className="hc-apt-doc-spec">{apt.specialization}</span>
                      </div>
                    </div>

                    <div className="hc-apt-patient-col">
                      <div className="hc-apt-patient-row">
                        <span className="hc-apt-pet-badge">🐾 {apt.pet}</span>
                        <span className="hc-apt-parent-text">Pet Parent: {apt.petParent}</span>
                      </div>
                      <div className="hc-apt-time-row">
                        <Clock size={12} style={{ color: "var(--hc-muted)" }} />
                        <span>{apt.time}</span>
                        <span className="hc-dot-sep">•</span>
                        <MapPin size={12} style={{ color: "var(--hc-muted)" }} />
                        <span>{apt.location}</span>
                      </div>
                    </div>

                    <div className="hc-apt-status-col">
                      <span className={`hc-badge hc-badge-${apt.status.toLowerCase()}`}>
                        <span className="hc-badge-dot" />
                        {apt.status}
                      </span>
                    </div>

                    <div className="hc-apt-actions-col">
                      <button
                        type="button"
                        className="hc-apt-btn view"
                        onClick={() => onNavigate("appointments")}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="hc-apt-btn reschedule"
                        onClick={onNewAppointment}
                      >
                        Reschedule
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Clinical Quick Panel & Activities */}
        <div className="hc-dash-right">
          {/* Quick Doctor Consults */}
          <div className="hc-card">
            <div className="hc-card-header">
              <h3 className="hc-card-title">Available Doctors</h3>
              <button
                type="button"
                className="hc-link-btn"
                onClick={() => onNavigate("doctors")}
              >
                View All
              </button>
            </div>

            <div className="hc-quick-docs-list">
              {(data.doctors && data.doctors.length > 0 ? data.doctors.slice(0, 4) : [
                { id: 1, name: "Dr. Priya Kumar", specializations: "Veterinary Surgeon", city: "BTM Layout" },
                { id: 2, name: "Dr. Rajesh Sharma", specializations: "Canine Specialist", city: "Indiranagar" },
                { id: 3, name: "Dr. Suresh Babu", specializations: "General Physician", city: "Koramangala" },
                { id: 4, name: "Dr. Anitha Reddy", specializations: "Dermatologist", city: "Whitefield" },
              ]).map((doc) => (
                <div key={doc.id} className="hc-quick-doc-row" onClick={() => onSelectDoctor(doc)}>
                  <DoctorAvatar name={doc.name} size={36} />
                  <div className="hc-quick-doc-details">
                    <span className="hc-quick-doc-name">{doc.name}</span>
                    <span className="hc-quick-doc-spec">{doc.specializations || "Veterinary Specialist"}</span>
                  </div>
                  <span className="hc-badge hc-badge-available">
                    <span className="hc-badge-dot" />
                    Available
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Clinical Operations Link Banner */}
          <div className="hc-card hc-promo-box">
            <div className="hc-promo-content">
              <span className="hc-promo-pill">CLINICAL SUITE</span>
              <h4 className="hc-promo-title">Veterinary Patient Care Engine</h4>
              <p className="hc-promo-sub">
                Manage vaccinations, digital prescriptions, pathology lab reports and recurring pet appointments in one unified workspace.
              </p>
              <button
                type="button"
                className="hc-promo-btn"
                onClick={() => onNavigate("pets")}
              >
                <span>Open Patient Profiles</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
