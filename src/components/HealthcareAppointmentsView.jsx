import React, { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  XCircle,
  CalendarDays,
  ChevronRight,
  Eye,
  RefreshCw,
  Edit2,
  Trash2,
} from "lucide-react";
import DoctorAvatar from "./DoctorAvatar.jsx";
import "./HealthcareAppointmentsView.css";

const BENCHMARK_APPOINTMENTS = [
  {
    id: 401,
    doctorName: "Dr. Priya Kumar",
    specialization: "Veterinary Surgeon",
    petName: "Bruno",
    petType: "Dog (Golden Retriever)",
    parentName: "Arun Kumar",
    time: "10:30 AM",
    date: "2026-09-24",
    location: "Clinic – BTM Layout",
    status: "CONFIRMED",
    consultationType: "Post-Op Review & Vitals",
    notes: "Review surgical stitch healing on left hind leg.",
  },
  {
    id: 402,
    doctorName: "Dr. Rajesh Sharma",
    specialization: "Canine Specialist & Dermatologist",
    petName: "Milo",
    petType: "Dog (Beagle)",
    parentName: "Sneha Rao",
    time: "11:15 AM",
    date: "2026-09-24",
    location: "Clinic – Indiranagar",
    status: "SCHEDULED",
    consultationType: "Dermatitis Follow-up",
    notes: "Inspect skin flaking and test ear swab culture.",
  },
  {
    id: 403,
    doctorName: "Dr. Ananya Sen",
    specialization: "Veterinary Radiologist",
    petName: "Bella",
    petType: "Cat (Persian)",
    parentName: "Arun Kumar",
    time: "12:00 PM",
    date: "2026-09-24",
    location: "Clinic – Koramangala",
    status: "CONFIRMED",
    consultationType: "Abdominal Ultrasound",
    notes: "Fast 6 hours prior to ultrasound scanning.",
  },
  {
    id: 404,
    doctorName: "Dr. Vikram Patel",
    specialization: "Dental & General Vet",
    petName: "Rocky",
    petType: "Dog (German Shepherd)",
    parentName: "Vikram Das",
    time: "02:30 PM",
    date: "2026-09-24",
    location: "Clinic – Whitefield",
    status: "SCHEDULED",
    consultationType: "Dental Ultrasonic Scaling",
    notes: "Grade 1 tartar removal and gum prophylaxis.",
  },
  {
    id: 405,
    doctorName: "Dr. Neha Varma",
    specialization: "Avian & Exotic Pet Specialist",
    petName: "Coco",
    petType: "Parrot (African Grey)",
    parentName: "Vikram Das",
    time: "03:45 PM",
    date: "2026-09-24",
    location: "Clinic – HSR Layout",
    status: "COMPLETED",
    consultationType: "Routine Avian Wellness Check",
    notes: "Beak trimmed, feather condition excellent.",
  },
  {
    id: 406,
    doctorName: "Dr. Arjun Reddy",
    specialization: "Cardiology & Emergency",
    petName: "Leo",
    petType: "Dog (Labrador)",
    parentName: "Pooja Hegde",
    time: "05:00 PM",
    date: "2026-09-24",
    location: "Clinic – Jayanagar",
    status: "CANCELLED",
    consultationType: "Cardiac Auscultation",
    notes: "Parent rescheduled to Saturday morning.",
  },
];

export default function HealthcareAppointmentsView({
  records = [],
  onAddNew = () => {},
  onEdit = () => {},
  onDelete = () => {},
}) {
  const [activeFilter, setActiveFilter] = useState("All"); // All | Scheduled | Confirmed | Completed | Cancelled
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [activeAppointment, setActiveAppointment] = useState(null);

  const combinedAppointments = useMemo(() => {
    if (records && records.length > 0) {
      return records.map((rec, idx) => {
        const fallback = BENCHMARK_APPOINTMENTS[idx % BENCHMARK_APPOINTMENTS.length];
        return {
          id: rec.id || fallback.id,
          doctorName: rec.doctor_name || rec.doctor || fallback.doctorName,
          specialization: rec.specialization || fallback.specialization,
          petName: rec.pet_name || rec.pet || fallback.petName,
          petType: fallback.petType,
          parentName: rec.parent_name || rec.pet_parent || fallback.parentName,
          time: rec.appointment_time || rec.time || fallback.time,
          date: rec.appointment_date || rec.date || fallback.date,
          location: rec.clinic_name || rec.location || fallback.location,
          status: (rec.status || fallback.status).toUpperCase(),
          consultationType: rec.type || rec.service || fallback.consultationType,
          notes: rec.notes || fallback.notes,
          _raw: rec,
        };
      });
    }
    return BENCHMARK_APPOINTMENTS;
  }, [records]);

  const filteredAppointments = useMemo(() => {
    return combinedAppointments.filter((app) => {
      const matchSearch =
        app.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.petName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchFilter =
        activeFilter === "All" ||
        app.status === activeFilter.toUpperCase();
      const matchLoc =
        selectedLocation === "All" || app.location.includes(selectedLocation);
      return matchSearch && matchFilter && matchLoc;
    });
  }, [combinedAppointments, searchTerm, activeFilter, selectedLocation]);

  return (
    <div className="hc-appts-view">
      {/* ── Page Header ── */}
      <div className="hc-page-header">
        <div>
          <h2 className="hc-view-title">Today's Appointments</h2>
          <p className="hc-view-subtitle">
            Real-time outpatient consultation pipeline, surgery bookings and status tracking.
          </p>
        </div>
        <button type="button" className="hc-btn-primary" onClick={onAddNew}>
          <Plus size={16} strokeWidth={2.5} />
          <span>New Appointment</span>
        </button>
      </div>

      {/* ── Filter Tabs: All, Scheduled, Confirmed, Completed, Cancelled ── */}
      <div className="hc-appts-toolbar">
        <div className="hc-status-tabs">
          {["All", "Scheduled", "Confirmed", "Completed", "Cancelled"].map((tab) => {
            const count = combinedAppointments.filter(
              (a) => tab === "All" || a.status === tab.toUpperCase()
            ).length;
            return (
              <button
                key={tab}
                type="button"
                className={`hc-status-tab ${activeFilter === tab ? "active" : ""}`}
                onClick={() => setActiveFilter(tab)}
              >
                <span>{tab}</span>
                <span className="hc-status-count">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="hc-appts-search-row">
          <div className="hc-search-field">
            <Search size={15} className="hc-field-icon" />
            <input
              type="text"
              placeholder="Search by doctor, pet or clinic..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="hc-filter-select"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="All">All Clinics</option>
            <option value="BTM Layout">BTM Layout</option>
            <option value="Indiranagar">Indiranagar</option>
            <option value="Koramangala">Koramangala</option>
            <option value="Whitefield">Whitefield</option>
            <option value="HSR Layout">HSR Layout</option>
            <option value="Jayanagar">Jayanagar</option>
          </select>
        </div>
      </div>

      {/* ── Appointment Cards Grid ── */}
      {filteredAppointments.length === 0 ? (
        <div className="hc-empty-state">
          <div className="hc-empty-icon-wrap">
            <CalendarDays size={36} />
          </div>
          <h3>No appointments found</h3>
          <p>No consultations match the selected status or search filter.</p>
          <button
            type="button"
            className="hc-btn-secondary"
            onClick={() => {
              setActiveFilter("All");
              setSearchTerm("");
              setSelectedLocation("All");
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="hc-appts-grid">
          {filteredAppointments.map((appt) => (
            <div className="hc-appt-card" key={appt.id}>
              {/* Doctor Header */}
              <div className="hc-appt-doc-row">
                <DoctorAvatar name={appt.doctorName} size={46} />
                <div className="hc-appt-doc-info">
                  <h4 className="hc-doc-title">{appt.doctorName}</h4>
                  <span className="hc-doc-specialty">{appt.specialization}</span>
                </div>
                <span className={`hc-badge hc-badge-${appt.status.toLowerCase()}`}>
                  ● {appt.status}
                </span>
              </div>

              {/* Patient / Pet Box */}
              <div className="hc-appt-pet-box">
                <div className="hc-pet-label-row">
                  <span className="hc-pet-main-name">{appt.petName}</span>
                  <span className="hc-pet-type-tag">{appt.petType}</span>
                </div>
                <div className="hc-pet-parent-name">
                  Pet Parent: <strong>{appt.parentName}</strong>
                </div>
              </div>

              {/* Time & Clinic Location */}
              <div className="hc-appt-time-loc">
                <div className="hc-appt-time-chip">
                  <Clock size={13} className="hc-icon-blue" />
                  <strong>{appt.time}</strong>
                </div>
                <div className="hc-appt-loc-chip">
                  <MapPin size={13} className="hc-icon-gray" />
                  <span>{appt.location}</span>
                </div>
              </div>

              {/* Action Buttons: View & Reschedule */}
              <div className="hc-appt-card-actions">
                <button
                  type="button"
                  className="hc-btn-appt-view"
                  onClick={() => setActiveAppointment(appt)}
                >
                  View
                </button>
                <button
                  type="button"
                  className="hc-btn-appt-reschedule"
                  onClick={() => {
                    const newTime = prompt(`Reschedule appointment for ${appt.petName}:`, appt.time);
                    if (newTime) {
                      alert(`Appointment rescheduled to ${newTime}`);
                    }
                  }}
                >
                  Reschedule
                </button>
              </div>

              {/* CRUD Mini Buttons */}
              {appt._raw && (
                <div className="hc-appt-crud-row">
                  <button
                    type="button"
                    className="hc-btn-icon-sm"
                    onClick={() => onEdit(appt._raw)}
                    title="Edit Record"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    className="hc-btn-icon-sm danger"
                    onClick={() => onDelete(appt._raw)}
                    title="Delete Record"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Appointment Detail Modal ── */}
      {activeAppointment && (
        <div className="hc-modal-backdrop" onClick={() => setActiveAppointment(null)}>
          <div
            className="hc-appt-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hc-modal-header">
              <span className="hc-drawer-tag">APPOINTMENT DETAILS</span>
              <button
                type="button"
                className="hc-btn-close"
                onClick={() => setActiveAppointment(null)}
              >
                ✕
              </button>
            </div>

            <div className="hc-appt-modal-body">
              <div className="hc-appt-modal-top">
                <div className="hc-modal-doc-block">
                  <DoctorAvatar name={activeAppointment.doctorName} size={54} />
                  <div>
                    <h4>{activeAppointment.doctorName}</h4>
                    <p>{activeAppointment.specialization}</p>
                    <span className="hc-modal-clinic">{activeAppointment.location}</span>
                  </div>
                </div>
                <span className={`hc-badge hc-badge-${activeAppointment.status.toLowerCase()}`}>
                  ● {activeAppointment.status}
                </span>
              </div>

              <div className="hc-appt-modal-pet">
                <h5>Patient Information</h5>
                <p>Pet Name: <strong>{activeAppointment.petName}</strong> ({activeAppointment.petType})</p>
                <p>Pet Parent: <strong>{activeAppointment.parentName}</strong></p>
                <p>Scheduled Slot: <strong>{activeAppointment.date} at {activeAppointment.time}</strong></p>
              </div>

              <div className="hc-appt-modal-clinical">
                <h5>Clinical Purpose & Instructions</h5>
                <p><strong>Type:</strong> {activeAppointment.consultationType}</p>
                <p><strong>Clinical Notes:</strong> {activeAppointment.notes}</p>
              </div>
            </div>

            <div className="hc-modal-footer">
              <button
                type="button"
                className="hc-btn-secondary"
                onClick={() => setActiveAppointment(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="hc-btn-primary"
                onClick={() => {
                  alert(`Starting consultation session for ${activeAppointment.petName}`);
                  setActiveAppointment(null);
                }}
              >
                Start Consultation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
