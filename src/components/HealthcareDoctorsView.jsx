import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Plus,
  LayoutGrid,
  List as ListIcon,
  Star,
  MapPin,
  Clock,
  Phone,
  Mail,
  Calendar,
  Award,
  ChevronRight,
  X,
  Stethoscope,
  CheckCircle2,
  CalendarDays,
  FileText,
  Users,
  Edit2,
  Trash2,
} from "lucide-react";
import DoctorAvatar from "./DoctorAvatar.jsx";
import "./HealthcareDoctorsView.css";

// High-quality benchmark clinical doctors data to blend with real API records
const BENCHMARK_DOCTORS = [
  {
    id: 101,
    name: "Dr. Priya Kumar",
    specialization: "Veterinary Surgeon",
    experience: "12 years experience",
    rating: 4.8,
    reviewsCount: 142,
    location: "BTM Layout, Bangalore",
    status: "Active",
    availability: "Available",
    phone: "+91 98450 12345",
    email: "priya.kumar@zenvezippy.com",
    regId: "KVC-2012-0891",
    about: "Specialized in small animal orthopedic surgery, feline medicine, and critical veterinary trauma care.",
    patientsCount: 840,
    appointmentsToday: 7,
  },
  {
    id: 102,
    name: "Dr. Rajesh Sharma",
    specialization: "Canine Specialist & Dermatologist",
    experience: "9 years experience",
    rating: 4.9,
    reviewsCount: 188,
    location: "Indiranagar, Bangalore",
    status: "Active",
    availability: "Available",
    phone: "+91 98765 43210",
    email: "rajesh.sharma@zenvezippy.com",
    regId: "KVC-2015-1120",
    about: "Expert in canine dermatology, chronic allergy management, and preventive wellness programs.",
    patientsCount: 920,
    appointmentsToday: 9,
  },
  {
    id: 103,
    name: "Dr. Ananya Sen",
    specialization: "Veterinary Radiologist",
    experience: "15 years experience",
    rating: 4.7,
    reviewsCount: 96,
    location: "Koramangala, Bangalore",
    status: "Active",
    availability: "In Surgery",
    phone: "+91 94480 56789",
    email: "ananya.sen@zenvezippy.com",
    regId: "KVC-2009-0412",
    about: "Diagnostic imaging specialist with extensive experience in ultrasound, CT, and digital radiography.",
    patientsCount: 1120,
    appointmentsToday: 5,
  },
  {
    id: 104,
    name: "Dr. Vikram Patel",
    specialization: "Dental & General Veterinary Medicine",
    experience: "8 years experience",
    rating: 4.8,
    reviewsCount: 110,
    location: "Whitefield, Bangalore",
    status: "Active",
    availability: "Available",
    phone: "+91 97312 88441",
    email: "vikram.patel@zenvezippy.com",
    regId: "KVC-2016-2004",
    about: "Specializes in periodontal therapy, oral surgeries, and preventive vaccination routines for companion animals.",
    patientsCount: 650,
    appointmentsToday: 6,
  },
  {
    id: 105,
    name: "Dr. Neha Varma",
    specialization: "Avian & Exotic Pet Specialist",
    experience: "10 years experience",
    rating: 4.9,
    reviewsCount: 164,
    location: "HSR Layout, Bangalore",
    status: "Active",
    availability: "Available",
    phone: "+91 98112 34567",
    email: "neha.varma@zenvezippy.com",
    regId: "KVC-2014-0731",
    about: "Dedicated exotic companion veterinarian treating birds, rabbits, rodents, and reptiles with advanced medical care.",
    patientsCount: 780,
    appointmentsToday: 4,
  },
  {
    id: 106,
    name: "Dr. Arjun Reddy",
    specialization: "Veterinary Cardiology & ICU",
    experience: "14 years experience",
    rating: 4.8,
    reviewsCount: 135,
    location: "Jayanagar, Bangalore",
    status: "Active",
    availability: "On Call",
    phone: "+91 96200 44556",
    email: "arjun.reddy@zenvezippy.com",
    regId: "KVC-2010-0988",
    about: "Cardiothoracic specialist focused on congenital heart anomalies, ECG evaluation, and emergency resuscitation.",
    patientsCount: 1050,
    appointmentsToday: 8,
  },
];

export default function HealthcareDoctorsView({
  records = [],
  onAddNew = () => {},
  onEdit = () => {},
  onDelete = () => {},
}) {
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpec, setSelectedSpec] = useState("All");
  const [selectedLoc, setSelectedLoc] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedAvailability, setSelectedAvailability] = useState("All");

  // Profile Drawer State
  const [activeDoctor, setActiveDoctor] = useState(null);
  const [drawerTab, setDrawerTab] = useState("overview"); // "overview" | "appointments" | "patients" | "records" | "availability"

  // Merge real database records with benchmark display attributes
  const combinedDoctors = useMemo(() => {
    if (records && records.length > 0) {
      return records.map((rec, idx) => {
        const fallback = BENCHMARK_DOCTORS[idx % BENCHMARK_DOCTORS.length];
        return {
          id: rec.id || fallback.id,
          name: rec.name || rec.doctor_name || fallback.name,
          specialization: rec.specialization || rec.qualification || fallback.specialization,
          experience: rec.experience ? `${rec.experience} years exp` : fallback.experience,
          rating: rec.rating || fallback.rating,
          reviewsCount: fallback.reviewsCount,
          location: rec.location || rec.city || rec.clinic_address || fallback.location,
          status: rec.status || "Active",
          availability: rec.is_available === false ? "Unavailable" : fallback.availability,
          phone: rec.phone || rec.mobile || fallback.phone,
          email: rec.email || fallback.email,
          regId: rec.registration_number || rec.reg_id || fallback.regId,
          about: rec.bio || rec.notes || fallback.about,
          patientsCount: fallback.patientsCount,
          appointmentsToday: fallback.appointmentsToday,
          _raw: rec,
        };
      });
    }
    return BENCHMARK_DOCTORS;
  }, [records]);

  // Filters
  const specializations = useMemo(() => {
    const set = new Set(combinedDoctors.map((d) => d.specialization));
    return ["All", ...Array.from(set)];
  }, [combinedDoctors]);

  const locations = useMemo(() => {
    const set = new Set(combinedDoctors.map((d) => d.location));
    return ["All", ...Array.from(set)];
  }, [combinedDoctors]);

  const filteredDoctors = useMemo(() => {
    return combinedDoctors.filter((doc) => {
      const matchSearch =
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSpec = selectedSpec === "All" || doc.specialization === selectedSpec;
      const matchLoc = selectedLoc === "All" || doc.location === selectedLoc;
      const matchStatus = selectedStatus === "All" || doc.status === selectedStatus;
      const matchAvail =
        selectedAvailability === "All" ||
        (selectedAvailability === "Available" ? doc.availability === "Available" : doc.availability !== "Available");
      return matchSearch && matchSpec && matchLoc && matchStatus && matchAvail;
    });
  }, [combinedDoctors, searchTerm, selectedSpec, selectedLoc, selectedStatus, selectedAvailability]);

  return (
    <div className="hc-doctors-view">
      {/* ── Page Header ── */}
      <div className="hc-page-header">
        <div>
          <h2 className="hc-view-title">Doctors</h2>
          <p className="hc-view-subtitle">
            Manage doctors, veterinary specialists, credentials and clinic availability.
          </p>
        </div>
        <button type="button" className="hc-btn-primary" onClick={onAddNew}>
          <Plus size={16} strokeWidth={2.5} />
          <span>Add Doctor</span>
        </button>
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <div className="hc-doctors-toolbar">
        {/* Search */}
        <div className="hc-search-field">
          <Search size={16} className="hc-field-icon" />
          <input
            type="text"
            placeholder="Search doctor by name, specialty, or clinic..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="hc-filters-row">
          <select
            className="hc-filter-select"
            value={selectedSpec}
            onChange={(e) => setSelectedSpec(e.target.value)}
          >
            <option value="All">All Specializations</option>
            {specializations.filter((s) => s !== "All").map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            className="hc-filter-select"
            value={selectedLoc}
            onChange={(e) => setSelectedLoc(e.target.value)}
          >
            <option value="All">All Locations</option>
            {locations.filter((l) => l !== "All").map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          <select
            className="hc-filter-select"
            value={selectedAvailability}
            onChange={(e) => setSelectedAvailability(e.target.value)}
          >
            <option value="All">All Availability</option>
            <option value="Available">Available Now</option>
            <option value="Busy">In Surgery / On Call</option>
          </select>

          {/* View Switcher: Grid / List */}
          <div className="hc-view-switcher">
            <button
              type="button"
              className={`hc-switch-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              className={`hc-switch-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
              title="List View"
            >
              <ListIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content View ── */}
      {filteredDoctors.length === 0 ? (
        <div className="hc-empty-state">
          <div className="hc-empty-icon-wrap">
            <Stethoscope size={36} />
          </div>
          <h3>No doctors found</h3>
          <p>Try changing your search term or clearing filters.</p>
          <button
            type="button"
            className="hc-btn-secondary"
            onClick={() => {
              setSearchTerm("");
              setSelectedSpec("All");
              setSelectedLoc("All");
              setSelectedAvailability("All");
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="hc-doctors-grid">
          {filteredDoctors.map((doc) => (
            <div className="hc-doctor-card" key={doc.id}>
              {/* Card Top / Avatar & Status */}
              <div className="hc-doc-card-top">
                <div className="hc-doc-avatar-wrap">
                  <DoctorAvatar name={doc.name} size={64} showOnline={true} isOnline={doc.availability === "Available"} />
                </div>
                <div className="hc-doc-status-col">
                  <span
                    className={`hc-badge ${
                      doc.availability === "Available" ? "hc-badge-success" : "hc-badge-warning"
                    }`}
                  >
                    ● {doc.availability}
                  </span>
                </div>
              </div>

              {/* Doctor Details */}
              <div className="hc-doc-info">
                <h4 className="hc-doc-name">{doc.name}</h4>
                <p className="hc-doc-spec">{doc.specialization}</p>

                <div className="hc-doc-meta-row">
                  <span className="hc-rating-badge">
                    <Star size={13} fill="#f59e0b" color="#f59e0b" />
                    <strong>{doc.rating}</strong>
                    <span className="hc-reviews-count">({doc.reviewsCount})</span>
                  </span>
                  <span className="hc-meta-divider">•</span>
                  <span className="hc-doc-exp">{doc.experience}</span>
                </div>

                <div className="hc-doc-location">
                  <MapPin size={13} className="hc-loc-icon" />
                  <span>{doc.location}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="hc-doc-card-actions">
                <button
                  type="button"
                  className="hc-btn-card-secondary"
                  onClick={() => setActiveDoctor(doc)}
                >
                  View Profile
                </button>
                <button
                  type="button"
                  className="hc-btn-card-primary"
                  onClick={() => {
                    alert(`Booking consultation with ${doc.name}`);
                  }}
                >
                  Book
                </button>
              </div>

              {/* CRUD Mini Buttons */}
              {doc._raw && (
                <div className="hc-doc-crud-row">
                  <button
                    type="button"
                    className="hc-btn-icon-sm"
                    title="Edit Doctor Record"
                    onClick={() => onEdit(doc._raw)}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    className="hc-btn-icon-sm danger"
                    title="Delete Doctor Record"
                    onClick={() => onDelete(doc._raw)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="hc-table-container">
          <table className="hc-table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Specialization</th>
                <th>Experience</th>
                <th>Rating</th>
                <th>Location</th>
                <th>Availability</th>
                <th>Contact</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDoctors.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div className="hc-table-user-cell">
                      <DoctorAvatar name={doc.name} size={36} />
                      <div>
                        <span className="hc-user-name">{doc.name}</span>
                        <span className="hc-user-sub">Reg: {doc.regId}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="hc-spec-pill">{doc.specialization}</span>
                  </td>
                  <td>{doc.experience}</td>
                  <td>
                    <div className="hc-rating-badge inline">
                      <Star size={13} fill="#f59e0b" color="#f59e0b" />
                      <span>{doc.rating}</span>
                    </div>
                  </td>
                  <td>
                    <div className="hc-inline-loc">
                      <MapPin size={13} />
                      <span>{doc.location}</span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`hc-badge ${
                        doc.availability === "Available" ? "hc-badge-success" : "hc-badge-warning"
                      }`}
                    >
                      ● {doc.availability}
                    </span>
                  </td>
                  <td>
                    <div className="hc-contact-links">
                      <a href={`tel:${doc.phone}`} className="hc-contact-link" title={doc.phone}>
                        <Phone size={13} />
                      </a>
                      <a href={`mailto:${doc.email}`} className="hc-contact-link" title={doc.email}>
                        <Mail size={13} />
                      </a>
                    </div>
                  </td>
                  <td>
                    <div className="hc-row-actions">
                      <button
                        type="button"
                        className="hc-btn-table-action"
                        onClick={() => setActiveDoctor(doc)}
                      >
                        Profile
                      </button>
                      <button
                        type="button"
                        className="hc-btn-table-action primary"
                        onClick={() => alert(`Booking consultation with ${doc.name}`)}
                      >
                        Book
                      </button>
                      {doc._raw && (
                        <button
                          type="button"
                          className="hc-btn-table-icon"
                          onClick={() => onEdit(doc._raw)}
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Doctor Profile Drawer / Modal (Section 6) ── */}
      {activeDoctor && (
        <div className="hc-modal-backdrop" onClick={() => setActiveDoctor(null)}>
          <div
            className="hc-profile-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="hc-drawer-header">
              <span className="hc-drawer-tag">DOCTOR PROFILE</span>
              <button
                type="button"
                className="hc-btn-close"
                onClick={() => setActiveDoctor(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Hero Header */}
            <div className="hc-profile-hero">
              <div className="hc-hero-avatar-wrap">
                <DoctorAvatar name={activeDoctor.name} size={76} showOnline={true} isOnline={activeDoctor.availability === "Available"} />
              </div>
              <div className="hc-hero-meta">
                <h3 className="hc-hero-name">{activeDoctor.name}</h3>
                <p className="hc-hero-spec">{activeDoctor.specialization}</p>
                <div className="hc-hero-pills">
                  <span className="hc-pill-reg">ID: {activeDoctor.regId}</span>
                  <span className="hc-pill-exp">{activeDoctor.experience}</span>
                  <span className="hc-badge hc-badge-success">● {activeDoctor.availability}</span>
                </div>
              </div>
            </div>

            {/* Quick Contacts Bar */}
            <div className="hc-hero-contact-bar">
              <div className="hc-contact-item">
                <Phone size={14} className="hc-contact-icon" />
                <span>{activeDoctor.phone}</span>
              </div>
              <div className="hc-contact-item">
                <Mail size={14} className="hc-contact-icon" />
                <span>{activeDoctor.email}</span>
              </div>
              <div className="hc-contact-item">
                <MapPin size={14} className="hc-contact-icon" />
                <span>{activeDoctor.location}</span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="hc-drawer-tabs">
              {[
                { key: "overview", label: "Overview", icon: Award },
                { key: "appointments", label: "Appointments", icon: CalendarDays },
                { key: "patients", label: "Patients", icon: Users },
                { key: "records", label: "Medical Records", icon: FileText },
                { key: "availability", label: "Availability", icon: Clock },
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={`hc-drawer-tab-btn ${drawerTab === tab.key ? "active" : ""}`}
                    onClick={() => setDrawerTab(tab.key)}
                  >
                    <IconComponent size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            <div className="hc-drawer-content">
              {drawerTab === "overview" && (
                <div className="hc-tab-panel">
                  <div className="hc-panel-section">
                    <h4>About Specialist</h4>
                    <p className="hc-about-text">{activeDoctor.about}</p>
                  </div>

                  <div className="hc-profile-stats-grid">
                    <div className="hc-pstat-card">
                      <Users size={18} className="hc-pstat-icon" />
                      <div>
                        <span className="hc-pstat-num">{activeDoctor.patientsCount}+</span>
                        <span className="hc-pstat-lbl">Active Patients</span>
                      </div>
                    </div>
                    <div className="hc-pstat-card">
                      <Calendar size={18} className="hc-pstat-icon teal" />
                      <div>
                        <span className="hc-pstat-num">{activeDoctor.appointmentsToday}</span>
                        <span className="hc-pstat-lbl">Today's Visits</span>
                      </div>
                    </div>
                    <div className="hc-pstat-card">
                      <Star size={18} className="hc-pstat-icon amber" />
                      <div>
                        <span className="hc-pstat-num">{activeDoctor.rating} ★</span>
                        <span className="hc-pstat-lbl">Patient Rating</span>
                      </div>
                    </div>
                  </div>

                  <div className="hc-panel-section">
                    <h4>Clinical Accreditations</h4>
                    <ul className="hc-check-list">
                      <li>
                        <CheckCircle2 size={15} color="#10b981" />
                        <span>Registered with Karnataka Veterinary Council (KVC)</span>
                      </li>
                      <li>
                        <CheckCircle2 size={15} color="#10b981" />
                        <span>Certified Small Animal Critical Care Provider</span>
                      </li>
                      <li>
                        <CheckCircle2 size={15} color="#10b981" />
                        <span>Member of Indian Society for Veterinary Surgery (ISVS)</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {drawerTab === "appointments" && (
                <div className="hc-tab-panel">
                  <h4>Upcoming Clinic Schedule</h4>
                  <div className="hc-drawer-schedule-list">
                    <div className="hc-schedule-row">
                      <div className="hc-sched-time">09:30 AM</div>
                      <div className="hc-sched-info">
                        <strong>Bruno</strong> (Golden Retriever) · Checkup
                        <span>Parent: Arun Kumar</span>
                      </div>
                      <span className="hc-badge hc-badge-success">CONFIRMED</span>
                    </div>
                    <div className="hc-schedule-row">
                      <div className="hc-sched-time">11:00 AM</div>
                      <div className="hc-sched-info">
                        <strong>Milo</strong> (Beagle) · Vaccination
                        <span>Parent: Sneha Rao</span>
                      </div>
                      <span className="hc-badge hc-badge-info">SCHEDULED</span>
                    </div>
                    <div className="hc-schedule-row">
                      <div className="hc-sched-time">02:30 PM</div>
                      <div className="hc-sched-info">
                        <strong>Bella</strong> (Persian Cat) · Skin Allergy
                        <span>Parent: Vikram Das</span>
                      </div>
                      <span className="hc-badge hc-badge-warning">WAITING</span>
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === "patients" && (
                <div className="hc-tab-panel">
                  <h4>Recent Treated Patients</h4>
                  <div className="hc-drawer-patients-list">
                    <div className="hc-dpatient-card">
                      <span className="hc-dpet-avatar">🐕</span>
                      <div>
                        <strong>Bruno</strong> · Golden Retriever (4 yrs)
                        <p>Parent: Arun Kumar · Last visit: 18 Sep 2026</p>
                      </div>
                    </div>
                    <div className="hc-dpatient-card">
                      <span className="hc-dpet-avatar">🐈</span>
                      <div>
                        <strong>Luna</strong> · Persian Cat (2 yrs)
                        <p>Parent: Ananya Patel · Last visit: 14 Sep 2026</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === "records" && (
                <div className="hc-tab-panel">
                  <h4>Recent Medical Consultations</h4>
                  <div className="hc-med-timeline">
                    <div className="hc-timeline-item">
                      <span className="hc-time-dot" />
                      <div className="hc-time-content">
                        <span className="hc-time-date">18 Sep 2026</span>
                        <h5>Routine Annual Health Checkup</h5>
                        <p>Patient: Bruno · Vital signs normal, weight 24.5 kg, dental grading 1.</p>
                      </div>
                    </div>
                    <div className="hc-timeline-item">
                      <span className="hc-time-dot" />
                      <div className="hc-time-content">
                        <span className="hc-time-date">10 Aug 2026</span>
                        <h5>Canine Parvovirus Booster & Deworming</h5>
                        <p>Administered Nobivac DHPPi + Lepto. Next booster in 1 year.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === "availability" && (
                <div className="hc-tab-panel">
                  <h4>Weekly Availability Slots</h4>
                  <div className="hc-avail-grid">
                    <div className="hc-avail-day">
                      <span className="hc-day-name">Monday – Friday</span>
                      <span className="hc-day-hours">09:00 AM – 01:00 PM · 04:00 PM – 08:00 PM</span>
                      <span className="hc-badge hc-badge-success">Open for Booking</span>
                    </div>
                    <div className="hc-avail-day">
                      <span className="hc-day-name">Saturday</span>
                      <span className="hc-day-hours">10:00 AM – 03:00 PM</span>
                      <span className="hc-badge hc-badge-success">Open for Booking</span>
                    </div>
                    <div className="hc-avail-day">
                      <span className="hc-day-name">Sunday</span>
                      <span className="hc-day-hours">Emergency Consultations Only</span>
                      <span className="hc-badge hc-badge-warning">On Call</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="hc-drawer-footer">
              <button
                type="button"
                className="hc-btn-secondary"
                onClick={() => setActiveDoctor(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="hc-btn-primary"
                onClick={() => {
                  alert(`Direct booking opened for ${activeDoctor.name}`);
                  setActiveDoctor(null);
                }}
              >
                Book Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
