import React, { Component, useState, useMemo, useEffect, useCallback } from "react";
import { findLabel, findGroupLabel, SALES_TEAM_STATS } from "./data.js";
import { SEARCH_CONFIG } from "./searchConfig.js";
import {
  TABLE_CONFIG,
  fetchList,
  fetchStatCounts,
  createRecord,
  updateRecord,
  deleteRecord,
  coerceFieldValue,
  displayFieldValue,
} from "./api.js";
import Sidebar from "./components/sidebar.jsx";
import TopBar from "./components/TopBar.jsx";
import StatsGrid from "./components/StatsGrid.jsx";
import DataTable from "./components/DataTable.jsx";
import RecordModal from "./components/RecordModal.jsx";
import Dashboard from "./components/Dashboard.jsx";
import BulkTools from "./components/BulkTools.jsx";
import SalesCrmClone from "./components/SalesCrm.jsx";
import SalesCrmLoginModal from "./components/SalesCrmLoginModal.jsx";
import HealthcareDashboard from "./components/HealthcareDashboard.jsx";
import HealthcareDoctorsView from "./components/HealthcareDoctorsView.jsx";
import HealthcarePetParentsView from "./components/HealthcarePetParentsView.jsx";
import HealthcarePetsView from "./components/HealthcarePetsView.jsx";
import HealthcareAppointmentsView from "./components/HealthcareAppointmentsView.jsx";
import HealthcareMedicalRecordsView from "./components/HealthcareMedicalRecordsView.jsx";
import HealthcareVaccinationsView from "./components/HealthcareVaccinationsView.jsx";
import HealthcareClinicsView from "./components/HealthcareClinicsView.jsx";
import HealthcareProductsView from "./components/HealthcareProductsView.jsx";
import HealthcareInventoryView from "./components/HealthcareInventoryView.jsx";
import HealthcareOrdersView from "./components/HealthcareOrdersView.jsx";
import HealthcareSalesExecutivesView from "./components/HealthcareSalesExecutivesView.jsx";
import HealthcareReportsView from "./components/HealthcareReportsView.jsx";
import HealthcareSalesCrmDashboard from "./components/HealthcareSalesCrmDashboard.jsx";
import useTheme from "./useTheme.js";

const PAGE_SIZE = 10;

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "#0f172a",
          color: "#f8fafc",
          fontFamily: "-apple-system, sans-serif"
        }}>
          <div style={{
            maxWidth: "520px",
            width: "100%",
            background: "#1e293b",
            borderRadius: "16px",
            padding: "24px",
            border: "1px solid #334155",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
          }}>
            <h2 style={{ fontSize: "1.25rem", color: "#f87171", marginBottom: "8px" }}>
              Zenve Zippy Recovery
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "16px" }}>
              {this.state.error?.message || "An unexpected error occurred during rendering."}
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => {
                  window.location.reload();
                }}
                style={{
                  padding: "10px 18px",
                  background: "#007c71",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Reload
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("zippy_crm_last_view");
                  localStorage.setItem("zippy_crm_last_view", "manager");
                  window.location.reload();
                }}
                style={{
                  padding: "10px 18px",
                  background: "transparent",
                  color: "#cbd5e1",
                  border: "1px solid #475569",
                  borderRadius: "10px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Reset to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainApp() {
  const [theme, setTheme] = useTheme();
  const [salesCrmView, setSalesCrmView] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("portal") === "sales") return "manager";
      const saved = localStorage.getItem("zippy_crm_last_view");
      if (saved && saved !== "admin" && localStorage.getItem("zippy_crm_explicit_sales") === "true") {
        return saved;
      }
    } catch (e) {}
    return null;
  });
  const [salesLoginModal, setSalesLoginModal] = useState({ isOpen: false, role: "manager" });
  const [activeAuthUser, setActiveAuthUser] = useState(() => {
    try {
      const saved = localStorage.getItem("zippy_crm_active_auth");
      if (saved) return JSON.parse(saved)?.user || null;
    } catch (e) {}
    return { name: "dhanushkodi", role: "manager" };
  });

  function handleOpenSalesCRM(view) {
    setSalesLoginModal({ isOpen: true, role: view || "manager" });
  }

  function handleSalesLoginSuccess({ role, user }) {
    setActiveAuthUser(user);
    setSalesCrmView(role);
    try {
      localStorage.setItem("zippy_crm_last_view", role);
      localStorage.setItem("zippy_crm_explicit_sales", "true");
    } catch (e) {}
    setSalesLoginModal({ isOpen: false, role });
  }
  const [currentKey, setCurrentKey] = useState("doctors");
  const [records, setRecords] = useState([]); // raw objects from the API, in list order
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [modalMode, setModalMode] = useState(null); // null | "new" | "edit"
  const [editingRecord, setEditingRecord] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [saving, setSaving] = useState(false);

  const tableConfig = TABLE_CONFIG[currentKey];
  const columns = tableConfig.fields;
  const searchConfig = SEARCH_CONFIG[currentKey];

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchList(currentKey);
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load data from the API");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [currentKey]);

  useEffect(() => {
    const t = setTimeout(() => loadRecords(), 0);
    return () => clearTimeout(t);
  }, [loadRecords]);

    const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term || !searchConfig) return records;
    const searchColumns = searchConfig.columns || [searchConfig.column];
    return records.filter((record) =>
      searchColumns.some((col) => String(record[col] ?? "").toLowerCase().includes(term))
    );
  }, [records, searchTerm, searchConfig]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    const t = setTimeout(() => setCurrentPage((page) => Math.min(page, totalPages)), 0);
    return () => clearTimeout(t);
  }, [totalPages]);

  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
   
  function selectTable(key) {
    setCurrentKey(key);
    setCurrentPage(1);
    setSearchTerm("");
    setActiveTab("data");
    setError(null);
  }

  function openNewModal() {
    const initial = {};
    columns.forEach((field) => {
      initial[field.key] = field.type === "bool" ? false : field.default ?? "";
    });
    setFormValues(initial);
    setEditingRecord(null);
    setModalMode("new");
  }

  function openEditModal(record) {
    const initial = {};
    columns.forEach((field) => {
      initial[field.key] = displayFieldValue(field, record);
    });
    setFormValues(initial);
    setEditingRecord(record);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditingRecord(null);
    setFormValues({});
  }

  function handleFieldChange(key, value) {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  }

  async function saveModal(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {};
      columns.forEach((field) => {
        if (field.readOnly) return;
        payload[field.key] = coerceFieldValue(field, formValues[field.key]);
      });
      if (editingRecord) {
        await updateRecord(currentKey, editingRecord.id, payload);
      } else {
        await createRecord(currentKey, payload);
      }
      closeModal();
      await loadRecords();
      setRefreshTrigger((n) => n + 1);
    } catch (err) {
      setError(err.message || "Failed to save record");
    } finally {
      setSaving(false);
    }
  }



  async function handleDelete(record) {
    if (!window.confirm("Delete this record?")) return;
    setError(null);
    try {
      await deleteRecord(currentKey, record.id);
      await loadRecords();
      setRefreshTrigger((n) => n + 1);
    } catch (err) {
      setError(err.message || "Failed to delete record");
    }
  }

  const columnLabels = columns.map((f) => f.label || f.key);

  if (salesCrmView) {
    return (
      <>
        <SalesCrmClone
          role={salesCrmView}
          initialUserId={activeAuthUser?.id}
          onSwitchRole={(view) => {
            setSalesCrmView(view);
            try {
              localStorage.setItem("zippy_crm_last_view", view);
            } catch (e) {}
          }}
          onExit={() => {
            setSalesCrmView(null);
            try {
              localStorage.setItem("zippy_crm_last_view", "admin");
            } catch (e) {}
          }}
          theme={theme}
          onThemeChange={setTheme}
        />
        <SalesCrmLoginModal
          isOpen={salesLoginModal.isOpen}
          initialRole={salesLoginModal.role}
          onClose={() => setSalesLoginModal((prev) => ({ ...prev, isOpen: false }))}
          onLoginSuccess={handleSalesLoginSuccess}
        />
      </>
    );
  }

  return (
    <div className="zzc-app">
      <Sidebar
        currentKey={currentKey}
        onSelect={selectTable}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSalesCRM={handleOpenSalesCRM}
      />

      <main className="zzc-main">
        <TopBar
          title={
            activeTab === "dashboard"
              ? "Dashboard"
              : activeTab === "bulk"
              ? "Bulk Tools"
              : findLabel(currentKey)
          }
          breadcrumb={
            activeTab === "dashboard"
              ? "Healthcare / Operations"
              : activeTab === "bulk"
              ? "Tools / Batch Updates"
              : `Healthcare / ${findLabel(currentKey)}`
          }
          searchTerm={searchTerm}
          onSearchChange={(value) => {
            setSearchTerm(value);
            setCurrentPage(1);
          }}
          onQuickAdd={openNewModal}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenSalesCRM={handleOpenSalesCRM}
          theme={theme}
          onThemeChange={setTheme}
        />

        {error && (
          <div className="zzc-content" style={{ paddingTop: "12px", paddingBottom: 0 }}>
            <div
              style={{
                background: "#fee2e2",
                color: "#991b1b",
                padding: "10px 14px",
                borderRadius: 10,
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#991b1b",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ── Healthcare Dashboard (Section 4 & 5) ── */}
        {activeTab === "dashboard" && (
          <HealthcareDashboard
            onNavigate={(key) => selectTable(key)}
            onNewAppointment={() => {
              selectTable("appointments");
              openNewModal();
            }}
            onSelectDoctor={() => {
              selectTable("doctors");
            }}
          />
        )}

        {/* ── Bulk Tools (Section 19) ── */}
        {activeTab === "bulk" && <BulkTools />}

        {/* ── Core Healthcare & Data Views ── */}
        {activeTab === "data" && (
          <>
            {currentKey === "doctors" ? (
              <HealthcareDoctorsView
                records={records}
                onAddNew={openNewModal}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ) : currentKey === "pet_parents" ? (
              <HealthcarePetParentsView
                records={records}
                onAddNew={openNewModal}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ) : currentKey === "pets" ? (
              <HealthcarePetsView
                records={records}
                onAddNew={openNewModal}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ) : currentKey === "appointments" ? (
              <HealthcareAppointmentsView
                records={records}
                onAddNew={openNewModal}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ) : currentKey === "medical_records" ? (
              <HealthcareMedicalRecordsView
                records={records}
                onAddNew={openNewModal}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ) : currentKey === "vaccinations" ? (
              <HealthcareVaccinationsView
                records={records}
                onAddNew={openNewModal}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ) : currentKey === "clinics" ? (
              <HealthcareClinicsView
                records={records}
                onAddNew={openNewModal}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ) : currentKey === "products" ? (
              <HealthcareProductsView
                records={records}
                onAddNew={openNewModal}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ) : currentKey === "inventory" ? (
              <HealthcareInventoryView
                records={records}
                onAddNew={openNewModal}
                onEdit={openEditModal}
                onDelete={handleDelete}
                onBulkUpdate={() => setActiveTab("bulk")}
              />
            ) : currentKey === "orders" ? (
              <HealthcareOrdersView
                records={records}
                onAddNew={openNewModal}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ) : currentKey === "sales_executives" ? (
              <HealthcareSalesExecutivesView
                records={records}
                onAddNew={openNewModal}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ) : currentKey === "reports" ? (
              <HealthcareReportsView
                records={records}
                onAddNew={openNewModal}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ) : currentKey === "sales_crm" ? (
              <HealthcareSalesCrmDashboard
                onOpenDetailedSalesCrm={(role) => handleOpenSalesCRM(role)}
              />
            ) : (
              /* Generic Healthcare Data Table for secondary entities */
              <>
                {findGroupLabel(currentKey) === "Sales" ||
                findGroupLabel(currentKey) === "Sales team" ? (
                  <SalesTeamStats refreshTrigger={refreshTrigger} />
                ) : (
                  <StatsGrid refreshTrigger={refreshTrigger} />
                )}
                {loading ? (
                  <div className="zzc-content">
                    <p className="zzc-muted">Loading {findLabel(currentKey)}…</p>
                  </div>
                ) : (
                  <DataTable
                    columns={columnLabels}
                    pageItems={pageItems.map((record, index) => ({
                      row: columns.map((field) => formatCell(field, record)),
                      index,
                      record,
                    }))}
                    onEdit={(index) => openEditModal(pageItems[index])}
                    onDelete={(index) => handleDelete(pageItems[index])}
                    currentPage={safePage}
                    totalPages={totalPages}
                    onPrevPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    onNextPage={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      <RecordModal
        mode={modalMode}
        entityName={findLabel(currentKey)}
        columns={columns.map((f) => ({ key: f.key, label: f.label || f.key, type: f.type, readOnly: f.readOnly, required: f.required, options: f.options, default: f.default }))}
        values={formValues}
        onChange={handleFieldChange}
        onSave={saveModal}
        onCancel={closeModal}
        saving={saving}
      />

      <SalesCrmLoginModal
        isOpen={salesLoginModal.isOpen}
        initialRole={salesLoginModal.role}
        onClose={() => setSalesLoginModal((prev) => ({ ...prev, isOpen: false }))}
        onLoginSuccess={handleSalesLoginSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

function formatCell(field, record) {
  const value = record[field.key];
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function taskBucket(status) {
  const s = String(status || "").toLowerCase();
  if (s === "done" || s === "completed" || s === "closed") return "completed";
  if (s === "active" || s === "in progress" || s === "in_progress" || s === "ongoing") return "active";
  return "pending";
}

function SalesTeamStats({ refreshTrigger }) {
  const [counts, setCounts] = useState({});
  const [taskCounts, setTaskCounts] = useState({ pending: 0, active: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setTimeout(() => { if (!cancelled) setLoading(true); }, 0);
    Promise.all([
      fetchStatCounts(SALES_TEAM_STATS),
      fetchList("executive_tasks").catch(() => []),
    ]).then(([statResult, tasks]) => {
      if (cancelled) return;
      setCounts(statResult);
      const buckets = { pending: 0, active: 0, completed: 0 };
      (Array.isArray(tasks) ? tasks : []).forEach((t) => {
        buckets[taskBucket(t.status)]++;
      });
      setTaskCounts(buckets);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  const tiles = [
    ...SALES_TEAM_STATS.map((stat) => ({ label: stat.label, value: counts[stat.key] })),
    { label: "tasks completed", value: taskCounts.completed },
    { label: "tasks pending", value: taskCounts.pending },
    { label: "tasks active", value: taskCounts.active },
  ];

  return (
    <div className="zzc-stats-grid">
      {tiles.map((tile) => (
        <div className="zzc-stat-card" key={tile.label}>
          <p className="zzc-stat-label">{tile.label}</p>
          <p className="zzc-stat-value">
            {loading ? "…" : tile.value === null || tile.value === undefined ? "—" : tile.value}
          </p>
        </div>
      ))}
    </div>
  );
}