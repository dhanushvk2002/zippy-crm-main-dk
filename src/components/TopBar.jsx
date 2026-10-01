import { useState, useEffect, useRef, useMemo } from "react";
import { Search, Plus, Bell, Clock, MapPin, LogIn, LogOut } from "lucide-react";
import { fetchList } from "../api.js";
import { playChime } from "../notificationSound.js";

export default function TopBar({
  title,
  subtitle,
  searchPlaceholder,
  showSearch,
  showNewRecord,
  searchTerm,
  onSearchChange,
  onNewRecord,
  activeTab,
  onTabChange,
  onOpenSalesCRM,
}) {
  // State to handle opening and closing the dropdown list panel
  const [salesMenuOpen, setSalesMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("zenve_read_alert_ids") || "[]"));
    } catch (e) {
      return new Set();
    }
  });

  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const knownAlertIdsRef = useRef(new Set());

  // Closes menus automatically if you click anywhere else on the screen
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSalesMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load and poll attendance alerts
  useEffect(() => {
    let isMounted = true;

    async function loadAlerts(isInitial = false) {
      try {
        const serverAlerts = await fetchList("executive_alerts").catch(() => []);
        let localAlerts = [];
        try {
          localAlerts = JSON.parse(localStorage.getItem("zenve_crm_attendance_alerts") || "[]");
        } catch (e) {}

        const combined = [...localAlerts, ...(serverAlerts || [])];
        const seen = new Set();
        const unique = [];
        for (const item of combined) {
          const key = item.id ? `id_${item.id}` : `${item.executive_name || item.title}_${item.punch_time}_${item.punch_type}`;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
          }
        }

        if (isMounted) {
          // Check for newly arrived alert to chime
          if (!isInitial && knownAlertIdsRef.current.size > 0) {
            const hasNew = unique.some((u) => {
              const k = u.id ? `id_${u.id}` : `${u.executive_name}_${u.punch_time}`;
              return !knownAlertIdsRef.current.has(k);
            });
            if (hasNew) {
              playChime();
            }
          }

          unique.forEach((u) => {
            const k = u.id ? `id_${u.id}` : `${u.executive_name}_${u.punch_time}`;
            knownAlertIdsRef.current.add(k);
          });

          setAlerts(unique);
        }
      } catch (err) {
        // fail silently
      }
    }

    loadAlerts(true);
    const interval = setInterval(() => loadAlerts(false), 8000);

    function onRealtimePunch(e) {
      if (e.detail) {
        playChime();
        setAlerts((prev) => [e.detail, ...prev.filter((p) => p.id !== e.detail.id)]);
      }
    }
    window.addEventListener("crm_attendance_punch_alert", onRealtimePunch);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("crm_attendance_punch_alert", onRealtimePunch);
    };
  }, []);

  const unreadCount = useMemo(() => {
    return alerts.filter((a) => {
      const idKey = a.id ? `id_${a.id}` : `${a.executive_name}_${a.punch_time}`;
      return !readIds.has(idKey) && !a.is_read;
    }).length;
  }, [alerts, readIds]);

  function handleMarkAllRead() {
    const all = alerts.map((a) => (a.id ? `id_${a.id}` : `${a.executive_name}_${a.punch_time}`));
    const updated = new Set([...readIds, ...all]);
    setReadIds(updated);
    try {
      localStorage.setItem("zenve_read_alert_ids", JSON.stringify([...updated]));
    } catch (e) {}
  }

  function handleRoleClick(view) {
    setSalesMenuOpen(false); // Closes the dropdown panel smoothly
    onOpenSalesCRM?.(view);  // Executes your page transition
  }

  return (
    <header className="zzc-topbar">
      <div>
        <h1>{title}</h1>
        <p className="zzc-muted zzc-small">{subtitle}</p>
      </div>
      <div className="zzc-topbar-actions">
        {showSearch && (
          <div className="zzc-search-wrap">
            <Search className="zzc-search-icon" size={15} />
            <input
              className="zzc-search-input"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}
        {showNewRecord && (
          <button className="zzc-btn zzc-btn-primary" onClick={onNewRecord}>
            <Plus size={16} strokeWidth={2.5} />
            <span>New record</span>
          </button>
        )}
        
        {["dashboard", "data", "bulk"].map((tab) => (
          <button
            key={tab}
            className={"zzc-btn zzc-btn-outline" + (activeTab === tab ? " active" : "")}
            onClick={() => onTabChange(tab)}
          >
            {tab === "bulk" ? "Bulk tools" : tab}
          </button>
        ))}

        {/* Sales CRM Dropdown Container Layout */}
        <div className="zzc-sales-menu-wrap" ref={dropdownRef}>
          <button
            className={"zzc-btn zzc-btn-outline" + (salesMenuOpen ? " active" : "")}
            style={{ fontWeight: "normal", display: "inline-flex", alignItems: "center" }}
            onClick={(e) => {
              e.preventDefault();
              setSalesMenuOpen((prev) => !prev);
            }}
          >
            Sales CRM <span className="zzc-caret" style={{ marginLeft: "6px", fontSize: "10px" }}>▼</span>
          </button>

          {salesMenuOpen && (
            <div className="zzc-sales-menu">
              <button onClick={() => handleRoleClick("executive")}>
                Sales executive
              </button>
              <button onClick={() => handleRoleClick("manager")}>
                Sales manager
              </button>
              <button onClick={() => handleRoleClick("regional")}>
                Regional manager
              </button>
            </div>
          )}
        </div>


        
        <a href="#" className="zzc-btn-link">Console</a>
      </div>
    </header>
  );
}
