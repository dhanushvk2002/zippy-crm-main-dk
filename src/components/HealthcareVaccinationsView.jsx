import React, { useState, useMemo } from "react";
import {
  Syringe,
  Plus,
  Search,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Edit2,
  Trash2,
} from "lucide-react";
import DoctorAvatar from "./DoctorAvatar.jsx";
import "./HealthcareVaccinationsView.css";

const BENCHMARK_VACCINATIONS = [
  {
    id: 601,
    vaccine: "Rabies Inactivated (Nobivac)",
    pet: "Bruno",
    petBreed: "Golden Retriever",
    parent: "Arun Kumar",
    date: "18 Sep 2026",
    nextDue: "18 Sep 2027",
    doctor: "Dr. Priya Kumar",
    status: "Completed",
    batchNumber: "NB-RAB-88019",
    dosage: "1.0 ml Subcutaneous",
  },
  {
    id: 602,
    vaccine: "DHPP (Distemper, Hepatitis, Parvo)",
    pet: "Bruno",
    petBreed: "Golden Retriever",
    parent: "Arun Kumar",
    date: "28 Sep 2025",
    nextDue: "28 Sep 2026",
    doctor: "Dr. Rajesh Sharma",
    status: "Due Soon",
    batchNumber: "DHPP-CAN-1022",
    dosage: "1.0 ml Intramuscular",
  },
  {
    id: 603,
    vaccine: "Bordetella (Kennel Cough)",
    pet: "Milo",
    petBreed: "Beagle",
    parent: "Sneha Rao",
    date: "10 Aug 2026",
    nextDue: "10 Aug 2027",
    doctor: "Dr. Priya Kumar",
    status: "Completed",
    batchNumber: "KC-BORD-4491",
    dosage: "0.5 ml Intranasal",
  },
  {
    id: 604,
    vaccine: "Feline FVRCP (3-in-1)",
    pet: "Bella",
    petBreed: "Persian Cat",
    parent: "Arun Kumar",
    date: "12 May 2026",
    nextDue: "12 May 2027",
    doctor: "Dr. Ananya Sen",
    status: "Completed",
    batchNumber: "FEL-FVR-9011",
    dosage: "1.0 ml Subcutaneous",
  },
  {
    id: 605,
    vaccine: "Canine Leptospirosis 4-Way",
    pet: "Rocky",
    petBreed: "German Shepherd",
    parent: "Vikram Das",
    date: "15 Oct 2025",
    nextDue: "15 Oct 2026",
    doctor: "Dr. Vikram Patel",
    status: "Due Soon",
    batchNumber: "LEPTO-4W-3301",
    dosage: "1.0 ml Subcutaneous",
  },
  {
    id: 606,
    vaccine: "Canine Coronavirus (CCV)",
    pet: "Leo",
    petBreed: "Labrador",
    parent: "Pooja Hegde",
    date: "04 Jan 2026",
    nextDue: "04 Jan 2027",
    doctor: "Dr. Neha Varma",
    status: "Completed",
    batchNumber: "CCV-LAB-7712",
    dosage: "1.0 ml Subcutaneous",
  },
];

export default function HealthcareVaccinationsView({
  records = [],
  onAddNew = () => {},
  onEdit = () => {},
  onDelete = () => {},
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const combinedVaccinations = useMemo(() => {
    if (records && records.length > 0) {
      return records.map((rec, idx) => {
        const fallback = BENCHMARK_VACCINATIONS[idx % BENCHMARK_VACCINATIONS.length];
        return {
          id: rec.id || fallback.id,
          vaccine: rec.vaccine_name || rec.name || fallback.vaccine,
          pet: rec.pet_name || rec.pet || fallback.pet,
          petBreed: fallback.petBreed,
          parent: rec.parent_name || fallback.parent,
          date: rec.administered_date || rec.date || fallback.date,
          nextDue: rec.next_due_date || rec.next_due || fallback.nextDue,
          doctor: rec.doctor_name || rec.doctor || fallback.doctor,
          status: rec.status || fallback.status,
          batchNumber: rec.batch_number || fallback.batchNumber,
          dosage: fallback.dosage,
          _raw: rec,
        };
      });
    }
    return BENCHMARK_VACCINATIONS;
  }, [records]);

  const filteredVaccinations = useMemo(() => {
    return combinedVaccinations.filter((item) => {
      const matchSearch =
        item.vaccine.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.pet.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.doctor.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "All" || item.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [combinedVaccinations, searchTerm, statusFilter]);

  return (
    <div className="hc-vac-view">
      {/* ── Page Header ── */}
      <div className="hc-page-header">
        <div>
          <h2 className="hc-view-title">Vaccinations</h2>
          <p className="hc-view-subtitle">
            Immunization records, booster schedules and rabies prophylaxis management.
          </p>
        </div>
        <button type="button" className="hc-btn-primary" onClick={onAddNew}>
          <Plus size={16} strokeWidth={2.5} />
          <span>Record Vaccination</span>
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="hc-vac-toolbar">
        <div className="hc-search-field">
          <Search size={15} className="hc-field-icon" />
          <input
            type="text"
            placeholder="Search by vaccine, pet, or veterinarian..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="hc-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Completed">Completed</option>
          <option value="Due Soon">Due Soon</option>
          <option value="Overdue">Overdue</option>
        </select>
      </div>

      {/* ── Cards Grid (Section 11 Requirement) ── */}
      {filteredVaccinations.length === 0 ? (
        <div className="hc-empty-state">
          <div className="hc-empty-icon-wrap">
            <Syringe size={36} />
          </div>
          <h3>No vaccination entries found</h3>
          <p>Try modifying your search query or reset status filters.</p>
          <button
            type="button"
            className="hc-btn-secondary"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("All");
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="hc-vac-grid">
          {filteredVaccinations.map((vac) => {
            const isCompleted = vac.status === "Completed";
            const isDueSoon = vac.status === "Due Soon";

            return (
              <div
                className={`hc-vac-card ${
                  isCompleted ? "status-completed" : isDueSoon ? "status-duesoon" : "status-overdue"
                }`}
                key={vac.id}
              >
                {/* Header */}
                <div className="hc-vac-card-head">
                  <div className="hc-vac-icon-wrap">
                    <Syringe size={20} />
                  </div>
                  <span
                    className={`hc-badge ${
                      isCompleted
                        ? "hc-badge-success"
                        : isDueSoon
                        ? "hc-badge-warning"
                        : "hc-badge-danger"
                    }`}
                  >
                    ● {vac.status}
                  </span>
                </div>

                {/* Vaccine Name */}
                <h4 className="hc-vac-title">{vac.vaccine}</h4>
                <p className="hc-vac-dosage">{vac.dosage} · Batch: {vac.batchNumber}</p>

                {/* Pet & Owner Box */}
                <div className="hc-vac-pet-box">
                  <div className="hc-vac-pet-main">
                    <strong className="hc-vac-pet-name">{vac.pet}</strong>
                    <span className="hc-vac-pet-breed">({vac.petBreed})</span>
                  </div>
                  <span className="hc-vac-parent">Owner: {vac.parent}</span>
                </div>

                {/* Dates & Doctor Details */}
                <div className="hc-vac-dates-grid">
                  <div className="hc-vac-date-cell">
                    <span className="hc-vdate-lbl">Administered</span>
                    <strong className="hc-vdate-val">{vac.date}</strong>
                  </div>
                  <div className="hc-vac-date-cell highlight">
                    <span className="hc-vdate-lbl">Next Due</span>
                    <strong className="hc-vdate-val text-blue">{vac.nextDue}</strong>
                  </div>
                </div>

                <div className="hc-vac-doctor-row">
                  <DoctorAvatar name={vac.doctor} size={28} />
                  <span className="hc-vac-doc-name">{vac.doctor}</span>
                </div>

                {/* CRUD Mini Buttons */}
                {vac._raw && (
                  <div className="hc-vac-crud-row">
                    <button
                      type="button"
                      className="hc-btn-icon-sm"
                      onClick={() => onEdit(vac._raw)}
                      title="Edit Vaccination"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      className="hc-btn-icon-sm danger"
                      onClick={() => onDelete(vac._raw)}
                      title="Delete Record"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
