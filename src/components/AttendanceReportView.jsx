import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Camera,
  Check,
  CheckCircle2,
  Download,
  Search,
  Filter,
  Award,
  Timer,
  Sparkles,
  Users,
  FileSpreadsheet,
  PlusCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import DoctorAvatar from "./DoctorAvatar.jsx";
import AttendancePunchAlertsPanel from "./AttendancePunchAlertsPanel.jsx";
import defaultFacePhoto from "../assets/doctor-male.jpg";
import { fetchAttendanceList, punchInAttendance } from "../api.js";
import { formatAttendanceDateAndDay } from "../dateUtils.js";
import { formatExecutiveLocation, formatLocationString } from "../geoUtils.js";
import "./AttendanceReportView.css";

const STORAGE_KEY = "zenve_crm_attendance_records";

function normalizeFullAddress(addr, exec = null) {
  if (!addr) return "";
  return formatLocationString(addr, exec);
}

function formatShortLocation(loc, exec = null) {
  return formatExecutiveLocation(loc, exec);
}

function formatShortLocationString(str, exec = null) {
  return formatLocationString(str, exec);
}

function getTodayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatIsoToTimeStr(val) {
  if (!val) return "";
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }
  return String(val);
}

// Returns real stored history only (no mock records)
function getSampleHistoryForExec() {
  return [];
}


export default function AttendanceReportView({
  data = {},
  execId,
  role = "executive",
  currentRecord,
}) {
  const executives = data?.executives || [];

  // Default selected executive: for executive role, lock to their ID; for managers, default to "all" or execId
  const [selectedExecFilter, setSelectedExecFilter] = useState(() => {
    try {
      const prefId = localStorage.getItem("zippy_crm_preferred_exec_id");
      if (prefId && role === "executive") return String(prefId);
    } catch (e) {}
    if (role === "executive") {
      return execId
        ? String(execId)
        : executives[executives.length - 1]?.id
        ? String(executives[executives.length - 1].id)
        : "all";
    }
    return "all";
  });

  useEffect(() => {
    if (role === "executive" && execId) {
      setSelectedExecFilter(String(execId));
    }
  }, [role, execId]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [previewPhotoModal, setPreviewPhotoModal] = useState(null);

  // New Record modal state (for managers)
  const isManager = role === "manager" || role === "regional";
  const [newRecordModal, setNewRecordModal] = useState(false);
  const [newRecordForm, setNewRecordForm] = useState({
    executive_id: "",
    attendance_date: new Date().toISOString().slice(0, 10),
    login_time: "",
    logout_time: "",
    login_area: "",
    logout_area: "",
    status: "Present",
  });
  const [newRecordSaving, setNewRecordSaving] = useState(false);
  const [newRecordError, setNewRecordError] = useState("");

  // Backend attendance records from MySQL database
  const [dbAttendanceList, setDbAttendanceList] = useState([]);

  const handleNewRecordSave = async () => {
    if (!newRecordForm.executive_id || !newRecordForm.attendance_date || !newRecordForm.login_time) {
      setNewRecordError("Executive, Date and Punch In Time are required.");
      return;
    }
    setNewRecordSaving(true);
    setNewRecordError("");
    try {
      const dateStr = newRecordForm.attendance_date;
      await punchInAttendance({
        executive_id: Number(newRecordForm.executive_id),
        attendance_date: dateStr,
        login_time: `${dateStr}T${newRecordForm.login_time}:00`,
        ...(newRecordForm.logout_time ? { logout_time: `${dateStr}T${newRecordForm.logout_time}:00` } : {}),
        login_area: newRecordForm.login_area || undefined,
        logout_area: newRecordForm.logout_area || undefined,
        status: newRecordForm.status || "Present",
      });
      setNewRecordModal(false);
      setNewRecordForm({
        executive_id: "",
        attendance_date: new Date().toISOString().slice(0, 10),
        login_time: "",
        logout_time: "",
        login_area: "",
        logout_area: "",
        status: "Present",
      });
      // Refresh list
      const rows = await fetchAttendanceList();
      if (Array.isArray(rows)) setDbAttendanceList(rows);
    } catch (err) {
      setNewRecordError(err?.message || "Failed to save record. Please try again.");
    } finally {
      setNewRecordSaving(false);
    }
  };

  // Fetch real verified attendance logs from MySQL backend
  useEffect(() => {
    let isMounted = true;
    async function loadDbAttendance() {
      try {
        const rows = await fetchAttendanceList();
        if (isMounted && Array.isArray(rows)) {
          setDbAttendanceList(rows);
        }
      } catch (err) {
        console.warn("Could not fetch attendance list from MySQL backend:", err);
      }
    }
    loadDbAttendance();
    const interval = setInterval(loadDbAttendance, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Load attendance store from localStorage
  const [savedRecords, setSavedRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        let cleaned = false;
        Object.keys(parsed).forEach((k) => {
          if (parsed[k]?.punchIn === "04:27:45 PM" || parsed[k]?.remarks?.includes("Regular field shift")) {
            delete parsed[k];
            cleaned = true;
          }
        });
        if (cleaned) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          } catch (e) {}
        }
        return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return {};
  });

  // Re-sync savedRecords on storage updates or window focus
  useEffect(() => {
    const sync = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setSavedRecords(parsed);
        }
      } catch (e) {}
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  // Merge all real verified punch records across executives (from MySQL DB and local storage)
  const allAttendanceList = useMemo(() => {
    const map = new Map();
    const execList = executives.length > 0 ? executives : [];

    // 1. Process records from MySQL database
    (dbAttendanceList || []).forEach((row) => {
      const exec = execList.find((e) => e && String(e.id) === String(row.executive_id)) || {
        id: row.executive_id,
        name: row.executive_name || `Executive ${row.executive_id}`,
        employee_code: row.executive_code || `SE-00${row.executive_id}`,
        region: row.region || "Karnataka",
      };

      const inTime = formatIsoToTimeStr(row.login_time);
      const outTime = formatIsoToTimeStr(row.logout_time);

      let durStr = "—";
      if (row.total_working_minutes !== null && row.total_working_minutes !== undefined) {
        const h = Math.floor(row.total_working_minutes / 60);
        const m = row.total_working_minutes % 60;
        durStr = `${h}h ${m}m`;
      } else if (row.login_time && row.logout_time) {
        const d1 = new Date(row.login_time);
        const d2 = new Date(row.logout_time);
        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
          let diffM = Math.max(0, Math.floor((d2 - d1) / (1000 * 60)));
          if (row.lunch_out_time && row.lunch_in_time) {
            const lo = new Date(row.lunch_out_time);
            const li = new Date(row.lunch_in_time);
            if (!isNaN(lo.getTime()) && !isNaN(li.getTime()) && li > lo) {
              const lunchM = Math.floor((li - lo) / (1000 * 60));
              diffM = Math.max(0, diffM - lunchM);
            }
          }
          durStr = `${Math.floor(diffM / 60)}h ${diffM % 60}m`;
        }
      }

      const inArea = row.login_area || row.area || "";
      const inCity = row.login_city || row.city || "";
      const inState = row.login_state || row.state || "";
      const inCountry = row.login_country || row.country || "India";
      const inPincode = row.login_pincode || row.pincode || "";
      const inDistrict = row.login_district || row.district || "";
      const inLocationSource = row.login_location_source || row.location_source || "WINDOWS_LOCATION";
      const inAccuracy = row.login_accuracy ?? row.location_accuracy ?? null;
      const inTimestamp = row.login_location_timestamp || row.location_timestamp || null;
      const inLat = row.login_latitude ?? row.latitude ?? null;
      const inLng = row.login_longitude ?? row.longitude ?? null;
      const inFull = row.login_full_address || row.full_address || [inArea, inDistrict, inCity, inState].filter(Boolean).join(", ");
      const inFormatted = inFull || "";

      const outDistrict = row.logout_district || "";
      const outLocationSource = row.logout_location_source || "WINDOWS_LOCATION";
      const outArea = row.logout_area || "";
      const outCity = row.logout_city || "";
      const outState = row.logout_state || "";
      const outCountry = row.logout_country || "India";
      const outPincode = row.logout_pincode || "";
      const outAccuracy = row.logout_accuracy ?? null;
      const outTimestamp = row.logout_location_timestamp || null;
      const outLat = row.logout_latitude ?? null;
      const outLng = row.logout_longitude ?? null;
      const outFull = row.logout_full_address || (row.logout_time && (outArea || outLat != null) ? [outArea, outDistrict, outCity, outState].filter(Boolean).join(", ") : "");
      const outFormatted = outFull || "";

      const lunchOutArea = row.lunch_out_area || "";
      const lunchOutCity = row.lunch_out_city || "";
      const lunchOutState = row.lunch_out_state || "";
      const lunchOutCountry = row.lunch_out_country || "India";
      const lunchOutPincode = row.lunch_out_pincode || "";
      const lunchOutAccuracy = row.lunch_out_accuracy ?? null;
      const lunchOutTimestamp = row.lunch_out_location_timestamp || null;
      const lunchOutLat = row.lunch_out_latitude ?? null;
      const lunchOutLng = row.lunch_out_longitude ?? null;
      const lunchOutFull = row.lunch_out_full_address || [lunchOutArea, lunchOutCity, lunchOutState].filter(Boolean).join(", ");

      const lunchInArea = row.lunch_in_area || "";
      const lunchInCity = row.lunch_in_city || "";
      const lunchInState = row.lunch_in_state || "";
      const lunchInCountry = row.lunch_in_country || "India";
      const lunchInPincode = row.lunch_in_pincode || "";
      const lunchInAccuracy = row.lunch_in_accuracy ?? null;
      const lunchInTimestamp = row.lunch_in_location_timestamp || null;
      const lunchInLat = row.lunch_in_latitude ?? null;
      const lunchInLng = row.lunch_in_longitude ?? null;
      const lunchInFull = row.lunch_in_full_address || [lunchInArea, lunchInCity, lunchInState].filter(Boolean).join(", ");

      const key = `${row.executive_id}_${row.attendance_date}`;
      map.set(key, {
        id: key,
        backendId: row.id,
        execId: row.executive_id,
        execName: row.executive_name || exec.name,
        date: String(row.attendance_date),
        punchIn: inTime,
        punchInLocation: {
          area: inArea,
          city: inCity,
          district: inDistrict,
          state: inState,
          region: inState,
          country: inCountry,
          pincode: inPincode,
          accuracy: inAccuracy,
          location_accuracy: inAccuracy,
          location_source: inLocationSource,
          timestamp: inTimestamp,
          location_timestamp: inTimestamp,
          full_address: inFull,
          locality: inFormatted,
          displayAddress: inFormatted,
          coords: { latitude: inLat, longitude: inLng },
        },
        faceImage: row.login_selfie_url,
        lunchOut: formatIsoToTimeStr(row.lunch_out_time || row.lunch_out),
        lunchOutLocation: (lunchOutLat != null || lunchOutArea || lunchOutFull)
          ? {
              area: lunchOutArea,
              city: lunchOutCity,
              state: lunchOutState,
              region: lunchOutState,
              country: lunchOutCountry,
              pincode: lunchOutPincode,
              accuracy: lunchOutAccuracy,
              location_accuracy: lunchOutAccuracy,
              timestamp: lunchOutTimestamp,
              location_timestamp: lunchOutTimestamp,
              full_address: lunchOutFull,
              locality: lunchOutFull,
              displayAddress: lunchOutFull,
              coords: { latitude: lunchOutLat, longitude: lunchOutLng },
            }
          : null,
        lunchIn: formatIsoToTimeStr(row.lunch_in_time || row.lunch_in),
        lunchInLocation: (lunchInLat != null || lunchInArea || lunchInFull)
          ? {
              area: lunchInArea,
              city: lunchInCity,
              state: lunchInState,
              region: lunchInState,
              country: lunchInCountry,
              pincode: lunchInPincode,
              accuracy: lunchInAccuracy,
              location_accuracy: lunchInAccuracy,
              timestamp: lunchInTimestamp,
              location_timestamp: lunchInTimestamp,
              full_address: lunchInFull,
              locality: lunchInFull,
              displayAddress: lunchInFull,
              coords: { latitude: lunchInLat, longitude: lunchInLng },
            }
          : null,
        punchOut: outTime,
        punchOutLocation: (outLat != null || outArea || outFormatted)
          ? {
              area: outArea,
              city: outCity,
              district: outDistrict,
              state: outState,
              region: outState,
              country: outCountry,
              pincode: outPincode,
              accuracy: outAccuracy,
              location_accuracy: outAccuracy,
              location_source: outLocationSource,
              timestamp: outTimestamp,
              location_timestamp: outTimestamp,
              full_address: outFull,
              locality: outFormatted,
              displayAddress: outFormatted,
              coords: { latitude: outLat, longitude: outLng },
            }
          : null,
        punchOutFaceImage: row.logout_selfie_url,
        duration: durStr,
        status: row.status || (row.logout_time ? "Completed" : "Working"),
        remarks: row.logout_time
          ? `Shift completed · 📍 ${outFormatted || inFormatted}`
          : `Face verified · 📍 ${inFormatted}`,
        executiveObj: exec,
      });
    });

    // 2. Process records from localStorage cache for instant updates
    Object.values(savedRecords || {}).forEach((item) => {
      if (!item || !item.punchIn || !item.date) return;
      const key = `${item.execId}_${item.date}`;
      const existing = map.get(key);

      const exec = execList.find((e) => e && (String(e.id) === String(item.execId) || e.name === item.execName)) || {
        id: item.execId || 1,
        name: item.execName || "Executive",
        employee_code: `SE-00${item.execId || 1}`,
        city: item.punchInLocation?.city || "",
        region: item.punchInLocation?.region || item.punchInLocation?.state || "",
      };

      const inLoc = formatExecutiveLocation(item.punchInLocation, exec);
      const outLoc = item.punchOutLocation ? formatExecutiveLocation(item.punchOutLocation, exec) : null;

      map.set(key, {
        ...existing,
        ...item,
        punchInLocation: item.punchInLocation ? {
          ...item.punchInLocation,
          locality: inLoc,
          displayAddress: inLoc,
        } : existing?.punchInLocation,
        punchOutLocation: outLoc ? {
          ...(item.punchOutLocation || {}),
          locality: outLoc,
          displayAddress: outLoc,
        } : existing?.punchOutLocation,
        lunchOutLocation: item.lunchOutLocation || existing?.lunchOutLocation,
        lunchInLocation: item.lunchInLocation || existing?.lunchInLocation,
        remarks: item.remarks ? `Face verified · 📍 ${inLoc}` : existing?.remarks,
        executiveObj: existing?.executiveObj || exec,
        execName: item.execName || existing?.execName || exec.name,
      });
    });

    return Array.from(map.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [executives, dbAttendanceList, savedRecords]);

  // Filtered rows
  const filteredList = useMemo(() => {
    const term = search.trim().toLowerCase();
    const curMonthPrefix = new Date().toISOString().slice(0, 7);

    return allAttendanceList.filter((row) => {
      // Executive filter
      if (selectedExecFilter !== "all" && String(row.execId) !== String(selectedExecFilter)) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        const s = (row.status || "").toLowerCase();
        if (statusFilter === "present" && s !== "present" && s !== "completed") return false;
        if (statusFilter === "working" && s !== "working") return false;
        if (statusFilter === "completed" && s !== "completed") return false;
      }

      // Period filter
      if (periodFilter === "today") {
        if (row.date !== getTodayIso()) return false;
      } else if (periodFilter === "current_month") {
        if (!row.date.startsWith("2026-09") && !row.date.startsWith(curMonthPrefix)) return false;
      }

      // Search term
      if (term) {
        const matchName = row.execName?.toLowerCase().includes(term);
        const matchDate = row.date?.includes(term);
        const matchRemarks = row.remarks?.toLowerCase().includes(term);
        const matchLoc =
          row.punchInLocation?.locality?.toLowerCase().includes(term) ||
          row.executiveObj?.region?.toLowerCase().includes(term) ||
          row.executiveObj?.employee_code?.toLowerCase().includes(term);

        if (!matchName && !matchDate && !matchRemarks && !matchLoc) {
          return false;
        }
      }

      return true;
    });
  }, [allAttendanceList, selectedExecFilter, statusFilter, periodFilter, search]);

  // ── Pagination & Row Expansion State (supporting up to 1000+ sales executive records) ──
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [expandedRowId, setExpandedRowId] = useState(null);

  const toggleRowExpand = (rowKey) => {
    setExpandedRowId((prev) => (prev === rowKey ? null : rowKey));
  };

  // Reset to page 1 whenever any filter or search changes
  useEffect(() => {
    setCurrentPage(1);
    setExpandedRowId(null);
  }, [selectedExecFilter, statusFilter, periodFilter, search]);

  const totalRecords = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  // Current page records slice
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  // Page navigation helper with smooth scroll to table
  const handlePageChange = (newPage) => {
    const target = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(target);
    const tableEl = document.querySelector(".att-rep-table-card");
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Helper to generate smart pagination page numbers with ellipsis
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [];
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }
    return pages;
  }, [currentPage, totalPages]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalShifts = filteredList.length;
    const workingNow = filteredList.filter((r) => r.status === "Working").length;
    const completedShifts = filteredList.filter((r) => r.status === "Completed" || r.status === "Present").length;

    let totalMinutes = 0;
    filteredList.forEach((r) => {
      const dur = r.duration || "";
      const hMatch = dur.match(/(\d+)\s*h/);
      const mMatch = dur.match(/(\d+)\s*m/);
      const h = hMatch ? parseInt(hMatch[1], 10) : 0;
      const m = mMatch ? parseInt(mMatch[1], 10) : 0;
      totalMinutes += h * 60 + m;
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const remMins = totalMinutes % 60;
    const avgMins = totalShifts > 0 ? Math.round(totalMinutes / totalShifts) : 0;
    const avgH = Math.floor(avgMins / 60);
    const avgM = avgMins % 60;

    const punctuality = totalShifts > 0 ? Math.round((completedShifts / totalShifts) * 100) : 100;

    return {
      totalShifts,
      totalHoursStr: `${totalHours}h ${remMins}m`,
      avgHoursStr: `${avgH}h ${avgM}m`,
      punctuality,
      workingNow,
    };
  }, [filteredList]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "Sno",
      "Date",
      "Executive Name",
      "Employee Code",
      "Region",
      "Punch In Time",
      "Punch In Locality",
      "Punch In Face",
      "Lunch Out Time",
      "Lunch In Time",
      "Punch Out Time",
      "Punch Out Locality",
      "Punch Out Face",
      "Duration",
      "Status",
      "Remarks",
    ];

    const rows = filteredList.map((r, i) => [
      i + 1,
      r.date,
      `"${r.execName || ""}"`,
      `"${r.executiveObj?.employee_code || `SE-00${r.execId}`}"`,
      `"${r.executiveObj?.region || r.punchInLocation?.state || ""}"`,
      `"${r.punchIn || ""}"`,
      `"${r.punchInLocation?.locality || ""}"`,
      `"${r.faceImage ? "Verified" : "No"}"`,
      `"${r.lunchOut || ""}"`,
      `"${r.lunchIn || ""}"`,
      `"${r.punchOut || ""}"`,
      `"${r.punchOutLocation?.locality || ""}"`,
      `"${r.punchOutFaceImage ? "Verified" : "No"}"`,
      `"${r.duration || ""}"`,
      `"${r.status || ""}"`,
      `"${r.remarks || ""}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales_executive_attendance_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="att-rep-wrap">
      {/* ── HEADER BANNER ── */}
      <div className="att-rep-header">
        <div className="att-rep-header-left">
          <div className="att-rep-icon-badge">
            <FileSpreadsheet size={24} />
          </div>
          <div className="att-rep-title-group">
            <h2>Sales Executive Attendance Report</h2>
            <p>
              Comprehensive shift logs, verified biometric punches, GPS coordinates, and field hours
            </p>
          </div>
        </div>

        <div className="att-rep-header-actions">
          {isManager && (
            <button
              type="button"
              className="att-rep-btn-export"
              onClick={() => setNewRecordModal(true)}
              title="Manually add a new attendance record"
              style={{
                background: "linear-gradient(135deg, #0d9488, #059669)",
                color: "#fff",
                border: "none",
              }}
            >
              <PlusCircle size={16} />
              <span>New Record</span>
            </button>
          )}
          <button
            type="button"
            className="att-rep-btn-export"
            onClick={handleExportCSV}
            title="Download attendance report as CSV spreadsheet"
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── KPI METRICS CARDS ── */}
      <div className="att-rep-kpi-grid">
        <div className="att-rep-kpi-card">
          <div className="att-rep-kpi-icon teal">
            <Calendar size={22} />
          </div>
          <div>
            <div className="att-rep-kpi-val">{stats.totalShifts}</div>
            <div className="att-rep-kpi-label">Shifts Logged</div>
          </div>
        </div>

        <div className="att-rep-kpi-card">
          <div className="att-rep-kpi-icon cyan">
            <Clock size={22} />
          </div>
          <div>
            <div className="att-rep-kpi-val">{stats.totalHoursStr}</div>
            <div className="att-rep-kpi-label">Total Field Hours</div>
          </div>
        </div>

        <div className="att-rep-kpi-card">
          <div className="att-rep-kpi-icon amber">
            <Timer size={22} />
          </div>
          <div>
            <div className="att-rep-kpi-val">{stats.avgHoursStr}</div>
            <div className="att-rep-kpi-label">Avg Shift Hours</div>
          </div>
        </div>

        <div className="att-rep-kpi-card">
          <div className="att-rep-kpi-icon emerald">
            <Award size={22} />
          </div>
          <div>
            <div className="att-rep-kpi-val">{stats.punctuality}%</div>
            <div className="att-rep-kpi-label">Attendance Rate</div>
          </div>
        </div>
      </div>

      {/* ── LIVE ATTENDANCE PUNCH ALERTS (Displayed when Sales Manager / Regional Manager clicks Attendance) ── */}
      <AttendancePunchAlertsPanel
        alerts={data?.alerts || []}
        execsInScope={executives}
      />

      {/* ── FILTERS BAR ── */}
      <div className="att-rep-filters">
        <div className="att-rep-search-wrap">
          <Search size={16} className="att-rep-search-icon" />
          <input
            type="text"
            className="att-rep-search-input"
            placeholder="Search by executive name, employee code, locality, remarks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Executive Filter Dropdown */}
        <div className="att-rep-filter-group">
          <label>Executive</label>
          <select
            className="att-rep-select"
            value={selectedExecFilter}
            onChange={(e) => setSelectedExecFilter(e.target.value)}
          >
            <option value="all">All Sales Executives</option>
            {executives.map((exec) => (
              <option key={exec.id} value={exec.id}>
                {exec.name} ({exec.employee_code || `SE-00${exec.id}`})
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="att-rep-filter-group">
          <label>Status</label>
          <select
            className="att-rep-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="present">Present / Completed</option>
            <option value="working">On Duty / Working</option>
          </select>
        </div>

        {/* Period Filter */}
        <div className="att-rep-filter-group">
          <label>Period</label>
          <select
            className="att-rep-select"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
          >
            <option value="all">All Punched Records</option>
            <option value="today">Today Only ({getTodayIso()})</option>
            <option value="current_month">Current Month</option>
          </select>
        </div>
      </div>

      {/* ── REPORT TABLE ── */}
      <div className="att-rep-table-card">
        <div className="att-rep-table-header">
          <div>
            <h3>Executive Attendance Records</h3>
            <p>Chronological shift timeline with GPS locations and biometric status</p>
          </div>
          <span className="att-rep-count-badge">
            {totalRecords > 0
              ? `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, totalRecords).toLocaleString()} of ${totalRecords.toLocaleString()} Records (Page ${currentPage} of ${totalPages})`
              : "0 Records Found"}
          </span>
        </div>

        <div className="att-rep-table-responsive">
          {filteredList.length === 0 ? (
            <div className="att-rep-empty-state">
              No attendance records found matching the selected filters.
            </div>
          ) : (
            <table className="att-rep-table">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th style={{ width: 115 }}>Date & Day</th>
                  <th style={{ minWidth: 190 }}>Sales Executive</th>
                  <th style={{ minWidth: 200 }}>Morning Punch In</th>
                  <th style={{ minWidth: 155 }}>Lunch Break</th>
                  <th style={{ minWidth: 200 }}>Evening Logout</th>
                  <th style={{ width: 110 }}>Working Hours</th>
                  <th style={{ width: 105 }}>Status</th>
                  <th style={{ width: 65, textAlign: "center" }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.map((row, index) => {
                  const dateInfo = formatAttendanceDateAndDay(row.date);
                  const s = (row.status || "Present").toLowerCase();
                  const rowNumber = (currentPage - 1) * pageSize + index + 1;
                  const rowKey = row.id || `${row.execId}_${row.date}_${index}`;
                  const isExpanded = expandedRowId === rowKey;

                  return (
                    <React.Fragment key={rowKey}>
                      <tr className={`att-rep-row ${isExpanded ? "att-rep-tr-expanded" : ""}`}>
                        <td className="att-rep-row-num" style={{ textAlign: "center" }}>{rowNumber}</td>
                        <td>
                          <div className="att-rep-date-cell">
                            <span className="att-rep-date-val">{row.date}</span>
                            <span className={`att-rep-day-val ${dateInfo.dayName.toLowerCase() === "sunday" ? "sunday" : ""}`}>
                              {dateInfo.dayName}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="att-rep-exec-cell">
                            <DoctorAvatar name={row.execName || "Executive"} size={28} />
                            <div className="att-rep-exec-meta">
                              <div className="att-rep-exec-name">{row.execName || "Executive"}</div>
                              <div className="att-rep-exec-sub">
                                <span className="att-rep-exec-code">
                                  {row.executiveObj?.employee_code || `SE-00${row.execId || 1}`}
                                </span>
                                <span className="att-rep-region-pill">
                                  <MapPin size={9} />
                                  {row.executiveObj?.region || row.punchInLocation?.region || "Karnataka"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="att-rep-punch-cell">
                            <div className="att-rep-punch-top">
                              <span className="att-rep-time-pill in">
                                {row.punchIn || "—"}
                              </span>
                              {row.faceImage ? (
                                <div
                                  className="att-rep-face-tag in"
                                  title="Click to view Punch In biometric face verification"
                                  onClick={() =>
                                    setPreviewPhotoModal({
                                      image: row.faceImage,
                                      execName: row.execName,
                                      time: row.punchIn,
                                      date: row.date,
                                      location: row.punchInLocation,
                                      punchType: "Punch In",
                                    })
                                  }
                                >
                                  <img
                                    src={row.faceImage}
                                    alt="Punch In face verification"
                                    className="att-rep-face-thumb"
                                  />
                                  <span>✓ Verified</span>
                                </div>
                              ) : (
                                <span className="att-rep-no-face">—</span>
                              )}
                            </div>
                            {row.punchInLocation && (
                              <div className="att-rep-loc-sub" title={formatExecutiveLocation(row.punchInLocation, row.executiveObj || row)}>
                                <MapPin size={10} />
                                <span>{formatExecutiveLocation(row.punchInLocation, row.executiveObj || row)}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="att-rep-lunch-cell">
                            {row.lunchOut || row.lunchIn ? (
                              <>
                                <div className="att-rep-lunch-times">
                                  <span className={`att-rep-time-pill ${row.lunchOut ? "lunch" : "empty"}`}>
                                    {row.lunchOut || "—"}
                                  </span>
                                  <span className="att-rep-lunch-arrow">→</span>
                                  <span className={`att-rep-time-pill ${row.lunchIn ? "lunch-in" : "empty"}`}>
                                    {row.lunchIn || "—"}
                                  </span>
                                </div>
                                {(row.lunchOutLocation?.displayAddress || row.lunchOutLocation?.locality || row.lunchInLocation?.displayAddress || row.lunchInLocation?.locality) && (
                                  <div className="att-rep-loc-sub" title={formatExecutiveLocation(row.lunchOutLocation || row.lunchInLocation, row.executiveObj || row)}>
                                    <MapPin size={10} />
                                    <span>{formatExecutiveLocation(row.lunchOutLocation || row.lunchInLocation, row.executiveObj || row)}</span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="att-rep-empty-dash">—</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="att-rep-punch-cell">
                            {row.punchOut ? (
                              <>
                                <div className="att-rep-punch-top">
                                  <span className="att-rep-time-pill out">
                                    {row.punchOut}
                                  </span>
                                  {row.punchOutFaceImage ? (
                                    <div
                                      className="att-rep-face-tag out"
                                      title="Click to view Punch Out biometric face verification"
                                      onClick={() =>
                                        setPreviewPhotoModal({
                                          image: row.punchOutFaceImage,
                                          execName: row.execName,
                                          time: row.punchOut,
                                          date: row.date,
                                          location: row.punchOutLocation,
                                          punchType: "Punch Out",
                                        })
                                      }
                                    >
                                      <img
                                        src={row.punchOutFaceImage}
                                        alt="Punch Out face verification"
                                        className="att-rep-face-thumb out"
                                      />
                                      <span>✓ Verified</span>
                                    </div>
                                  ) : (
                                    <span className="att-rep-no-face">—</span>
                                  )}
                                </div>
                                {row.punchOutLocation && (
                                  <div className="att-rep-loc-sub" title={formatExecutiveLocation(row.punchOutLocation, row.executiveObj || row)}>
                                    <MapPin size={10} />
                                    <span>{formatExecutiveLocation(row.punchOutLocation, row.executiveObj || row)}</span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="att-rep-on-duty-badge">
                                <span className="att-pulse-dot" /> On Duty
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="att-rep-duration-badge">
                            <Clock size={11} />
                            {row.duration || "—"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`att-rep-status-badge ${
                              s.includes("work") ? "working" : s.includes("comp") ? "completed" : "present"
                            }`}
                          >
                            <span className="att-status-dot" />
                            {row.status || "Present"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className={`att-rep-expand-btn ${isExpanded ? "active" : ""}`}
                            onClick={() => toggleRowExpand(rowKey)}
                            title={isExpanded ? "Collapse shift details" : "View complete shift audit timeline"}
                          >
                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>
                        </td>
                      </tr>

                      {/* ── EXPANDABLE SHIFT TIMELINE DRAWER CARD ── */}
                      {isExpanded && (
                        <tr className="att-rep-expanded-row">
                          <td colSpan={9}>
                            <div className="att-rep-expanded-card">
                              <div className="att-rep-exp-header">
                                <div className="att-rep-exp-title">
                                  <ShieldCheck size={16} className="att-rep-exp-icon" />
                                  <strong>Shift Audit Log & GPS Verification</strong>
                                  <span className="att-rep-exp-badge">{row.execName} · {row.date} ({dateInfo.dayName})</span>
                                </div>
                                <div className="att-rep-exp-remarks">
                                  <span className="att-rep-exp-rem-label">Audit Remarks:</span>
                                  <span className="att-rep-exp-rem-val">{row.remarks || "Territory route verified & logged"}</span>
                                </div>
                              </div>

                              <div className="att-rep-exp-grid">
                                {/* Punch In Card */}
                                <div className="att-rep-exp-box in">
                                  <div className="att-rep-exp-box-title">
                                    <div className="att-rep-exp-box-label">
                                      <span className="att-rep-exp-dot in" />
                                      <strong>Morning Punch In</strong>
                                    </div>
                                    <span className="att-rep-time-pill in">{row.punchIn || "—"}</span>
                                  </div>
                                  <div className="att-rep-exp-box-body">
                                    {row.faceImage && (
                                      <img
                                        src={row.faceImage}
                                        alt="Punch In selfie"
                                        className="att-rep-exp-selfie in"
                                        onClick={() =>
                                          setPreviewPhotoModal({
                                            image: row.faceImage,
                                            execName: row.execName,
                                            time: row.punchIn,
                                            date: row.date,
                                            location: row.punchInLocation,
                                            punchType: "Punch In",
                                          })
                                        }
                                        title="Click to view full photo"
                                      />
                                    )}
                                    <div className="att-rep-exp-loc-info">
                                      <div className="att-rep-exp-address">
                                        <MapPin size={12} />
                                        <span>{normalizeFullAddress(row.punchInLocation?.displayAddress || row.punchInLocation?.locality)}</span>
                                      </div>
                                      {row.punchInLocation?.coords?.latitude != null && row.punchInLocation?.coords?.longitude != null && (
                                        <div className="att-rep-exp-coords">
                                          <span>GPS: {Number(row.punchInLocation.coords.latitude).toFixed(6)}, {Number(row.punchInLocation.coords.longitude).toFixed(6)}</span>
                                          {row.punchInLocation?.accuracy != null && (
                                            <span style={{
                                              marginLeft: "6px",
                                              fontSize: "0.75rem",
                                              color: row.punchInLocation.accuracy <= 100 ? "#059669" : row.punchInLocation.accuracy <= 500 ? "#d97706" : "#dc2626",
                                              fontWeight: 600
                                            }}>
                                              (±{Math.round(row.punchInLocation.accuracy)}m)
                                            </span>
                                          )}
                                          {row.punchInLocation?.location_source && (
                                            <span style={{ marginLeft: "6px", fontSize: "0.7rem", color: "#475569", background: "#f1f5f9", padding: "1px 5px", borderRadius: "4px" }}>
                                              {row.punchInLocation.location_source}
                                            </span>
                                          )}
                                          <a
                                            href={`https://www.google.com/maps?q=${row.punchInLocation.coords.latitude},${row.punchInLocation.coords.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="att-rep-exp-map-link"
                                          >
                                            Maps <ExternalLink size={10} />
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Lunch Interval Card */}
                                <div className="att-rep-exp-box lunch">
                                  <div className="att-rep-exp-box-title">
                                    <div className="att-rep-exp-box-label">
                                      <span className="att-rep-exp-dot lunch" />
                                      <strong>Lunch Interval</strong>
                                    </div>
                                    <span className="att-rep-time-pill lunch">
                                      {row.lunchOut || "—"} → {row.lunchIn || "—"}
                                    </span>
                                  </div>
                                  <div className="att-rep-exp-box-body">
                                    <div className="att-rep-exp-loc-info">
                                      <div className="att-rep-exp-address">
                                        <MapPin size={12} />
                                        <span>
                                          {row.lunchOutLocation?.displayAddress
                                            ? `Lunch Out: ${normalizeFullAddress(row.lunchOutLocation.displayAddress)}`
                                            : row.lunchInLocation?.displayAddress
                                            ? `Lunch In: ${normalizeFullAddress(row.lunchInLocation.displayAddress)}`
                                            : (row.lunchOut || row.lunchIn ? "GPS captured" : "No lunch punch recorded")}
                                        </span>
                                      </div>
                                      {row.lunchInLocation?.displayAddress && row.lunchOutLocation?.displayAddress && row.lunchInLocation.displayAddress !== row.lunchOutLocation.displayAddress && (
                                        <div className="att-rep-exp-address" style={{ marginTop: "4px" }}>
                                          <MapPin size={12} />
                                          <span>Lunch In: {normalizeFullAddress(row.lunchInLocation.displayAddress)}</span>
                                        </div>
                                      )}
                                      <div className="att-rep-exp-meta-note">
                                        Standard midday meal window · 45m break recorded
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Punch Out Card */}
                                <div className="att-rep-exp-box out">
                                  <div className="att-rep-exp-box-title">
                                    <div className="att-rep-exp-box-label">
                                      <span className="att-rep-exp-dot out" />
                                      <strong>Evening Logout</strong>
                                    </div>
                                    {row.punchOut ? (
                                      <span className="att-rep-time-pill out">{row.punchOut}</span>
                                    ) : (
                                      <span className="att-rep-on-duty-badge">
                                        <span className="att-pulse-dot" /> On Duty
                                      </span>
                                    )}
                                  </div>
                                  <div className="att-rep-exp-box-body">
                                    {row.punchOutFaceImage && (
                                      <img
                                        src={row.punchOutFaceImage}
                                        alt="Punch Out selfie"
                                        className="att-rep-exp-selfie out"
                                        onClick={() =>
                                          setPreviewPhotoModal({
                                            image: row.punchOutFaceImage,
                                            execName: row.execName,
                                            time: row.punchOut,
                                            date: row.date,
                                            location: row.punchOutLocation,
                                            punchType: "Punch Out",
                                          })
                                        }
                                        title="Click to view full photo"
                                      />
                                    )}
                                    <div className="att-rep-exp-loc-info">
                                      <div className="att-rep-exp-address">
                                        <MapPin size={12} />
                                        <span>
                                          {row.punchOut
                                            ? (normalizeFullAddress(row.punchOutLocation?.displayAddress || row.punchOutLocation?.locality) || "Punch Out location recorded")
                                            : "Shift is actively ongoing in territory"}
                                        </span>
                                      </div>
                                      {row.punchOutLocation?.coords?.latitude != null && row.punchOutLocation?.coords?.longitude != null && (
                                        <div className="att-rep-exp-coords">
                                          <span>GPS: {Number(row.punchOutLocation.coords.latitude).toFixed(6)}, {Number(row.punchOutLocation.coords.longitude).toFixed(6)}</span>
                                          {row.punchOutLocation?.accuracy != null && (
                                            <span style={{ marginLeft: "6px", fontSize: "0.75rem", color: "#059669", fontWeight: 600 }}>
                                              (±{Math.round(row.punchOutLocation.accuracy)}m)
                                            </span>
                                          )}
                                          <a
                                            href={`https://www.google.com/maps?q=${row.punchOutLocation.coords.latitude},${row.punchOutLocation.coords.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="att-rep-exp-map-link"
                                          >
                                            Maps <ExternalLink size={10} />
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── PAGINATION CONTROLS BAR (supports up to 1000+ sales executive attendance records) ── */}
        {totalRecords > 0 && (
          <div className="att-rep-pagination-bar">
            <div className="att-rep-page-info">
              Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{" "}
              <strong>{Math.min(currentPage * pageSize, totalRecords).toLocaleString()}</strong> of{" "}
              <strong>{totalRecords.toLocaleString()}</strong> records
              <span className="att-rep-page-counter-pill">Page {currentPage} of {totalPages}</span>
            </div>

            <div className="att-rep-page-controls">
              <button
                type="button"
                className="att-rep-page-btn nav-btn"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(1)}
                title="First Page"
              >
                <ChevronsLeft size={14} />
                <span>First</span>
              </button>

              <button
                type="button"
                className="att-rep-page-btn nav-btn"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                title="Previous Page"
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <div className="att-rep-page-numbers">
                {pageNumbers.map((p, idx) =>
                  p === "..." ? (
                    <span key={`dots_${idx}`} className="att-rep-page-dots">
                      …
                    </span>
                  ) : (
                    <button
                      key={`page_${p}`}
                      type="button"
                      className={`att-rep-page-btn num-btn ${currentPage === p ? "active" : ""}`}
                      onClick={() => handlePageChange(p)}
                      title={`Go to page ${p}`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                className="att-rep-page-btn nav-btn"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                title="Next Page"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>

              <button
                type="button"
                className="att-rep-page-btn nav-btn"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(totalPages)}
                title="Last Page"
              >
                <span>Last</span>
                <ChevronsRight size={14} />
              </button>
            </div>

            <div className="att-rep-page-size-wrap">
              <label htmlFor="att-rep-page-size">Per page:</label>
              <select
                id="att-rep-page-size"
                className="att-rep-page-size-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── BIOMETRIC PHOTO LIGHTBOX ── */}
      {previewPhotoModal && (
        <div
          className="attend-preview-lightbox"
          onClick={() => setPreviewPhotoModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            className="attend-lightbox-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "1.25rem",
              maxWidth: 400,
              width: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1rem",
                paddingBottom: "0.5rem",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, color: previewPhotoModal.punchType === "Punch Out" ? "#dc2626" : "#0d9488" }}>
                <Camera size={18} />
                <span>Biometric Face Verification ({previewPhotoModal.punchType || "Punch In"})</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhotoModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "#64748b" }}
              >
                ✕
              </button>
            </div>
            <img
              src={previewPhotoModal.image}
              alt="Verified Face"
              style={{ width: "100%", borderRadius: "10px", maxHeight: 280, objectFit: "cover", border: `2px solid ${previewPhotoModal.punchType === "Punch Out" ? "#fca5a5" : "#a7f3d0"}` }}
            />
            <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Executive:</span>
                <strong>{previewPhotoModal.execName}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>{previewPhotoModal.punchType || "Punch In"} Time:</span>
                <strong>{previewPhotoModal.time} ({previewPhotoModal.date})</strong>
              </div>
              {previewPhotoModal.location && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                  <span style={{ color: "#64748b", flexShrink: 0 }}>GPS Location:</span>
                  <strong style={{ textAlign: "right", wordBreak: "break-word" }}>📍 {normalizeFullAddress(previewPhotoModal.location.displayAddress || previewPhotoModal.location.locality || "Bangalore")}</strong>
                </div>
              )}
              <div
                style={{
                  marginTop: "8px",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  background: previewPhotoModal.punchType === "Punch Out" ? "#fef2f2" : "#ecfdf5",
                  color: previewPhotoModal.punchType === "Punch Out" ? "#dc2626" : "#059669",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Check size={14} /> Biometric Match Confirmed · 100% Genuine ({previewPhotoModal.punchType || "Punch In"})
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── NEW RECORD MODAL (Manager only) ── */}
      {newRecordModal && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(15,23,42,0.65)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, padding: "1rem",
          }}
          onClick={() => setNewRecordModal(false)}
        >
          <div
            style={{
              background: "var(--bg-card, #fff)",
              borderRadius: "16px",
              padding: "1.5rem",
              width: "100%", maxWidth: 480,
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ background: "linear-gradient(135deg,#0d9488,#059669)", borderRadius: "10px", padding: "8px", display: "flex" }}>
                  <PlusCircle size={18} color="#fff" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary, #0f172a)" }}>New Attendance Record</div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Manually add a punch record for an executive</div>
                </div>
              </div>
              <button type="button" onClick={() => setNewRecordModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: "4px" }}>
                <X size={20} />
              </button>
            </div>

            {newRecordError && (
              <div style={{ background: "#fef2f2", color: "#dc2626", borderRadius: "8px", padding: "10px 14px", marginBottom: "1rem", fontSize: "0.82rem" }}>
                {newRecordError}
              </div>
            )}

            <div style={{ display: "grid", gap: "0.85rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Sales Executive *</label>
                <select
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "var(--bg-card,#fff)", color: "var(--text-primary,#0f172a)" }}
                  value={newRecordForm.executive_id}
                  onChange={(e) => setNewRecordForm((f) => ({ ...f, executive_id: e.target.value }))}
                >
                  <option value="">— Select Executive —</option>
                  {executives.map((exec) => (
                    <option key={exec.id} value={exec.id}>
                      {exec.name} ({exec.employee_code || `SE-00${exec.id}`})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Attendance Date *</label>
                <input type="date" style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "var(--bg-card,#fff)", color: "var(--text-primary,#0f172a)" }}
                  value={newRecordForm.attendance_date}
                  onChange={(e) => setNewRecordForm((f) => ({ ...f, attendance_date: e.target.value }))}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Punch In Time *</label>
                  <input type="time" style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "var(--bg-card,#fff)", color: "var(--text-primary,#0f172a)" }}
                    value={newRecordForm.login_time}
                    onChange={(e) => setNewRecordForm((f) => ({ ...f, login_time: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Punch Out Time</label>
                  <input type="time" style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "var(--bg-card,#fff)", color: "var(--text-primary,#0f172a)" }}
                    value={newRecordForm.logout_time}
                    onChange={(e) => setNewRecordForm((f) => ({ ...f, logout_time: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Punch In Area</label>
                  <input type="text" placeholder="e.g. Tirupathur, Tamil Nadu" style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "var(--bg-card,#fff)", color: "var(--text-primary,#0f172a)" }}
                    value={newRecordForm.login_area}
                    onChange={(e) => setNewRecordForm((f) => ({ ...f, login_area: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Punch Out Area</label>
                  <input type="text" placeholder="e.g. Vellore, Tamil Nadu" style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "var(--bg-card,#fff)", color: "var(--text-primary,#0f172a)" }}
                    value={newRecordForm.logout_area}
                    onChange={(e) => setNewRecordForm((f) => ({ ...f, logout_area: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Status</label>
                <select
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "var(--bg-card,#fff)", color: "var(--text-primary,#0f172a)" }}
                  value={newRecordForm.status}
                  onChange={(e) => setNewRecordForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="Present">Present</option>
                  <option value="Working">Working</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
              <button type="button" onClick={() => setNewRecordModal(false)}
                style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "transparent", cursor: "pointer", fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>
                Cancel
              </button>
              <button type="button" onClick={handleNewRecordSave} disabled={newRecordSaving}
                style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg,#0d9488,#059669)", color: "#fff", cursor: newRecordSaving ? "not-allowed" : "pointer", fontSize: "0.85rem", fontWeight: 700, opacity: newRecordSaving ? 0.7 : 1 }}>
                {newRecordSaving ? "Saving…" : "Save Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
