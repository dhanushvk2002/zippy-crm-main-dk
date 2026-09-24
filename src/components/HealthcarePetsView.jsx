import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Heart,
  Calendar,
  User,
  Activity,
  FileText,
  Syringe,
  Pill,
  Clock,
  Weight,
  Droplet,
  CheckCircle2,
  X,
  Edit2,
  Trash2,
  AlertCircle,
  LayoutGrid,
  List as ListIcon,
} from "lucide-react";
import "./HealthcarePetsView.css";

const BENCHMARK_PETS = [
  {
    id: 301,
    name: "Bruno",
    species: "Dog",
    breed: "Golden Retriever",
    gender: "Male",
    age: "4 years",
    owner: "Arun Kumar",
    ownerPhone: "+91 98451 22334",
    lastVisit: "18 Sep 2026",
    nextAppointment: "28 Sep 2026",
    status: "Healthy",
    weight: "24.5 kg",
    bloodGroup: "DEA 1.1 Positive",
    microchipId: "985-1410-0982-110",
    avatarEmoji: "🐕",
    allergies: "None reported",
    chronicConditions: "Mild seasonal flea dermatitis",
  },
  {
    id: 302,
    name: "Bella",
    species: "Cat",
    breed: "Persian Longhair",
    gender: "Female",
    age: "2.5 years",
    owner: "Arun Kumar",
    ownerPhone: "+91 98451 22334",
    lastVisit: "12 Sep 2026",
    nextAppointment: "15 Oct 2026",
    status: "Healthy",
    weight: "4.2 kg",
    bloodGroup: "Type A",
    microchipId: "985-1410-0982-111",
    avatarEmoji: "🐈",
    allergies: "Beef protein sensitivity",
    chronicConditions: "None",
  },
  {
    id: 303,
    name: "Milo",
    species: "Dog",
    breed: "Beagle",
    gender: "Male",
    age: "3 years",
    owner: "Sneha Rao",
    ownerPhone: "+91 99001 88776",
    lastVisit: "14 Sep 2026",
    nextAppointment: "04 Oct 2026",
    status: "Observation",
    weight: "11.8 kg",
    bloodGroup: "DEA 1.1 Negative",
    microchipId: "985-1410-0881-229",
    avatarEmoji: "🐶",
    allergies: "Pollen allergy",
    chronicConditions: "Under observation for mild ear infection",
  },
  {
    id: 304,
    name: "Rocky",
    species: "Dog",
    breed: "German Shepherd",
    gender: "Male",
    age: "5 years",
    owner: "Vikram Das",
    ownerPhone: "+91 97410 44552",
    lastVisit: "02 Sep 2026",
    nextAppointment: "20 Oct 2026",
    status: "Healthy",
    weight: "34.0 kg",
    bloodGroup: "DEA 1.1 Positive",
    microchipId: "985-1410-0773-451",
    avatarEmoji: "🐕‍🦺",
    allergies: "None",
    chronicConditions: "Hip dysplasia screening passed",
  },
  {
    id: 305,
    name: "Coco",
    species: "Bird",
    breed: "African Grey Parrot",
    gender: "Female",
    age: "6 years",
    owner: "Vikram Das",
    ownerPhone: "+91 97410 44552",
    lastVisit: "22 Aug 2026",
    nextAppointment: "18 Nov 2026",
    status: "Healthy",
    weight: "480 g",
    bloodGroup: "Avian Typing",
    microchipId: "Ring #AGP-4402",
    avatarEmoji: "🦜",
    allergies: "None",
    chronicConditions: "Healthy plumage & beak structure",
  },
  {
    id: 306,
    name: "Leo",
    species: "Dog",
    breed: "Labrador Retriever",
    gender: "Male",
    age: "1.5 years",
    owner: "Pooja Hegde",
    ownerPhone: "+91 98860 11992",
    lastVisit: "28 Aug 2026",
    nextAppointment: "12 Oct 2026",
    status: "Healthy",
    weight: "27.2 kg",
    bloodGroup: "DEA 1.1 Positive",
    microchipId: "985-1410-0662-990",
    avatarEmoji: "🦮",
    allergies: "None",
    chronicConditions: "Active puppy vaccination schedule completed",
  },
];

export default function HealthcarePetsView({
  records = [],
  onAddNew = () => {},
  onEdit = () => {},
  onDelete = () => {},
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecies, setSelectedSpecies] = useState("All");
  const [selectedBreed, setSelectedBreed] = useState("All");
  const [selectedGender, setSelectedGender] = useState("All");
  const [selectedAge, setSelectedAge] = useState("All");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"

  // Active Pet for Section 9 Pet Profile Modal
  const [activePet, setActivePet] = useState(null);
  const [petModalTab, setPetModalTab] = useState("overview"); // overview, records, vaccinations, appointments, prescriptions

  const combinedPets = useMemo(() => {
    if (records && records.length > 0) {
      return records.map((rec, idx) => {
        const fallback = BENCHMARK_PETS[idx % BENCHMARK_PETS.length];
        return {
          id: rec.id || fallback.id,
          name: rec.name || rec.pet_name || fallback.name,
          species: rec.species || rec.type || fallback.species,
          breed: rec.breed || fallback.breed,
          gender: rec.gender || rec.sex || fallback.gender,
          age: rec.age ? `${rec.age} years` : fallback.age,
          owner: rec.owner_name || rec.parent_name || fallback.owner,
          ownerPhone: rec.owner_phone || fallback.ownerPhone,
          lastVisit: rec.last_visit || fallback.lastVisit,
          nextAppointment: rec.next_appointment || fallback.nextAppointment,
          status: rec.status || (rec.is_active === false ? "Under Care" : fallback.status),
          weight: rec.weight ? `${rec.weight} kg` : fallback.weight,
          bloodGroup: rec.blood_group || fallback.bloodGroup,
          microchipId: rec.microchip_id || fallback.microchipId,
          avatarEmoji: fallback.avatarEmoji,
          allergies: rec.allergies || fallback.allergies,
          chronicConditions: rec.chronic_conditions || fallback.chronicConditions,
          _raw: rec,
        };
      });
    }
    return BENCHMARK_PETS;
  }, [records]);

  const speciesList = useMemo(() => {
    const set = new Set(combinedPets.map((p) => p.species));
    return ["All", ...Array.from(set)];
  }, [combinedPets]);

  const breedsList = useMemo(() => {
    const set = new Set(combinedPets.map((p) => p.breed));
    return ["All", ...Array.from(set)];
  }, [combinedPets]);

  const filteredPets = useMemo(() => {
    return combinedPets.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.breed.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSpecies = selectedSpecies === "All" || p.species === selectedSpecies;
      const matchBreed = selectedBreed === "All" || p.breed === selectedBreed;
      const matchGender = selectedGender === "All" || p.gender === selectedGender;
      const matchAge =
        selectedAge === "All" ||
        (selectedAge === "young" ? parseFloat(p.age) <= 2 : parseFloat(p.age) > 2);
      return matchSearch && matchSpecies && matchBreed && matchGender && matchAge;
    });
  }, [combinedPets, searchTerm, selectedSpecies, selectedBreed, selectedGender, selectedAge]);

  return (
    <div className="hc-pets-view">
      {/* ── Page Header ── */}
      <div className="hc-page-header">
        <div>
          <h2 className="hc-view-title">Pets</h2>
          <p className="hc-view-subtitle">
            Veterinary patient electronic health records, breed analytics and visit histories.
          </p>
        </div>
        <button type="button" className="hc-btn-primary" onClick={onAddNew}>
          <Plus size={16} strokeWidth={2.5} />
          <span>Add Pet Patient</span>
        </button>
      </div>

      {/* ── Toolbar: Search & Filters ── */}
      <div className="hc-pets-toolbar">
        <div className="hc-search-field">
          <Search size={16} className="hc-field-icon" />
          <input
            type="text"
            placeholder="Search pets by name, breed, or owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="hc-filters-row">
          <select
            className="hc-filter-select"
            value={selectedSpecies}
            onChange={(e) => setSelectedSpecies(e.target.value)}
          >
            <option value="All">All Species</option>
            {speciesList.filter((s) => s !== "All").map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            className="hc-filter-select"
            value={selectedBreed}
            onChange={(e) => setSelectedBreed(e.target.value)}
          >
            <option value="All">All Breeds</option>
            {breedsList.filter((b) => b !== "All").map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            className="hc-filter-select"
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
          >
            <option value="All">Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          <select
            className="hc-filter-select"
            value={selectedAge}
            onChange={(e) => setSelectedAge(e.target.value)}
          >
            <option value="All">All Ages</option>
            <option value="young">Young (≤ 2 yrs)</option>
            <option value="adult">Adult (&gt; 2 yrs)</option>
          </select>

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
              className={`hc-switch-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
              title="Table View"
            >
              <ListIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Pets Grid / Table View ── */}
      {filteredPets.length === 0 ? (
        <div className="hc-empty-state">
          <div className="hc-empty-icon-wrap">
            <Heart size={36} />
          </div>
          <h3>No pet patients found</h3>
          <p>Try modifying your search or clearing your active filters.</p>
          <button
            type="button"
            className="hc-btn-secondary"
            onClick={() => {
              setSearchTerm("");
              setSelectedSpecies("All");
              setSelectedBreed("All");
              setSelectedGender("All");
              setSelectedAge("All");
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="hc-pets-grid">
          {filteredPets.map((pet) => (
            <div className="hc-pet-card" key={pet.id}>
              {/* Pet Card Header */}
              <div className="hc-pet-card-head">
                <div className="hc-pet-avatar-frame">
                  <span className="hc-pet-emoji">{pet.avatarEmoji}</span>
                </div>
                <div className="hc-pet-head-info">
                  <div className="hc-pet-name-row">
                    <h4 className="hc-pet-name">{pet.name}</h4>
                    <span
                      className={`hc-badge ${
                        pet.status === "Healthy" ? "hc-badge-success" : "hc-badge-warning"
                      }`}
                    >
                      ● {pet.status}
                    </span>
                  </div>
                  <span className="hc-pet-breed">
                    {pet.species} · {pet.breed}
                  </span>
                </div>
              </div>

              {/* Pet Attributes */}
              <div className="hc-pet-attributes">
                <div className="hc-attr-pill">
                  <span className="hc-attr-lbl">Age</span>
                  <span className="hc-attr-val">{pet.age}</span>
                </div>
                <div className="hc-attr-pill">
                  <span className="hc-attr-lbl">Gender</span>
                  <span className="hc-attr-val">{pet.gender}</span>
                </div>
                <div className="hc-attr-pill">
                  <span className="hc-attr-lbl">Weight</span>
                  <span className="hc-attr-val">{pet.weight}</span>
                </div>
              </div>

              {/* Owner and Last Visit */}
              <div className="hc-pet-meta-box">
                <div className="hc-pet-owner-row">
                  <User size={13} className="hc-meta-icon" />
                  <div>
                    <span className="hc-meta-title">Owner</span>
                    <strong className="hc-meta-name">{pet.owner}</strong>
                  </div>
                </div>
                <div className="hc-pet-visit-row">
                  <Calendar size={13} className="hc-meta-icon text-teal" />
                  <div>
                    <span className="hc-meta-title">Last Visit</span>
                    <strong className="hc-meta-date">{pet.lastVisit}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons: View Profile & Medical Records */}
              <div className="hc-pet-actions">
                <button
                  type="button"
                  className="hc-btn-pet-secondary"
                  onClick={() => {
                    setActivePet(pet);
                    setPetModalTab("overview");
                  }}
                >
                  View Profile
                </button>
                <button
                  type="button"
                  className="hc-btn-pet-primary"
                  onClick={() => {
                    setActivePet(pet);
                    setPetModalTab("records");
                  }}
                >
                  Medical Records
                </button>
              </div>

              {/* CRUD mini actions */}
              {pet._raw && (
                <div className="hc-pet-crud-row">
                  <button
                    type="button"
                    className="hc-btn-icon-sm"
                    onClick={() => onEdit(pet._raw)}
                    title="Edit Pet Record"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    className="hc-btn-icon-sm danger"
                    onClick={() => onDelete(pet._raw)}
                    title="Delete Pet Record"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="hc-table-container">
          <table className="hc-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Species / Breed</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Owner</th>
                <th>Last Visit</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPets.map((pet) => (
                <tr key={pet.id}>
                  <td>
                    <div className="hc-table-user-cell">
                      <span style={{ fontSize: "1.4rem" }}>{pet.avatarEmoji}</span>
                      <div>
                        <strong className="hc-user-name">{pet.name}</strong>
                        <span className="hc-user-sub">Chip: {pet.microchipId}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="hc-spec-pill">{pet.species}</span> {pet.breed}
                  </td>
                  <td>{pet.age}</td>
                  <td>{pet.gender}</td>
                  <td>
                    <div>
                      <strong>{pet.owner}</strong>
                      <span className="hc-user-sub">{pet.ownerPhone}</span>
                    </div>
                  </td>
                  <td>{pet.lastVisit}</td>
                  <td>
                    <span
                      className={`hc-badge ${
                        pet.status === "Healthy" ? "hc-badge-success" : "hc-badge-warning"
                      }`}
                    >
                      ● {pet.status}
                    </span>
                  </td>
                  <td>
                    <div className="hc-row-actions">
                      <button
                        type="button"
                        className="hc-btn-table-action"
                        onClick={() => {
                          setActivePet(pet);
                          setPetModalTab("overview");
                        }}
                      >
                        Profile
                      </button>
                      <button
                        type="button"
                        className="hc-btn-table-action primary"
                        onClick={() => {
                          setActivePet(pet);
                          setPetModalTab("records");
                        }}
                      >
                        Records
                      </button>
                      {pet._raw && (
                        <button
                          type="button"
                          className="hc-btn-table-icon"
                          onClick={() => onEdit(pet._raw)}
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

      {/* ── Section 9: Pet Profile Modal ── */}
      {activePet && (
        <div className="hc-modal-backdrop" onClick={() => setActivePet(null)}>
          <div
            className="hc-pet-profile-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="hc-pmodal-header">
              <div className="hc-pmodal-hero">
                <div className="hc-pmodal-avatar-frame">
                  <span className="hc-pmodal-emoji">{activePet.avatarEmoji}</span>
                </div>
                <div className="hc-pmodal-title-box">
                  <div className="hc-pmodal-name-row">
                    <h3>{activePet.name}</h3>
                    <span className="hc-badge hc-badge-success">● {activePet.status}</span>
                  </div>
                  <p className="hc-pmodal-breed">
                    {activePet.breed} · {activePet.gender} · {activePet.age}
                  </p>
                  <p className="hc-pmodal-owner">
                    Owner: <strong>{activePet.owner}</strong> ({activePet.ownerPhone})
                  </p>
                </div>
              </div>

              <div className="hc-pmodal-header-actions">
                <button
                  type="button"
                  className="hc-btn-primary"
                  onClick={() => alert(`Booking consultation for ${activePet.name}`)}
                >
                  Book Appointment
                </button>
                <button
                  type="button"
                  className="hc-btn-secondary"
                  onClick={() => alert(`Adding new medical record for ${activePet.name}`)}
                >
                  + Add Medical Record
                </button>
                <button
                  type="button"
                  className="hc-btn-close"
                  onClick={() => setActivePet(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Dashboard Vitals KPI Cards (Section 9 Requirement) */}
            <div className="hc-vitals-strip">
              <div className="hc-vital-card">
                <Weight size={18} className="hc-vital-icon text-blue" />
                <div>
                  <span className="hc-vital-lbl">Weight</span>
                  <span className="hc-vital-val">{activePet.weight}</span>
                </div>
              </div>

              <div className="hc-vital-card">
                <Droplet size={18} className="hc-vital-icon text-red" />
                <div>
                  <span className="hc-vital-lbl">Blood Group</span>
                  <span className="hc-vital-val">{activePet.bloodGroup}</span>
                </div>
              </div>

              <div className="hc-vital-card">
                <Calendar size={18} className="hc-vital-icon text-teal" />
                <div>
                  <span className="hc-vital-lbl">Last Visit</span>
                  <span className="hc-vital-val">{activePet.lastVisit}</span>
                </div>
              </div>

              <div className="hc-vital-card highlight">
                <Clock size={18} className="hc-vital-icon text-purple" />
                <div>
                  <span className="hc-vital-lbl">Next Appointment</span>
                  <span className="hc-vital-val">{activePet.nextAppointment}</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="hc-pmodal-tabs">
              {[
                { key: "overview", label: "Overview", icon: Activity },
                { key: "records", label: "Medical Records", icon: FileText },
                { key: "vaccinations", label: "Vaccinations", icon: Syringe },
                { key: "appointments", label: "Appointments", icon: Calendar },
                { key: "prescriptions", label: "Prescriptions", icon: Pill },
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={`hc-ptab-btn ${petModalTab === tab.key ? "active" : ""}`}
                    onClick={() => setPetModalTab(tab.key)}
                  >
                    <IconComponent size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            <div className="hc-pmodal-body">
              {petModalTab === "overview" && (
                <div className="hc-ptab-content">
                  <div className="hc-overview-grid">
                    <div className="hc-overview-card">
                      <h5>Microchip & Registration</h5>
                      <p><strong>Microchip ID:</strong> {activePet.microchipId}</p>
                      <p><strong>Species:</strong> {activePet.species}</p>
                      <p><strong>Breed:</strong> {activePet.breed}</p>
                      <p><strong>Neutered / Spayed:</strong> Yes (Certificate on file)</p>
                    </div>

                    <div className="hc-overview-card">
                      <h5>Clinical Flags & Allergies</h5>
                      <p><strong>Known Allergies:</strong> {activePet.allergies}</p>
                      <p><strong>Chronic Conditions:</strong> {activePet.chronicConditions}</p>
                      <p><strong>Dietary Protocol:</strong> Royal Canin Veterinary Diet</p>
                    </div>
                  </div>

                  <div className="hc-overview-section">
                    <h5>Attending Veterinarian</h5>
                    <div className="hc-attending-doc">
                      <div className="hc-adoc-avatar">👩‍⚕️</div>
                      <div>
                        <strong>Dr. Priya Kumar</strong> · Veterinary Surgeon
                        <p>BTM Layout Multi-Specialty Pet Hospital</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {petModalTab === "records" && (
                <div className="hc-ptab-content">
                  <div className="hc-med-records-list">
                    <div className="hc-med-card">
                      <div className="hc-med-card-top">
                        <span className="hc-med-date">18 Sep 2026</span>
                        <span className="hc-badge hc-badge-success">COMPLETED</span>
                      </div>
                      <h4>General Health & Mobility Examination</h4>
                      <p className="hc-med-doc">Attending: <strong>Dr. Priya Kumar</strong></p>
                      <div className="hc-med-section">
                        <strong>Diagnosis:</strong>
                        <p>Healthy vital signs, cardiac auscultation clear. Normal gait, healthy joint mobility.</p>
                      </div>
                      <div className="hc-med-section">
                        <strong>Prescription:</strong>
                        <p>Multivitamin chewables 1 tab daily with morning meal (30 days).</p>
                      </div>
                      <div className="hc-med-section">
                        <strong>Clinical Notes:</strong>
                        <p>Next routine dental grading scheduled for early next quarter.</p>
                      </div>
                    </div>

                    <div className="hc-med-card">
                      <div className="hc-med-card-top">
                        <span className="hc-med-date">12 May 2026</span>
                        <span className="hc-badge hc-badge-info">RESOLVED</span>
                      </div>
                      <h4>Dermatology & Skin Allergy Consultation</h4>
                      <p className="hc-med-doc">Attending: <strong>Dr. Rajesh Sharma</strong></p>
                      <div className="hc-med-section">
                        <strong>Diagnosis:</strong>
                        <p>Mild seasonal flea allergy dermatitis on lumbar region.</p>
                      </div>
                      <div className="hc-med-section">
                        <strong>Prescription:</strong>
                        <p>Topical medicated chlorhexidine shampoo twice weekly + Bravecto chewable.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {petModalTab === "vaccinations" && (
                <div className="hc-ptab-content">
                  <div className="hc-vaccines-grid">
                    <div className="hc-vaccine-card done">
                      <div className="hc-vac-header">
                        <span className="hc-vac-name">Rabies Inactivated Vaccine</span>
                        <span className="hc-badge hc-badge-success">Completed</span>
                      </div>
                      <p>Administered: 18 Sep 2026 · Dr. Priya Kumar</p>
                      <p className="hc-vac-next">Next Due: <strong>18 Sep 2027</strong></p>
                    </div>

                    <div className="hc-vaccine-card warning">
                      <div className="hc-vac-header">
                        <span className="hc-vac-name">DHPP (Canine Distemper & Parvo)</span>
                        <span className="hc-badge hc-badge-warning">Due Soon</span>
                      </div>
                      <p>Last: 28 Sep 2025 · Dr. Rajesh Sharma</p>
                      <p className="hc-vac-next">Next Due: <strong>28 Sep 2026</strong> (Scheduled)</p>
                    </div>

                    <div className="hc-vaccine-card done">
                      <div className="hc-vac-header">
                        <span className="hc-vac-name">Bordetella Bronchiseptica</span>
                        <span className="hc-badge hc-badge-success">Completed</span>
                      </div>
                      <p>Administered: 10 Aug 2026 · Dr. Priya Kumar</p>
                      <p className="hc-vac-next">Next Due: <strong>10 Aug 2027</strong></p>
                    </div>
                  </div>
                </div>
              )}

              {petModalTab === "appointments" && (
                <div className="hc-ptab-content">
                  <div className="hc-pet-appts-list">
                    <div className="hc-app-item">
                      <div className="hc-app-date-box">
                        <span className="hc-app-day">28</span>
                        <span className="hc-app-month">SEP</span>
                      </div>
                      <div className="hc-app-details">
                        <h5>Annual DHPP Booster & Vitals Review</h5>
                        <p>10:30 AM · Dr. Priya Kumar · BTM Layout Multi-Specialty Clinic</p>
                      </div>
                      <span className="hc-badge hc-badge-info">CONFIRMED</span>
                    </div>

                    <div className="hc-app-item done">
                      <div className="hc-app-date-box">
                        <span className="hc-app-day">18</span>
                        <span className="hc-app-month">SEP</span>
                      </div>
                      <div className="hc-app-details">
                        <h5>Routine Bi-Annual Health Checkup</h5>
                        <p>11:00 AM · Dr. Priya Kumar · Completed</p>
                      </div>
                      <span className="hc-badge hc-badge-success">COMPLETED</span>
                    </div>
                  </div>
                </div>
              )}

              {petModalTab === "prescriptions" && (
                <div className="hc-ptab-content">
                  <div className="hc-rx-list">
                    <div className="hc-rx-card">
                      <div className="hc-rx-header">
                        <Pill size={16} className="hc-rx-icon" />
                        <div>
                          <h6>Canine Omega-3 Vital Coat & Joint Formula</h6>
                          <span>1 capsule daily with food · 60 days</span>
                        </div>
                        <span className="hc-badge hc-badge-success">Active</span>
                      </div>
                      <p className="hc-rx-meta">Prescribed by Dr. Priya Kumar on 18 Sep 2026</p>
                    </div>

                    <div className="hc-rx-card">
                      <div className="hc-rx-header">
                        <Pill size={16} className="hc-rx-icon" />
                        <div>
                          <h6>Bravecto Chewable (20-40kg)</h6>
                          <span>1 chewable tab every 12 weeks</span>
                        </div>
                        <span className="hc-badge hc-badge-success">Active</span>
                      </div>
                      <p className="hc-rx-meta">Prescribed by Dr. Rajesh Sharma on 12 May 2026</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="hc-pmodal-footer">
              <button
                type="button"
                className="hc-btn-secondary"
                onClick={() => setActivePet(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="hc-btn-primary"
                onClick={() => {
                  alert(`Exporting complete PDF clinical case file for ${activePet.name}`);
                }}
              >
                Download Health Record PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
