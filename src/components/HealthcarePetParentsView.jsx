import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Heart,
  LayoutGrid,
  List as ListIcon,
  Users,
  ChevronRight,
  Edit2,
  Trash2,
} from "lucide-react";
import DoctorAvatar from "./DoctorAvatar.jsx";
import "./HealthcarePetParentsView.css";

const BENCHMARK_PET_PARENTS = [
  {
    id: 201,
    name: "Arun Kumar",
    phone: "+91 98451 22334",
    email: "arun.kumar@gmail.com",
    location: "BTM Layout, Bangalore",
    petsCount: 2,
    petsNames: "Bruno (Dog), Bella (Cat)",
    lastAppointment: "18 Sep 2026",
    status: "Active",
  },
  {
    id: 202,
    name: "Sneha Rao",
    phone: "+91 99001 88776",
    email: "sneha.rao@outlook.com",
    location: "Koramangala, Bangalore",
    petsCount: 1,
    petsNames: "Milo (Beagle)",
    lastAppointment: "14 Sep 2026",
    status: "Active",
  },
  {
    id: 203,
    name: "Vikram Das",
    phone: "+91 97410 44552",
    email: "vikram.das@yahoo.com",
    location: "Indiranagar, Bangalore",
    petsCount: 3,
    petsNames: "Rocky, Simba, Coco",
    lastAppointment: "02 Sep 2026",
    status: "Active",
  },
  {
    id: 204,
    name: "Pooja Hegde",
    phone: "+91 98860 11992",
    email: "pooja.hegde@gmail.com",
    location: "HSR Layout, Bangalore",
    petsCount: 1,
    petsNames: "Leo (Labrador)",
    lastAppointment: "28 Aug 2026",
    status: "Active",
  },
  {
    id: 205,
    name: "Karthik Nair",
    phone: "+91 96112 33445",
    email: "karthik.n@gmail.com",
    location: "Whitefield, Bangalore",
    petsCount: 2,
    petsNames: "Daisy, Toby",
    lastAppointment: "15 Aug 2026",
    status: "Inactive",
  },
  {
    id: 206,
    name: "Divya Menon",
    phone: "+91 94481 99221",
    email: "divya.menon@gmail.com",
    location: "Jayanagar, Bangalore",
    petsCount: 1,
    petsNames: "Ginger (Persian)",
    lastAppointment: "05 Aug 2026",
    status: "Active",
  },
];

export default function HealthcarePetParentsView({
  records = [],
  onAddNew = () => {},
  onEdit = () => {},
  onDelete = () => {},
}) {
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "table"
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLoc, setSelectedLoc] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedPetsCount, setSelectedPetsCount] = useState("All");

  const combinedParents = useMemo(() => {
    if (records && records.length > 0) {
      return records.map((rec, idx) => {
        const fallback = BENCHMARK_PET_PARENTS[idx % BENCHMARK_PET_PARENTS.length];
        return {
          id: rec.id || fallback.id,
          name: rec.name || rec.full_name || rec.parent_name || fallback.name,
          phone: rec.phone || rec.mobile || fallback.phone,
          email: rec.email || fallback.email,
          location: rec.location || rec.city || rec.address || fallback.location,
          petsCount: rec.num_pets || rec.pets_count || fallback.petsCount,
          petsNames: fallback.petsNames,
          lastAppointment: rec.last_appointment || rec.updated_at?.slice(0, 10) || fallback.lastAppointment,
          status: rec.status || (rec.is_active === false ? "Inactive" : "Active"),
          _raw: rec,
        };
      });
    }
    return BENCHMARK_PET_PARENTS;
  }, [records]);

  const locations = useMemo(() => {
    const set = new Set(combinedParents.map((p) => p.location));
    return ["All", ...Array.from(set)];
  }, [combinedParents]);

  const filteredParents = useMemo(() => {
    return combinedParents.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.phone.includes(searchTerm) ||
        item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchLoc = selectedLoc === "All" || item.location === selectedLoc;
      const matchStatus = selectedStatus === "All" || item.status === selectedStatus;
      const matchCount =
        selectedPetsCount === "All" ||
        (selectedPetsCount === "1" ? item.petsCount === 1 : item.petsCount >= 2);
      return matchSearch && matchLoc && matchStatus && matchCount;
    });
  }, [combinedParents, searchTerm, selectedLoc, selectedStatus, selectedPetsCount]);

  return (
    <div className="hc-parents-view">
      {/* ── Page Header ── */}
      <div className="hc-page-header">
        <div>
          <h2 className="hc-view-title">Pet Parents</h2>
          <p className="hc-view-subtitle">
            Registered pet owners, guardian contact information and clinical patient profiles.
          </p>
        </div>
        <button type="button" className="hc-btn-primary" onClick={onAddNew}>
          <Plus size={16} strokeWidth={2.5} />
          <span>Add Pet Parent</span>
        </button>
      </div>

      {/* ── Search & Filter Toolbar ── */}
      <div className="hc-parents-toolbar">
        <div className="hc-search-field">
          <Search size={16} className="hc-field-icon" />
          <input
            type="text"
            placeholder="Search pet parent by name, phone, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="hc-filters-row">
          <select
            className="hc-filter-select"
            value={selectedLoc}
            onChange={(e) => setSelectedLoc(e.target.value)}
          >
            <option value="All">All Locations</option>
            {locations.filter((l) => l !== "All").map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>

          <select
            className="hc-filter-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          <select
            className="hc-filter-select"
            value={selectedPetsCount}
            onChange={(e) => setSelectedPetsCount(e.target.value)}
          >
            <option value="All">Number of Pets</option>
            <option value="1">1 Pet</option>
            <option value="2+">2+ Pets</option>
          </select>

          <div className="hc-view-switcher">
            <button
              type="button"
              className={`hc-switch-btn ${viewMode === "cards" ? "active" : ""}`}
              onClick={() => setViewMode("cards")}
              title="Cards View"
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

      {/* ── Content View ── */}
      {filteredParents.length === 0 ? (
        <div className="hc-empty-state">
          <div className="hc-empty-icon-wrap">
            <Users size={36} />
          </div>
          <h3>No pet parents found</h3>
          <p>Try modifying your search or clearing your active filters.</p>
          <button
            type="button"
            className="hc-btn-secondary"
            onClick={() => {
              setSearchTerm("");
              setSelectedLoc("All");
              setSelectedStatus("All");
              setSelectedPetsCount("All");
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === "cards" ? (
        /* Cards View */
        <div className="hc-parents-grid">
          {filteredParents.map((parent) => (
            <div className="hc-parent-card" key={parent.id}>
              <div className="hc-pcard-header">
                <div className="hc-pcard-avatar-row">
                  <DoctorAvatar name={parent.name} size={48} />
                  <div>
                    <h4 className="hc-parent-name">{parent.name}</h4>
                    <span className="hc-pets-sub">
                      {parent.petsCount} {parent.petsCount === 1 ? "Pet" : "Pets"} · {parent.petsNames}
                    </span>
                  </div>
                </div>
                <span
                  className={`hc-badge ${
                    parent.status === "Active" ? "hc-badge-success" : "hc-badge-muted"
                  }`}
                >
                  ● {parent.status}
                </span>
              </div>

              <div className="hc-pcard-details">
                <div className="hc-detail-line">
                  <Phone size={13} className="hc-detail-icon" />
                  <span>{parent.phone}</span>
                </div>
                <div className="hc-detail-line">
                  <Mail size={13} className="hc-detail-icon" />
                  <span>{parent.email}</span>
                </div>
                <div className="hc-detail-line">
                  <MapPin size={13} className="hc-detail-icon" />
                  <span>{parent.location}</span>
                </div>
                <div className="hc-detail-line highlight">
                  <Calendar size={13} className="hc-detail-icon text-teal" />
                  <span>Last Appointment: <strong>{parent.lastAppointment}</strong></span>
                </div>
              </div>

              <div className="hc-pcard-footer">
                <button
                  type="button"
                  className="hc-btn-card-action"
                  onClick={() => alert(`View complete record of ${parent.name}`)}
                >
                  View Records
                </button>
                {parent._raw && (
                  <div className="hc-pcard-crud">
                    <button
                      type="button"
                      className="hc-btn-icon-sm"
                      onClick={() => onEdit(parent._raw)}
                      title="Edit Parent"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      className="hc-btn-icon-sm danger"
                      onClick={() => onDelete(parent._raw)}
                      title="Delete Parent"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="hc-table-container">
          <table className="hc-table">
            <thead>
              <tr>
                <th>Pet Parent</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Location</th>
                <th>Pets Registered</th>
                <th>Last Appointment</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredParents.map((parent) => (
                <tr key={parent.id}>
                  <td>
                    <div className="hc-table-user-cell">
                      <DoctorAvatar name={parent.name} size={36} />
                      <span className="hc-user-name">{parent.name}</span>
                    </div>
                  </td>
                  <td>{parent.phone}</td>
                  <td>{parent.email}</td>
                  <td>{parent.location}</td>
                  <td>
                    <span className="hc-spec-pill">
                      {parent.petsCount} {parent.petsCount === 1 ? "Pet" : "Pets"}
                    </span>
                  </td>
                  <td>{parent.lastAppointment}</td>
                  <td>
                    <span
                      className={`hc-badge ${
                        parent.status === "Active" ? "hc-badge-success" : "hc-badge-muted"
                      }`}
                    >
                      ● {parent.status}
                    </span>
                  </td>
                  <td>
                    <div className="hc-row-actions">
                      <button
                        type="button"
                        className="hc-btn-table-action"
                        onClick={() => alert(`Viewing details of ${parent.name}`)}
                      >
                        Details
                      </button>
                      {parent._raw && (
                        <>
                          <button
                            type="button"
                            className="hc-btn-table-icon"
                            onClick={() => onEdit(parent._raw)}
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="hc-btn-table-icon danger"
                            onClick={() => onDelete(parent._raw)}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
