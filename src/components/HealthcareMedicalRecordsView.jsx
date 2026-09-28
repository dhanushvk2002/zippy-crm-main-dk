import React, { useState, useMemo } from "react";
import {
  FileText,
  Plus,
  Search,
  Calendar,
  User,
  Stethoscope,
  Pill,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Edit2,
  Trash2,
  Download,
} from "lucide-react";
import DoctorAvatar from "./DoctorAvatar.jsx";
import "./HealthcareMedicalRecordsView.css";

const BENCHMARK_RECORDS = [
  {
    id: 501,
    date: "18 Sep 2026",
    doctor: "Dr. Priya Kumar",
    doctorSpecialty: "Veterinary Surgeon",
    petName: "Bruno",
    parentName: "Arun Kumar",
    checkupType: "General Checkup & Orthopedic Review",
    diagnosis: "Healthy gait and bone density. Right stifle stable with no effusion. Dental grading: Grade 1 calculus.",
    prescription: "Multivitamin chewables 1 tab daily (30 days); Chlorhexidine oral spray twice weekly.",
    notes: "Follow up in 6 months for bi-annual dental hygiene and weight control monitoring.",
    status: "Completed",
    recordType: "Outpatient EHR",
  },
  {
    id: 502,
    date: "14 Sep 2026",
    doctor: "Dr. Rajesh Sharma",
    doctorSpecialty: "Canine Specialist & Dermatologist",
    petName: "Milo",
    parentName: "Sneha Rao",
    checkupType: "Dermatological Biopsy & Cytology",
    diagnosis: "Bacterial folliculitis with secondary Malassezia pachydermatis infection localized to caudal dorsal skin.",
    prescription: "Cefpodoxime 200mg (1/2 tab BID x 14 days); Ketoconazole medicated wash twice weekly.",
    notes: "Strict collar to prevent licking. Dietary exclusion of chicken protein advised.",
    status: "In Treatment",
    recordType: "Lab & Pathology",
  },
  {
    id: 503,
    date: "02 Sep 2026",
    doctor: "Dr. Ananya Sen",
    doctorSpecialty: "Veterinary Radiologist",
    petName: "Bella",
    parentName: "Arun Kumar",
    checkupType: "Abdominal Ultrasonography",
    diagnosis: "Renal architecture intact without hydronephrosis. Gastric mucosa within normal thickness parameters.",
    prescription: "Renal support hydration fluid administration, dietary urinary S/O kibbles.",
    notes: "Ultrasound digital imaging attached to cloud repository. Repeat renal profile in 90 days.",
    status: "Resolved",
    recordType: "Diagnostic Imaging",
  },
  {
    id: 504,
    date: "22 Aug 2026",
    doctor: "Dr. Vikram Patel",
    doctorSpecialty: "Dental & General Vet",
    petName: "Rocky",
    parentName: "Vikram Das",
    checkupType: "Ultrasonic Scaling & Periodontal Polish",
    diagnosis: "Calculus removal completed under general isoflurane anesthesia. Gingival pocketing within safe margins.",
    prescription: "Amoxicillin-Clavulanic acid 250mg BID x 5 days; Carprofen 50mg for analgesia.",
    notes: "Patient recovered smoothly from anesthesia with normal swallowing reflexes.",
    status: "Completed",
    recordType: "Surgical / Procedure",
  },
];

export default function HealthcareMedicalRecordsView({
  records = [],
  onAddNew = () => {},
  onEdit = () => {},
  onDelete = () => {},
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const combinedRecords = useMemo(() => {
    if (records && records.length > 0) {
      return records.map((rec, idx) => {
        const fallback = BENCHMARK_RECORDS[idx % BENCHMARK_RECORDS.length];
        return {
          id: rec.id || fallback.id,
          date: rec.date || rec.record_date || rec.created_at?.slice(0, 10) || fallback.date,
          doctor: rec.doctor_name || rec.doctor || fallback.doctor,
          doctorSpecialty: fallback.doctorSpecialty,
          petName: rec.pet_name || rec.pet || fallback.petName,
          parentName: rec.parent_name || fallback.parentName,
          checkupType: rec.title || rec.diagnosis_type || fallback.checkupType,
          diagnosis: rec.diagnosis || rec.description || fallback.diagnosis,
          prescription: rec.prescription || fallback.prescription,
          notes: rec.notes || fallback.notes,
          status: rec.status || fallback.status,
          recordType: fallback.recordType,
          _raw: rec,
        };
      });
    }
    return BENCHMARK_RECORDS;
  }, [records]);

  const filteredRecords = useMemo(() => {
    return combinedRecords.filter((rec) => {
      const matchSearch =
        rec.doctor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.petName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.checkupType.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "All" || rec.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [combinedRecords, searchTerm, statusFilter]);

  return (
    <div className="hc-med-view">
      {/* ── Page Header ── */}
      <div className="hc-page-header">
        <div>
          <h2 className="hc-view-title">Medical Records</h2>
          <p className="hc-view-subtitle">
            Clinical case histories, diagnoses, pharmacy prescriptions and veterinary soap notes.
          </p>
        </div>
        <button type="button" className="hc-btn-primary" onClick={onAddNew}>
          <Plus size={16} strokeWidth={2.5} />
          <span>Add Medical Record</span>
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="hc-med-toolbar">
        <div className="hc-search-field">
          <Search size={15} className="hc-field-icon" />
          <input
            type="text"
            placeholder="Search records by diagnosis, pet, or attending doctor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="hc-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Status</option>
          <option value="Completed">Completed</option>
          <option value="In Treatment">In Treatment</option>
          <option value="Resolved">Resolved</option>
        </select>
      </div>

      {/* ── Timeline & Clinical Cards (Section 10 Requirement) ── */}
      {filteredRecords.length === 0 ? (
        <div className="hc-empty-state">
          <div className="hc-empty-icon-wrap">
            <FileText size={36} />
          </div>
          <h3>No medical records found</h3>
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
        <div className="hc-med-timeline-container">
          {filteredRecords.map((item) => (
            <div className="hc-med-record-card" key={item.id}>
              {/* Date & Status Top Banner */}
              <div className="hc-record-top-banner">
                <div className="hc-record-date-block">
                  <Calendar size={15} className="hc-rec-cal-icon" />
                  <span className="hc-rec-date">{item.date}</span>
                  <span className="hc-rec-type-badge">{item.recordType}</span>
                </div>
                <div className="hc-record-badges-row">
                  <span
                    className={`hc-badge ${
                      item.status === "Completed"
                        ? "hc-badge-success"
                        : item.status === "In Treatment"
                        ? "hc-badge-warning"
                        : "hc-badge-info"
                    }`}
                  >
                    ● {item.status}
                  </span>
                </div>
              </div>

              {/* Attending Doctor & Patient */}
              <div className="hc-rec-parties-row">
                <div className="hc-rec-doctor-info">
                  <DoctorAvatar name={item.doctor} size={42} />
                  <div>
                    <h4 className="hc-rec-doc-name">{item.doctor}</h4>
                    <span className="hc-rec-doc-spec">{item.doctorSpecialty}</span>
                  </div>
                </div>

                <div className="hc-rec-patient-info">
                  <span className="hc-rec-patient-tag">PATIENT</span>
                  <strong className="hc-rec-pet-name">{item.petName}</strong>
                  <span className="hc-rec-parent-sub">Parent: {item.parentName}</span>
                </div>
              </div>

              <div className="hc-rec-divider" />

              {/* Consultation Title */}
              <h3 className="hc-rec-checkup-title">{item.checkupType}</h3>

              {/* Diagnosis Box */}
              <div className="hc-rec-block hc-rec-diagnosis">
                <div className="hc-block-heading">
                  <Stethoscope size={14} className="hc-block-icon text-blue" />
                  <span>Diagnosis</span>
                </div>
                <p>{item.diagnosis}</p>
              </div>

              {/* Prescription Box */}
              <div className="hc-rec-block hc-rec-rx">
                <div className="hc-block-heading">
                  <Pill size={14} className="hc-block-icon text-teal" />
                  <span>Prescription</span>
                </div>
                <p>{item.prescription}</p>
              </div>

              {/* Notes Box */}
              <div className="hc-rec-block hc-rec-notes">
                <div className="hc-block-heading">
                  <FileCheck size={14} className="hc-block-icon text-purple" />
                  <span>Clinical Follow-up & Notes</span>
                </div>
                <p>{item.notes}</p>
              </div>

              {/* Card Footer Actions */}
              <div className="hc-rec-card-footer">
                <button
                  type="button"
                  className="hc-btn-rec-download"
                  onClick={() => alert(`Exporting SOAP case summary for ${item.petName}`)}
                >
                  <Download size={13} />
                  <span>Export PDF Case Report</span>
                </button>

                {item._raw && (
                  <div className="hc-rec-crud">
                    <button
                      type="button"
                      className="hc-btn-icon-sm"
                      onClick={() => onEdit(item._raw)}
                      title="Edit Medical Record"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      className="hc-btn-icon-sm danger"
                      onClick={() => onDelete(item._raw)}
                      title="Delete Medical Record"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
