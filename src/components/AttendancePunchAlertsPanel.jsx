import { useState, useEffect, useMemo } from "react";
import { Bell, Clock, MapPin, LogIn, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import DoctorAvatar from "./DoctorAvatar.jsx";

export default function AttendancePunchAlertsPanel({
  alerts = [],
  execsInScope = null,
  onGoToAttendance = null,
}) {
  const [filterType, setFilterType] = useState("all"); // 'all', 'in', 'out'
  const [searchQuery, setSearchQuery] = useState("");
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 4; // Compact / medium rows per page

  // Merge server alerts and local real-time alerts
  useEffect(() => {
    function loadAlerts() {
      let localAlerts;
      try {
        localAlerts = JSON.parse(localStorage.getItem("zenve_crm_attendance_alerts") || "[]");
      } catch {
        localAlerts = [];
      }
      if (!Array.isArray(localAlerts)) {
        localAlerts = [];
      }

      const combined = [...localAlerts, ...(alerts || [])];
      const seen = new Set();
      const unique = [];
      for (const item of combined) {
        const key = item.id
          ? `id_${item.id}`
          : `${item.executive_name || item.title}_${item.punch_time}_${item.punch_type}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      }
      setLiveAlerts(unique);
    }

    loadAlerts();

    function handleRealtimeAlert(e) {
      if (e.detail) {
        setLiveAlerts((prev) => [e.detail, ...prev.filter((p) => p.id !== e.detail.id)]);
      }
    }
    window.addEventListener("crm_attendance_punch_alert", handleRealtimeAlert);
    return () => window.removeEventListener("crm_attendance_punch_alert", handleRealtimeAlert);
  }, [alerts]);

  function handleFilterChange(type) {
    setFilterType(type);
    setPage(1);
  }

  function handleSearchChange(e) {
    setSearchQuery(e.target.value);
    setPage(1);
  }

  // Filtering
  const filtered = useMemo(() => {
    return liveAlerts.filter((item) => {
      const type = (item.punch_type || (item.title?.toLowerCase().includes("in") ? "Punch In" : "Punch Out")).toLowerCase();
      const execName = item.executive_name || item.title?.replace(/Punch (In|Out):\s*/i, "") || "";
      const loc = item.location || item.message || "";
      const code = item.executive_code || "";

      // Scope filter if manager
      if (execsInScope && execsInScope.length > 0) {
        const inScopeNames = new Set(execsInScope.map((e) => (e.name || "").toLowerCase()));
        if (!inScopeNames.has(execName.toLowerCase())) return false;
      }

      // Tab filter
      if (filterType === "in" && !type.includes("in")) return false;
      if (filterType === "out" && !type.includes("out")) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return execName.toLowerCase().includes(q) || loc.toLowerCase().includes(q) || code.toLowerCase().includes(q);
      }

      return true;
    });
  }, [liveAlerts, filterType, searchQuery, execsInScope]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const displayedAlerts = filtered.slice((page - 1) * pageSize, page * pageSize);

  const punchInCount = liveAlerts.filter((a) => (a.punch_type || a.title || "").toLowerCase().includes("in")).length;
  const punchOutCount = liveAlerts.filter((a) => (a.punch_type || a.title || "").toLowerCase().includes("out")).length;

  return (
    <div className="attendance-alerts-panel compact-medium">
      <div className="attendance-alerts-header compact">
        <div className="attendance-alerts-title-wrap">
          <div className="attendance-alerts-icon-wrap compact">
            <Bell size={15} className="attendance-alerts-bell-icon" />
            <span className="attendance-alerts-pulse" />
          </div>
          <div>
            <div className="attendance-alerts-main-title">
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Attendance Activity & Punch Alerts</h3>
              <span className="live-status-pill compact">
                <span className="live-dot" /> LIVE FEED
              </span>
            </div>
            <p className="attendance-alerts-subtitle compact" style={{ margin: "2px 0 0 0", fontSize: "0.76rem", color: "#64748b" }}>
              Instant alerts for team attendance punches with executive name, location, and timing
            </p>
          </div>
        </div>

        <div className="attendance-alerts-header-actions">
          <div className="attendance-alerts-counters compact">
            <span className="counter-pill counter-all" title="Total Punches">
              <strong>{liveAlerts.length}</strong> Total
            </span>
            <span className="counter-pill counter-in" title="Punch Ins">
              <span className="dot-green" /> <strong>{punchInCount}</strong> In
            </span>
            <span className="counter-pill counter-out" title="Punch Outs">
              <span className="dot-orange" /> <strong>{punchOutCount}</strong> Out
            </span>
          </div>

          {onGoToAttendance && (
            <button
              type="button"
              className="attendance-alerts-btn-link compact"
              onClick={onGoToAttendance}
              style={{ fontSize: "0.76rem", padding: "4px 10px" }}
            >
              Open Attendance →
            </button>
          )}

          <div className="attendance-alerts-filter-pills compact">
            <button
              type="button"
              className={`filter-pill compact ${filterType === "all" ? "active" : ""}`}
              onClick={() => handleFilterChange("all")}
            >
              All Punches ({liveAlerts.length})
            </button>
            <button
              type="button"
              className={`filter-pill compact filter-pill-in ${filterType === "in" ? "active" : ""}`}
              onClick={() => handleFilterChange("in")}
            >
              <span className="dot-green" /> Punch In ({punchInCount})
            </button>
            <button
              type="button"
              className={`filter-pill compact filter-pill-out ${filterType === "out" ? "active" : ""}`}
              onClick={() => handleFilterChange("out")}
            >
              <span className="dot-orange" /> Punch Out ({punchOutCount})
            </button>
          </div>

          <div className="attendance-alerts-search compact">
            <input
              type="text"
              placeholder="Search by executive, code or location…"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>
      </div>

      <div className="attendance-alerts-list compact">
        {filtered.length === 0 ? (
          <div className="attendance-alerts-empty compact">
            <Clock size={20} style={{ color: "#94a3b8", marginBottom: "4px" }} />
            <span>No attendance punch alerts found.</span>
          </div>
        ) : (
          displayedAlerts.map((item, idx) => {
            const rawType = item.punch_type || (item.title?.toLowerCase().includes("in") ? "Punch In" : "Punch Out");
            const isPunchIn = rawType.toLowerCase().includes("in");
            const execName = item.executive_name || item.title?.replace(/Punch (In|Out):\s*/i, "") || "Sales Executive";
            const execCode = item.executive_code || "";
            const punchTime = item.punch_time || (item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "Just now");
            const location = item.location || item.message || "Verified Field Location";
            const isRecent = idx === 0 && page === 1 && !searchQuery;

            return (
              <div
                key={item.id || `alert_${idx}`}
                className={`attendance-alert-row compact ${isPunchIn ? "row-punch-in" : "row-punch-out"} ${isRecent ? "row-latest" : ""}`}
              >
                <div className="alert-row-left compact">
                  <DoctorAvatar name={execName} size={28} isOnline={isPunchIn} />
                  <div className="alert-exec-meta compact">
                    <div className="alert-exec-name-row">
                      <span className="alert-exec-name compact">{execName}</span>
                      {execCode && <span className="alert-exec-code compact">{execCode}</span>}
                      {isRecent && <span className="badge-new-alert compact">LATEST</span>}
                    </div>
                    <div className="alert-punch-location compact">
                      <MapPin size={11} className="alert-loc-pin" />
                      <span className="alert-loc-text compact" title={location}>{location}</span>
                    </div>
                  </div>
                </div>

                <div className="alert-row-right compact">
                  <div className="alert-action-badge-wrap">
                    <span className={`alert-badge compact ${isPunchIn ? "badge-in" : "badge-out"}`}>
                      {isPunchIn ? <LogIn size={11} /> : <LogOut size={11} />}
                      {rawType}
                    </span>
                  </div>
                  <div className="alert-time-wrap compact">
                    <Clock size={11} className="alert-time-clock" />
                    <span className="alert-time-val">{punchTime}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {filtered.length > pageSize && (
        <div className="attendance-alerts-pagination">
          <div className="alerts-page-info">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} alerts
          </div>
          <div className="alerts-page-controls">
            <button
              type="button"
              className="page-nav-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              title="Previous Page"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <span className="page-current-pill">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              className="page-nav-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              title="Next Page"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
