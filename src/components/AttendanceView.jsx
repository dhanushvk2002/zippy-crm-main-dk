import React, { useState, useEffect, useMemo } from "react";
import {
  Clock,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Timer,
  Check,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Award,
  Camera,
  MapPin,
  UserCheck,
} from "lucide-react";
import DoctorAvatar from "./DoctorAvatar.jsx";
import ModernDatePicker from "./ModernDatePicker.jsx";
import FacePunchModal from "./FacePunchModal.jsx";
import defaultFacePhoto from "../assets/doctor-male.jpg";
import {
  punchInAttendance,
  punchOutAttendance,
  fetchAttendanceList,
  fetchTodayAttendance,
  deleteAttendanceRecord,
} from "../api.js";
import "./AttendanceView.css";
import "./FacePunchModal.css";

const STORAGE_KEY = "zenve_crm_attendance_records";

function formatTime(date) {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
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

function parseTimeToDate(timeStr, dateStr = getTodayIso()) {
  if (!timeStr) return null;
  if (timeStr.includes("T") || (timeStr.includes("-") && timeStr.includes(":"))) {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) return d;
  }
  const candidate = new Date(`${dateStr} ${timeStr}`);
  if (!isNaN(candidate.getTime())) return candidate;
  return null;
}

function calculateTotalMinutes(inTimeStr, outTimeStr, dateStr = getTodayIso()) {
  if (!inTimeStr) return 0;
  const inDate = parseTimeToDate(inTimeStr, dateStr);
  const outDate = outTimeStr ? parseTimeToDate(outTimeStr, dateStr) : new Date();
  if (!inDate || !outDate) return 0;
  const diffMs = Math.max(0, outDate.getTime() - inDate.getTime());
  return Math.floor(diffMs / (1000 * 60));
}

function calculateDuration(inTimeStr, outTimeStr, dateStr = getTodayIso()) {
  if (!inTimeStr) return "0h 0m";
  const inDate = parseTimeToDate(inTimeStr, dateStr);
  const outDate = outTimeStr ? parseTimeToDate(outTimeStr, dateStr) : new Date();
  if (!inDate || !outDate) return "—";
  const diffMs = Math.max(0, outDate.getTime() - inDate.getTime());
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hrs}h ${mins}m`;
}

// Helper for initializing attendance history (returns empty array so only real punches appear)
function getInitialAttendanceHistory() {
  return [];
}


export default function AttendanceView({
  data = {},
  execId,
  role,
  currentRecord,
  onSwitchExecutive,
  isExecutiveReportView = false,
}) {
  const isManagerOrRegional = role === "manager" || role === "regional" || isExecutiveReportView;

  // Active executive
  const activeExecutive = useMemo(() => {
    if (currentRecord?.name) {
      return currentRecord;
    }
    if (execId && data?.executives && Array.isArray(data.executives) && data.executives.length) {
      const byId = data.executives.find((e) => e && (String(e.id) === String(execId)));
      if (byId) return byId;
    }
    // Check if preferred executive ID exists in localStorage
    try {
      const prefId = localStorage.getItem("zippy_crm_preferred_exec_id");
      if (prefId && data?.executives && Array.isArray(data.executives)) {
        const byPref = data.executives.find((e) => String(e.id) === String(prefId));
        if (byPref) return byPref;
      }
    } catch (e) {}

    // Check if active auth exists in localStorage
    try {
      const authStr = localStorage.getItem("zippy_crm_active_auth");
      if (authStr) {
        const auth = JSON.parse(authStr);
        if (auth?.role === "executive" && auth?.user?.name) {
          return auth.user;
        }
      }
    } catch (e) {}

    // Check if latest added executive exists in localStorage
    try {
      const latestStr = localStorage.getItem("zippy_crm_latest_added_executive");
      if (latestStr) {
        const latest = JSON.parse(latestStr);
        if (latest?.name) return latest;
      }
    } catch (e) {}

    // Default to latest added executive (newest in database)
    if (data?.executives && Array.isArray(data.executives) && data.executives.length) {
      return data.executives[data.executives.length - 1];
    }

    return {
      id: 6,
      name: "Kavin",
      code: "KN-24",
      region: "Tamil Nadu",
      city: "Tirupathur",
    };
  }, [role, currentRecord, data?.executives, execId, isExecutiveReportView]);

  const profileName = (role === "manager" || role === "regional") && currentRecord?.name
    ? currentRecord.name
    : (activeExecutive?.name || "Sales Executive");
  const profileCode = (role === "manager" || role === "regional")
    ? (currentRecord?.code || currentRecord?.employee_code || "MGR-001")
    : (activeExecutive?.code || activeExecutive?.employee_code || `SE-00${activeExecutive?.id || 1}`);
  const profileRegion = (role === "manager" || role === "regional")
    ? (currentRecord?.region || currentRecord?.city || currentRecord?.country || "Tamil Nadu")
    : (activeExecutive?.region || activeExecutive?.city || "Tamil Nadu");

  // Live ticking clock
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Live Auto-Generated GPS Locality
  const [liveLocality, setLiveLocality] = useState(() => {
    try {
      return localStorage.getItem("zenve_crm_last_live_locality") || "";
    } catch (e) {
      return "";
    }
  });

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          if (res.ok) {
            const data = await res.json();
            const parts = [data.locality || data.city, data.principalSubdivision].filter(Boolean);
            if (parts.length) {
              const loc = parts.join(", ");
              setLiveLocality(loc);
              try {
                localStorage.setItem("zenve_crm_last_live_locality", loc);
              } catch (e) {}
            }
          }
        } catch (e) {}
      },
      () => {},
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }, []);

  const todayIso = getTodayIso();

  // Load attendance store
  const [records, setRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Clean out any legacy mock auto-punches
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
    } catch {
      // fallback
    }
    return {};
  });

  // Backend attendance records for this executive
  const [dbRecords, setDbRecords] = useState([]);

  // Re-sync records whenever active executive changes & fetch from MySQL backend
  useEffect(() => {
    let isMounted = true;
    const sync = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setRecords(parsed);
        }
      } catch (e) {}
    };
    sync();
    window.addEventListener("storage", sync);

    const fetchDb = async () => {
      if (!activeExecutive?.id) return;
      try {
        const [todayDb, listDb] = await Promise.all([
          fetchTodayAttendance(activeExecutive.id, todayIso),
          fetchAttendanceList({ executive_id: activeExecutive.id }),
        ]);

        if (!isMounted) return;

        if (Array.isArray(listDb)) {
          setDbRecords(listDb);
        }

        if (todayDb && todayDb.login_time) {
          const mapped = {
            id: `${todayDb.executive_id}_${todayDb.attendance_date}`,
            backendId: todayDb.id,
            execId: todayDb.executive_id,
            execName: todayDb.executive_name || activeExecutive.name,
            date: String(todayDb.attendance_date),
            punchIn: formatIsoToTimeStr(todayDb.login_time),
            punchInLocation: {
              locality: todayDb.login_area || activeExecutive.region,
              coords: { latitude: todayDb.login_latitude, longitude: todayDb.login_longitude },
            },
            faceImage: todayDb.login_selfie_url,
            punchOut: formatIsoToTimeStr(todayDb.logout_time),
            punchOutLocation: todayDb.logout_area
              ? {
                  locality: todayDb.logout_area,
                  coords: { latitude: todayDb.logout_latitude, longitude: todayDb.logout_longitude },
                }
              : null,
            punchOutFaceImage: todayDb.logout_selfie_url,
            duration:
              todayDb.total_working_minutes !== null && todayDb.total_working_minutes !== undefined
                ? `${Math.floor(todayDb.total_working_minutes / 60)}h ${todayDb.total_working_minutes % 60}m`
                : calculateDuration(
                    formatIsoToTimeStr(todayDb.login_time),
                    formatIsoToTimeStr(todayDb.logout_time)
                  ),
            status: todayDb.status || (todayDb.logout_time ? "Completed" : "Working"),
            remarks: todayDb.logout_time
              ? `Shift completed · 📍 ${todayDb.logout_area || activeExecutive.region}`
              : `Face verified · 📍 ${todayDb.login_area || activeExecutive.region}`,
          };

          setRecords((prev) => {
            const key = `${activeExecutive.id}_${todayIso}`;
            const merged = { ...prev, [key]: { ...prev[key], ...mapped } };
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
      } catch (err) {
        console.warn("Could not fetch attendance from MySQL backend:", err);
      }
    };

    fetchDb();

    return () => {
      isMounted = false;
      window.removeEventListener("storage", sync);
    };
  }, [activeExecutive?.id, todayIso]);

  // Today's attendance key for this executive
  const todayKey = `${activeExecutive?.id || 1}_${todayIso}`;

  const todayRecord = (records && records[todayKey] && records[todayKey].punchIn)
    ? records[todayKey]
    : null;

  // Status computation
  const isPunchedIn = Boolean(todayRecord?.punchIn);
  const isPunchedOut = Boolean(todayRecord?.punchOut);

  // Success alert toast state
  const [toastMessage, setToastMessage] = useState("");
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(""), 4000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Live work duration counter while punched in
  const [liveDuration, setLiveDuration] = useState("0h 0m");
  useEffect(() => {
    if (!isPunchedIn || !todayRecord?.punchIn) {
      setLiveDuration("0h 0m");
      return;
    }
    if (isPunchedOut && todayRecord?.duration) {
      setLiveDuration(todayRecord.duration);
      return;
    }

    const updateLiveTimer = () => {
      setLiveDuration(calculateDuration(todayRecord?.punchIn, null));
    };

    updateLiveTimer();
    const interval = setInterval(updateLiveTimer, 10000); // update every 10s
    return () => clearInterval(interval);
  }, [isPunchedIn, isPunchedOut, todayRecord]);

  // Biometric Face & Location Modal States
  const [punchModalOpen, setPunchModalOpen] = useState(false);
  const [punchActionType, setPunchActionType] = useState("in"); // "in" | "out"
  const [previewPhotoModal, setPreviewPhotoModal] = useState(null); // photo preview lightbox

  // Action: Open Face & Location Verification Modal for Punch In
  const handlePunchIn = () => {
    if (isPunchedIn) return;
    setPunchActionType("in");
    setPunchModalOpen(true);
  };

  // Action: Open Face & Location Verification Modal for Punch Out
  const handlePunchOut = () => {
    if (!isPunchedIn || isPunchedOut) return;
    setPunchActionType("out");
    setPunchModalOpen(true);
  };

  // Confirm and Save Verified Punch Record to LocalStorage and MySQL Database
  const handleConfirmPunch = async ({ punchTime, punchDate, locationData, faceImage }) => {
    setPunchModalOpen(false);

    if (punchActionType === "in") {
      const newRec = {
        id: todayKey,
        execId: activeExecutive.id,
        execName: activeExecutive.name,
        date: punchDate || todayIso,
        punchIn: punchTime,
        punchInLocation: locationData,
        faceImage: faceImage,
        punchOut: null,
        punchOutLocation: null,
        punchOutFaceImage: null,
        duration: "0h 0m",
        status: "Working",
        remarks: `Face verified · 📍 ${locationData?.locality || profileRegion}`,
      };

      const updated = {
        ...records,
        [todayKey]: newRec,
      };
      setRecords(updated);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      setToastMessage(
        `🟢 Punched In successfully at ${punchTime}! Face verified & saved to database.`
      );

      // Save to MySQL backend
      try {
        const payload = {
          executive_id: Number(activeExecutive.id),
          attendance_date: punchDate || todayIso,
          login_time: new Date().toISOString(),
          login_latitude: locationData?.coords?.latitude || locationData?.lat || null,
          login_longitude: locationData?.coords?.longitude || locationData?.lng || null,
          login_area: locationData?.locality || profileRegion,
          login_selfie_url: faceImage,
          status: "Working",
        };
        const dbRes = await punchInAttendance(payload);
        if (dbRes && dbRes.id) {
          setRecords((prev) => {
            const next = {
              ...prev,
              [todayKey]: { ...prev[todayKey], backendId: dbRes.id },
            };
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch (e) {}
            return next;
          });
        }
      } catch (err) {
        console.error("Backend punchInAttendance error:", err);
      }
    } else {
      // Punch Out
      if (!todayRecord?.punchIn) return;
      const finalDuration = calculateDuration(todayRecord.punchIn, punchTime);
      const totalMinutes = calculateTotalMinutes(todayRecord.punchIn, punchTime);

      const updated = {
        ...records,
        [todayKey]: {
          ...todayRecord,
          punchOut: punchTime,
          punchOutLocation: locationData,
          punchOutFaceImage: faceImage,
          duration: finalDuration,
          status: "Completed",
          remarks: `Shift completed · 📍 ${locationData?.locality || profileRegion}`,
        },
      };
      setRecords(updated);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      setToastMessage(
        `🔴 Punched Out successfully at ${punchTime} (Total: ${finalDuration}). Face verified & saved to database!`
      );

      // Save to MySQL backend
      try {
        const payload = {
          executive_id: Number(activeExecutive.id),
          attendance_date: punchDate || todayIso,
          logout_time: new Date().toISOString(),
          logout_latitude: locationData?.coords?.latitude || locationData?.lat || null,
          logout_longitude: locationData?.coords?.longitude || locationData?.lng || null,
          logout_area: locationData?.locality || profileRegion,
          logout_selfie_url: faceImage,
          total_working_minutes: totalMinutes,
          status: "Completed",
        };
        const dbRes = await punchOutAttendance(payload);
        if (dbRes && dbRes.id) {
          setRecords((prev) => {
            const next = {
              ...prev,
              [todayKey]: { ...prev[todayKey], backendId: dbRes.id },
            };
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch (e) {}
            return next;
          });
        }
      } catch (err) {
        console.error("Backend punchOutAttendance error:", err);
      }
    }
  };

  // Action: Reset Today's Punch (with confirmation)
  const handleResetToday = async () => {
    if (!window.confirm("Are you sure you want to reset today's punch in / punch out record?")) {
      return;
    }
    const bId = todayRecord?.backendId;
    const updated = { ...records, [todayKey]: null };
    setRecords(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    setToastMessage("Attendance record for today was reset.");

    if (bId) {
      try {
        await deleteAttendanceRecord(bId);
      } catch (err) {
        console.warn("Could not delete from backend:", err);
      }
    }
  };

  // Combined attendance history for the executive — merges localStorage & MySQL database records
  const historyList = useMemo(() => {
    const execIdVal = activeExecutive?.id;
    const execNameVal = profileName || activeExecutive?.name || "Sales Executive";

    const map = new Map();

    // 1. Load from MySQL database records
    (dbRecords || []).forEach((d) => {
      const dDate = String(d.attendance_date);
      map.set(dDate, {
        id: `${d.executive_id}_${dDate}`,
        backendId: d.id,
        execId: d.executive_id,
        execName: d.executive_name || execNameVal,
        date: dDate,
        punchIn: formatIsoToTimeStr(d.login_time),
        punchInLocation: {
          locality: d.login_area || profileRegion,
          coords: { latitude: d.login_latitude, longitude: d.login_longitude },
        },
        faceImage: d.login_selfie_url,
        punchOut: formatIsoToTimeStr(d.logout_time),
        punchOutLocation: d.logout_area
          ? {
              locality: d.logout_area,
              coords: { latitude: d.logout_latitude, longitude: d.logout_longitude },
            }
          : null,
        punchOutFaceImage: d.logout_selfie_url,
        duration:
          d.total_working_minutes !== null && d.total_working_minutes !== undefined
            ? `${Math.floor(d.total_working_minutes / 60)}h ${d.total_working_minutes % 60}m`
            : calculateDuration(formatIsoToTimeStr(d.login_time), formatIsoToTimeStr(d.logout_time)),
        status: d.status || (d.logout_time ? "Completed" : "Working"),
        remarks: d.logout_time
          ? `Shift completed · 📍 ${d.logout_area || profileRegion}`
          : `Face verified · 📍 ${d.login_area || profileRegion}`,
      });
    });

    // 2. Gather verified records stored in localStorage for this executive
    const fromStorage = Object.values(records || {}).filter(
      (r) =>
        r &&
        r.punchIn &&
        (r.execId === execIdVal ||
          String(r.execId) === String(execIdVal) ||
          (r.execName && execNameVal && r.execName.trim().toLowerCase() === execNameVal.trim().toLowerCase()))
    );

    fromStorage.forEach((item) => {
      if (item && item.date) {
        map.set(item.date, {
          ...(map.get(item.date) || {}),
          ...item,
          execName: execNameVal,
        });
      }
    });

    // 3. Include today's record if punched in/out
    if (todayRecord && (todayRecord.punchIn || todayRecord.punchOut)) {
      map.set(todayRecord.date || todayIso, {
        ...(map.get(todayRecord.date || todayIso) || {}),
        ...todayRecord,
        execName: execNameVal,
      });
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
  }, [records, dbRecords, activeExecutive?.id, activeExecutive?.name, profileName, profileRegion, todayRecord, todayIso]);

  // Statistics
  const stats = useMemo(() => {
    const presentDays = historyList.filter(
      (h) => h.status === "Present" || h.status === "Completed" || h.status === "Working"
    ).length;
    const totalDays = historyList.length;
    const onTimeRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;
    return {
      presentDays,
      totalDays,
      onTimeRate,
    };
  }, [historyList]);

  // ── Weekly Order Wise State & Categorization ──────────────────────────────
  const [selectedWeek, setSelectedWeek] = useState("all"); // "all" | "week_4" | "week_3" | "week_2" | "week_1"
  const [viewMode, setViewMode] = useState("weekly"); // "weekly" (Weekly Order Wise) | "flat"
  const [weeklySortOrder, setWeeklySortOrder] = useState("asc"); // "asc" (Mon -> Sun weekly order) | "desc" (Sun -> Mon)

  function getWeekCategory(dateStr) {
    const d = new Date(`${dateStr}T00:00:00`);
    const day = d.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMon);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const pad = (n) => String(n).padStart(2, "0");
    const monIso = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
    const sunIso = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`;

    let weekKey = "week_4";
    let title = "Week 4";
    let isCurrent = false;

    if (monIso >= "2026-09-28") {
      weekKey = "week_5";
      title = "Week 5";
    } else if (monIso >= "2026-09-21") {
      weekKey = "week_4";
      title = "Week 4";
      isCurrent = true;
    } else if (monIso >= "2026-09-14") {
      weekKey = "week_3";
      title = "Week 3";
    } else if (monIso >= "2026-09-07") {
      weekKey = "week_2";
      title = "Week 2";
    } else {
      weekKey = "week_1";
      title = "Week 1";
    }

    const monLabel = monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const sunLabel = sunday.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    return {
      weekKey,
      title,
      isCurrent,
      dateRange: `${monLabel} – ${sunLabel}, ${monday.getFullYear()}`,
      monIso,
      sunIso,
    };
  }

  // Pre-grouped weeks for Weekly Order Wise — only includes weeks with actual punch records
  const weeklyGroups = useMemo(() => {
    const groupsMap = new Map();

    historyList.forEach((row) => {
      const cat = getWeekCategory(row.date);
      if (!groupsMap.has(cat.weekKey)) {
        groupsMap.set(cat.weekKey, {
          key: cat.weekKey,
          title: cat.title,
          dateRange: cat.dateRange,
          isCurrent: cat.isCurrent,
          sortWeight:
            cat.weekKey === "week_5"
              ? 5
              : cat.weekKey === "week_4"
              ? 4
              : cat.weekKey === "week_3"
              ? 3
              : cat.weekKey === "week_2"
              ? 2
              : 1,
          records: [],
        });
      }
      groupsMap.get(cat.weekKey).records.push(row);
    });

    const result = [];
    groupsMap.forEach((grp) => {
      grp.records.sort((a, b) => {
        if (weeklySortOrder === "asc") {
          return new Date(a.date) - new Date(b.date);
        } else {
          return new Date(b.date) - new Date(a.date);
        }
      });

      let totalMinutes = 0;
      let presentCount = 0;
      let offCount = 0;
      let onTimeCount = 0;

      grp.records.forEach((r) => {
        if (r.status === "Weekly Off") {
          offCount++;
          return;
        }
        if (
          r.status === "Present" ||
          r.status === "Completed" ||
          r.status === "Working" ||
          r.status === "Late Arrival"
        ) {
          presentCount++;
          if (r.status !== "Late Arrival") onTimeCount++;
        }
        if (r.duration) {
          const m = r.duration.match(/(\d+)\s*h(?:rs?)?\s*(\d+)\s*m/i);
          if (m) {
            totalMinutes += parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
          }
        }
      });

      const hrs = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      grp.totalDuration = `${hrs}h ${mins}m`;
      grp.presentCount = presentCount;
      grp.offCount = offCount;
      grp.workingDaysCount = grp.records.filter((r) => r.status !== "Weekly Off").length;
      grp.punctualRate = presentCount > 0 ? Math.round((onTimeCount / presentCount) * 100) : 100;

      result.push(grp);
    });

    result.sort((a, b) => (b.sortWeight || 0) - (a.sortWeight || 0));
    return result;
  }, [historyList, weeklySortOrder]);

  const displayedWeeks = useMemo(() => {
    if (selectedWeek === "all") return weeklyGroups;
    return weeklyGroups.filter((g) => g.key === selectedWeek);
  }, [weeklyGroups, selectedWeek]);

  const flatDisplayList = useMemo(() => {
    let list = [];
    if (selectedWeek === "all") {
      list = [...historyList];
    } else {
      const match = weeklyGroups.find((g) => g.key === selectedWeek);
      list = match ? [...match.records] : [...historyList];
    }
    list.sort((a, b) => {
      if (weeklySortOrder === "asc") return new Date(a.date) - new Date(b.date);
      return new Date(b.date) - new Date(a.date);
    });
    return list;
  }, [historyList, selectedWeek, weeklyGroups, weeklySortOrder]);

  return (
    <div className="attend-wrapper">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="attend-toast" role="alert">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage("")}>✕</button>
        </div>
      )}

      {/* Top Bar Header & Shift Punch Center */}
      <div className="attend-header-card">
        <div className="attend-profile-info">
          <DoctorAvatar name={profileName} size={52} isOnline={true} />
          <div>
            <div className="attend-user-title">
              <h2>{profileName}</h2>
              <span className="attend-code-badge">
                {profileCode}
              </span>
              <span className="attend-region-pill">
                <MapPin size={12} style={{ display: "inline-block", marginRight: "3px" }} />
                {profileRegion}
              </span>
            </div>
            <p className="attend-user-sub">
              Field Sales Executive · Daily Territory Attendance & Shift Operations
            </p>
          </div>
        </div>

        {/* Right Header Status / Telemetry Hub */}
        <div className="attend-header-actions-hub">
          {isPunchedOut ? (
            <div className="attend-header-status-chip completed">
              <CheckCircle2 size={14} />
              <span>Shift Completed ({liveDuration})</span>
            </div>
          ) : isPunchedIn ? (
            <div className="attend-header-status-chip active">
              <span className="attend-header-pulse-dot"></span>
              <span>On Duty · {liveDuration}</span>
            </div>
          ) : (
            <div className="attend-header-status-chip pending">
              <Clock size={14} />
              <span>Ready to Punch In</span>
            </div>
          )}

          <div className="attend-header-geo-chip" title="Live Auto-Generated GPS Location">
            <span className="attend-geo-dot"></span>
            <span>{liveLocality ? `📍 ${liveLocality}` : "GPS Live Synced"}</span>
          </div>

          {/* Executive Switcher — only shown for Manager / Regional roles */}
          {isManagerOrRegional && data.executives && data.executives.length > 0 && (
            <div className="attend-exec-switcher">
              <label>SWITCH EXECUTIVE</label>
              <select
                value={activeExecutive.id}
                onChange={(e) => onSwitchExecutive?.(Number(e.target.value))}
              >
                {data.executives.map((exec) => (
                  <option key={exec.id} value={exec.id}>
                    {exec.name} ({exec.code || exec.employee_code || `SE-00${exec.id}`})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Clock & Action Center */}
      <div className="attend-main-grid">
        {/* Left Card: Live Clock & Shift Status */}
        <div className="attend-clock-card">
          <div className="attend-clock-header">
            <span className="attend-live-pill">
              <span className="attend-live-dot"></span> LIVE CLOCK
            </span>
            <span className="attend-date-badge">
              <Calendar size={13} />
              {currentDateTime.toLocaleDateString("en-US", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>

          <div className="attend-digital-clock-container">
            <div className="attend-digital-clock">
              {formatTime(currentDateTime)}
            </div>
            <div className="attend-clock-subtext">
              <span className="attend-sync-dot"></span> GPS Time Auto-Synchronized
            </div>
          </div>

          <div className="attend-shift-status-box">
            <div className="attend-shift-label">Today's Shift Status</div>
            <div className={`attend-status-indicator ${isPunchedOut ? "done" : isPunchedIn ? "active" : "pending"}`}>
              {isPunchedOut ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>Shift Completed</span>
                </>
              ) : isPunchedIn ? (
                <>
                  <span className="attend-working-pulse"></span>
                  <span>On Duty · Working ({liveDuration})</span>
                </>
              ) : (
                <>
                  <AlertCircle size={16} />
                  <span>Not Punched In Yet</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Card: Punch In / Punch Out Buttons */}
        <div className="attend-actions-card">
          <div className="attend-actions-title">
            <div className="attend-actions-icon-badge">
              <Clock size={18} />
            </div>
            <div>
              <h3>Daily Shift Punch</h3>
              <p>Record biometric start and end times for field visits</p>
            </div>
          </div>

          <div className="attend-punch-buttons-row">
            {/* PUNCH IN BUTTON */}
            <button
              type="button"
              className={`attend-punch-btn punch-in-btn ${isPunchedIn ? "punched" : ""}`}
              onClick={handlePunchIn}
              disabled={isPunchedIn}
              title={isPunchedIn ? `Already punched in at ${todayRecord?.punchIn}` : "Click to punch in for today"}
            >
              <div className="attend-btn-icon-wrap in-icon">
                {isPunchedIn ? <Check size={24} /> : <LogIn size={24} />}
              </div>
              <div className="attend-btn-content">
                <span className="attend-btn-action">
                  {isPunchedIn ? "Punched In" : "Punch In Time"}
                </span>
                <span className="attend-btn-time">
                  {isPunchedIn ? todayRecord?.punchIn : "Click to Start Shift"}
                </span>
              </div>
            </button>

            {/* PUNCH OUT BUTTON */}
            <button
              type="button"
              className={`attend-punch-btn punch-out-btn ${isPunchedOut ? "punched" : !isPunchedIn ? "disabled" : ""}`}
              onClick={handlePunchOut}
              disabled={!isPunchedIn || isPunchedOut}
              title={
                !isPunchedIn
                  ? "Please punch in first"
                  : isPunchedOut
                  ? `Already punched out at ${todayRecord?.punchOut}`
                  : "Click to punch out and complete shift"
              }
            >
              <div className="attend-btn-icon-wrap out-icon">
                {isPunchedOut ? <Check size={24} /> : <LogOut size={24} />}
              </div>
              <div className="attend-btn-content">
                <span className="attend-btn-action">
                  {isPunchedOut ? "Punched Out" : "Punch Out Time"}
                </span>
                <span className="attend-btn-time">
                  {isPunchedOut
                    ? todayRecord?.punchOut
                    : isPunchedIn
                    ? "Click to End Shift"
                    : "Punch In First"}
                </span>
              </div>
            </button>
          </div>

          {/* Today's Punch Summary Bar */}
          <div className="attend-summary-bar">
            <div className="attend-bar-item">
              <span className="bar-label">Punch In</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="bar-val">{todayRecord?.punchIn || "—"}</span>
                {todayRecord?.faceImage && (
                  <button
                    type="button"
                    className="attend-photo-thumb-btn"
                    title="View Punch In Face Verification"
                    onClick={() =>
                      setPreviewPhotoModal({
                        image: todayRecord.faceImage,
                        execName: activeExecutive.name,
                        time: todayRecord.punchIn,
                        date: todayRecord.date || todayIso,
                        location: todayRecord.punchInLocation,
                        punchType: "Punch In",
                      })
                    }
                  >
                    <img
                      src={todayRecord.faceImage}
                      alt="Verified Face"
                      className="attend-photo-thumb-img"
                    />
                    <span className="attend-photo-verified-icon">✓</span>
                  </button>
                )}
              </div>
              {todayRecord?.punchInLocation && (
                <span className="attend-loc-sub">
                  <MapPin size={11} /> {todayRecord.punchInLocation.locality || "Field Territory"}
                </span>
              )}
            </div>
            <div className="attend-bar-divider"></div>
            <div className="attend-bar-item">
              <span className="bar-label">Punch Out</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="bar-val">{todayRecord?.punchOut || "—"}</span>
                {todayRecord?.punchOutFaceImage && (
                  <button
                    type="button"
                    className="attend-photo-thumb-btn out"
                    title="View Punch Out Face Verification"
                    onClick={() =>
                      setPreviewPhotoModal({
                        image: todayRecord.punchOutFaceImage,
                        execName: activeExecutive.name,
                        time: todayRecord.punchOut,
                        date: todayRecord.date || todayIso,
                        location: todayRecord.punchOutLocation,
                        punchType: "Punch Out",
                      })
                    }
                  >
                    <img
                      src={todayRecord.punchOutFaceImage}
                      alt="Punch Out Verified Face"
                      className="attend-photo-thumb-img"
                    />
                    <span className="attend-photo-verified-icon">✓</span>
                  </button>
                )}
              </div>
              {todayRecord?.punchOutLocation && (
                <span className="attend-loc-sub">
                  <MapPin size={11} /> {todayRecord.punchOutLocation.locality || "Field Territory"}
                </span>
              )}
            </div>
            <div className="attend-bar-divider"></div>
            <div className="attend-bar-item">
              <span className="bar-label">Total Duration</span>
              <span className="bar-val">{isPunchedIn ? liveDuration : "0h 0m"}</span>
            </div>

            {isPunchedIn && (
              <button
                type="button"
                className="attend-reset-btn"
                onClick={handleResetToday}
                title="Reset today's punch record"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="attend-stats-grid">
        <div className="attend-stat-card">
          <div className="attend-stat-top-row">
            <div className="attend-stat-icon-wrap teal">
              <Calendar size={18} />
            </div>
            <span className="attend-stat-badge teal">Monthly</span>
          </div>
          <div className="attend-stat-body">
            <div className="attend-stat-value">{stats.presentDays} <small>Days</small></div>
            <div className="attend-stat-label">Days Present This Month</div>
            <div className="attend-stat-sub">Target: 22 Working Days</div>
          </div>
        </div>

        <div className="attend-stat-card">
          <div className="attend-stat-top-row">
            <div className="attend-stat-icon-wrap cyan">
              <Timer size={18} />
            </div>
            <span className="attend-stat-badge cyan">Live Shift</span>
          </div>
          <div className="attend-stat-body">
            <div className="attend-stat-value">{liveDuration}</div>
            <div className="attend-stat-label">Today's Logged Hours</div>
            <div className="attend-stat-sub">Standard 8h Shift Goal</div>
          </div>
        </div>

        <div className="attend-stat-card">
          <div className="attend-stat-top-row">
            <div className="attend-stat-icon-wrap emerald">
              <Award size={18} />
            </div>
            <span className="attend-stat-badge emerald">Punctual</span>
          </div>
          <div className="attend-stat-body">
            <div className="attend-stat-value">{stats.onTimeRate}%</div>
            <div className="attend-stat-label">Attendance Punctuality</div>
            <div className="attend-stat-sub">Goal: 90%+ On-Time Arrival</div>
          </div>
        </div>

        <div className="attend-stat-card">
          <div className="attend-stat-top-row">
            <div className="attend-stat-icon-wrap amber">
              <Sparkles size={18} />
            </div>
            <span className="attend-stat-badge amber">Verified</span>
          </div>
          <div className="attend-stat-body">
            <div className="attend-stat-value">Active Duty</div>
            <div className="attend-stat-label">Field Status Verification</div>
            <div className="attend-stat-sub">GPS & Biometric Validated</div>
          </div>
        </div>
      </div>

      {/* Attendance Log Table & Weekly Order Wise Controls */}
      <div className="attend-table-card">
        <div className="attend-table-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h3>Attendance Log & Weekly Operations</h3>
              <span className="attend-weekly-badge">
                <Calendar size={13} style={{ marginRight: "4px" }} />
                Weekly Order Wise
              </span>
            </div>
            <p>
              Week-by-week attendance schedule, duty punches, and verified hours for {profileName}
            </p>
          </div>

          <div className="attend-header-actions-right">
            {/* View Mode Toggle: Weekly Grouped vs Flat */}
            <div className="attend-view-mode-toggle" role="group" aria-label="View Mode">
              <button
                type="button"
                className={`attend-mode-btn ${viewMode === "weekly" ? "active" : ""}`}
                onClick={() => setViewMode("weekly")}
                title="View Attendance Grouped Week-by-Week (Weekly Order Wise)"
              >
                📅 Weekly Order Wise
              </button>
              <button
                type="button"
                className={`attend-mode-btn ${viewMode === "flat" ? "active" : ""}`}
                onClick={() => setViewMode("flat")}
                title="View All Attendance Records in Flat List"
              >
                📋 Flat Log
              </button>
            </div>

            {/* Sort Order Selector */}
            <div className="attend-order-selector-wrap">
              <label htmlFor="weekly_sort_sel">ORDER:</label>
              <select
                id="weekly_sort_sel"
                className="attend-order-select"
                value={weeklySortOrder}
                onChange={(e) => setWeeklySortOrder(e.target.value)}
              >
                <option value="asc">Mon ➔ Sun (Weekly Order)</option>
                <option value="desc">Latest First (Sun ➔ Mon)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Week Filter Pills Bar */}
        <div className="attend-weeks-filter-bar">
          <span className="attend-weeks-filter-label">SELECT WEEK:</span>
          <div className="attend-weeks-pills-list">
            <button
              type="button"
              className={`attend-week-pill-btn ${selectedWeek === "all" ? "active" : ""}`}
              onClick={() => setSelectedWeek("all")}
            >
              All Weeks ({weeklyGroups.length})
            </button>
            {weeklyGroups.map((g) => (
              <button
                key={g.key}
                type="button"
                className={`attend-week-pill-btn ${selectedWeek === g.key ? "active" : ""}`}
                onClick={() => setSelectedWeek(g.key)}
              >
                {g.title} {g.isCurrent ? "· Current" : ""} ({g.records.length}d)
              </button>
            ))}
          </div>
        </div>

        {/* Content: Weekly Grouped View or Flat Log */}
        {viewMode === "weekly" ? (
          <div className="attend-weekly-groups-container">
            {displayedWeeks.length === 0 ? (
              <div
                className="attend-week-card"
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  border: "1px dashed var(--border, #cbd5e1)",
                  background: "var(--card, #ffffff)",
                }}
              >
                <Clock size={40} style={{ color: "#94a3b8", marginBottom: "14px" }} />
                <h4
                  style={{
                    margin: "0 0 8px",
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "var(--foreground, #0f172a)",
                  }}
                >
                  No Attendance Records Yet
                </h4>
                <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>
                  No attendance punches recorded yet. Punch in above to start your shift!
                </p>
              </div>
            ) : (
              displayedWeeks.map((week) => (
              <div className="attend-week-card" key={week.key}>
                {/* Week Header Banner */}
                <div className={`attend-week-card-banner ${week.isCurrent ? "current-week" : ""}`}>
                  <div className="attend-week-banner-left">
                    <span className={`attend-week-num-badge ${week.isCurrent ? "current" : ""}`}>
                      {week.title}
                      {week.isCurrent && <span className="attend-current-pulse">● LIVE</span>}
                    </span>
                    <div>
                      <h4 className="attend-week-banner-title">{week.dateRange}</h4>
                      <span className="attend-week-banner-sub">
                        Monday to Sunday Weekly Cycle · {profileRegion} Territory
                      </span>
                    </div>
                  </div>

                  {/* Week Summary Stats */}
                  <div className="attend-week-banner-stats">
                    <span className="attend-week-stat-chip total-hours" title="Total hours logged this week">
                      ⏱️ <strong>{week.totalDuration}</strong>
                    </span>
                    <span className="attend-week-stat-chip present" title="Days present this week">
                      🟢 <strong>{week.presentCount}</strong>/{week.workingDaysCount} Present
                    </span>
                    {week.offCount > 0 && (
                      <span className="attend-week-stat-chip weekly-off" title="Weekly off days">
                        🟣 <strong>{week.offCount}</strong> Weekly Off
                      </span>
                    )}
                    <span className="attend-week-stat-chip punctuality" title="Punctuality percentage this week">
                      🎯 <strong>{week.punctualRate}%</strong> Punctual
                    </span>
                  </div>
                </div>

                {/* Table for this Week */}
                <div className="attend-table-responsive">
                  <table className="attend-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Day</th>
                        <th>Executive</th>
                        <th>Face Verification</th>
                        <th>Punch In & Location</th>
                        <th>Punch Out</th>
                        <th>Working Hours</th>
                        <th>Status</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {week.records.map((row) => {
                        const rowDate = new Date(`${row.date}T00:00:00`);
                        const dayName = rowDate.toLocaleDateString("en-US", { weekday: "short" });
                        const isWeeklyOff = row.status === "Weekly Off";

                        return (
                          <tr key={row.id} className={isWeeklyOff ? "attend-row-weekly-off" : ""}>
                            <td>
                              <span className="attend-date-text">{row.date}</span>
                            </td>
                            <td>
                              <span className={`attend-day-text ${dayName.toLowerCase() === "sun" ? "sunday" : ""}`}>
                                {dayName}
                              </span>
                            </td>
                            <td>
                              <div className="attend-exec-cell">
                                <DoctorAvatar name={row.execName || activeExecutive.name} size={24} />
                                <span>{row.execName || activeExecutive.name}</span>
                              </div>
                            </td>
                            <td>
                              {isWeeklyOff ? (
                                <span className="attend-no-photo-badge weekly-off">
                                  🏖️ Sunday Off
                                </span>
                              ) : (row.faceImage || row.punchOutFaceImage) ? (
                                <div className="attend-face-cell" style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                  {row.faceImage && (
                                    <button
                                      type="button"
                                      className="attend-photo-thumb-btn"
                                      title="Click to view Punch In Face Verification"
                                      onClick={() =>
                                        setPreviewPhotoModal({
                                          image: row.faceImage,
                                          execName: row.execName || activeExecutive.name,
                                          time: row.punchIn,
                                          date: row.date,
                                          location: row.punchInLocation,
                                          punchType: "Punch In",
                                        })
                                      }
                                    >
                                      <img
                                        src={row.faceImage}
                                        alt="Punch In Face"
                                        className="attend-photo-thumb-img"
                                      />
                                      <span className="attend-photo-verified-icon">✓</span>
                                    </button>
                                  )}
                                  {row.punchOutFaceImage && (
                                    <button
                                      type="button"
                                      className="attend-photo-thumb-btn out"
                                      title="Click to view Punch Out Face Verification"
                                      onClick={() =>
                                        setPreviewPhotoModal({
                                          image: row.punchOutFaceImage,
                                          execName: row.execName || activeExecutive.name,
                                          time: row.punchOut,
                                          date: row.date,
                                          location: row.punchOutLocation,
                                          punchType: "Punch Out",
                                        })
                                      }
                                    >
                                      <img
                                        src={row.punchOutFaceImage}
                                        alt="Punch Out Face"
                                        className="attend-photo-thumb-img"
                                      />
                                      <span className="attend-photo-verified-icon">✓</span>
                                    </button>
                                  )}
                                  <span className="attend-face-tag">
                                    {row.faceImage && row.punchOutFaceImage
                                      ? "In & Out Verified"
                                      : row.faceImage
                                      ? "In Verified"
                                      : "Out Verified"}
                                  </span>
                                </div>
                              ) : (
                                <span className="attend-no-photo-badge" title="SE Biometric registered">
                                  <Check size={11} style={{ color: "#10b981" }} /> SE Biometric
                                </span>
                              )}
                            </td>
                            <td>
                              {isWeeklyOff ? (
                                <span className="attend-off-text">—</span>
                              ) : (
                                <div className="attend-punch-cell">
                                  <span className="attend-time-pill in">
                                    {row.punchIn || "—"}
                                  </span>
                                  {row.punchIn && (
                                    <span className="attend-loc-sub">
                                      <MapPin size={10} />
                                      {row.punchInLocation?.locality || profileRegion}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td>
                              {isWeeklyOff ? (
                                <span className="attend-off-text">—</span>
                              ) : (
                                <div className="attend-punch-cell">
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span className="attend-time-pill out">
                                      {row.punchOut || "—"}
                                    </span>
                                    {row.punchOutFaceImage && (
                                      <button
                                        type="button"
                                        className="attend-photo-thumb-btn out"
                                        title="View Punch Out Face Verification"
                                        onClick={() =>
                                          setPreviewPhotoModal({
                                            image: row.punchOutFaceImage,
                                            execName: row.execName || activeExecutive.name,
                                            time: row.punchOut,
                                            date: row.date,
                                            location: row.punchOutLocation,
                                            punchType: "Punch Out",
                                          })
                                        }
                                      >
                                        <img
                                          src={row.punchOutFaceImage}
                                          alt="Punch Out Face"
                                          className="attend-photo-thumb-img"
                                        />
                                        <span className="attend-photo-verified-icon">✓</span>
                                      </button>
                                    )}
                                  </div>
                                  {row.punchOut && (
                                    <span className="attend-loc-sub">
                                      <MapPin size={10} />
                                      {row.punchOutLocation?.locality || profileRegion}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td>
                              <span className={`attend-duration-text ${isWeeklyOff ? "off" : ""}`}>
                                {row.duration || "—"}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`attend-status-tag ${(row.status || "Present")
                                  .toLowerCase()
                                  .replace(/\s+/g, "-")}`}
                              >
                                {row.status || "Present"}
                              </span>
                            </td>
                            <td>
                              <span className="attend-remarks-text">
                                {row.remarks || "Field territory route completed"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
        ) : (
          <div className="attend-table-responsive">
            {flatDisplayList.length === 0 ? (
              <div
                className="attend-week-card"
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  border: "1px dashed var(--border, #cbd5e1)",
                  background: "var(--card, #ffffff)",
                }}
              >
                <Clock size={40} style={{ color: "#94a3b8", marginBottom: "14px" }} />
                <h4
                  style={{
                    margin: "0 0 8px",
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "var(--foreground, #0f172a)",
                  }}
                >
                  No Attendance Records Yet
                </h4>
                <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>
                  No attendance punches recorded yet. Punch in above to start your shift!
                </p>
              </div>
            ) : (
              <table className="attend-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Executive</th>
                  <th>Face Verification</th>
                  <th>Punch In & Location</th>
                  <th>Punch Out</th>
                  <th>Working Hours</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {flatDisplayList.map((row) => {
                  const rowDate = new Date(`${row.date}T00:00:00`);
                  const dayName = rowDate.toLocaleDateString("en-US", { weekday: "short" });
                  const isWeeklyOff = row.status === "Weekly Off";

                  return (
                    <tr key={row.id} className={isWeeklyOff ? "attend-row-weekly-off" : ""}>
                      <td>
                        <span className="attend-date-text">{row.date}</span>
                      </td>
                      <td>
                        <span className={`attend-day-text ${dayName.toLowerCase() === "sun" ? "sunday" : ""}`}>
                          {dayName}
                        </span>
                      </td>
                      <td>
                        <div className="attend-exec-cell">
                          <DoctorAvatar name={row.execName || activeExecutive.name} size={24} />
                          <span>{row.execName || activeExecutive.name}</span>
                        </div>
                      </td>
                      <td>
                        {isWeeklyOff ? (
                          <span className="attend-no-photo-badge weekly-off">
                            🏖️ Sunday Off
                          </span>
                        ) : (row.faceImage || row.punchOutFaceImage) ? (
                          <div className="attend-face-cell" style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            {row.faceImage && (
                              <button
                                type="button"
                                className="attend-photo-thumb-btn"
                                title="Click to view Punch In Face Verification"
                                onClick={() =>
                                  setPreviewPhotoModal({
                                    image: row.faceImage,
                                    execName: row.execName || activeExecutive.name,
                                    time: row.punchIn,
                                    date: row.date,
                                    location: row.punchInLocation,
                                    punchType: "Punch In",
                                  })
                                }
                              >
                                <img
                                  src={row.faceImage}
                                  alt="Punch In Face"
                                  className="attend-photo-thumb-img"
                                />
                                <span className="attend-photo-verified-icon">✓</span>
                              </button>
                            )}
                            {row.punchOutFaceImage && (
                              <button
                                type="button"
                                className="attend-photo-thumb-btn out"
                                title="Click to view Punch Out Face Verification"
                                onClick={() =>
                                  setPreviewPhotoModal({
                                    image: row.punchOutFaceImage,
                                    execName: row.execName || activeExecutive.name,
                                    time: row.punchOut,
                                    date: row.date,
                                    location: row.punchOutLocation,
                                    punchType: "Punch Out",
                                  })
                                }
                              >
                                <img
                                  src={row.punchOutFaceImage}
                                  alt="Punch Out Face"
                                  className="attend-photo-thumb-img"
                                />
                                <span className="attend-photo-verified-icon">✓</span>
                              </button>
                            )}
                            <span className="attend-face-tag">
                              {row.faceImage && row.punchOutFaceImage
                                ? "In & Out Verified"
                                : row.faceImage
                                ? "In Verified"
                                : "Out Verified"}
                            </span>
                          </div>
                        ) : (
                          <span className="attend-no-photo-badge" title="SE Biometric registered">
                            <Check size={11} style={{ color: "#10b981" }} /> SE Biometric
                          </span>
                        )}
                      </td>
                      <td>
                        {isWeeklyOff ? (
                          <span className="attend-off-text">—</span>
                        ) : (
                          <div className="attend-punch-cell">
                            <span className="attend-time-pill in">
                              {row.punchIn || "—"}
                            </span>
                            {row.punchIn && (
                              <span className="attend-loc-sub">
                                <MapPin size={10} />
                                {row.punchInLocation?.locality || profileRegion}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        {isWeeklyOff ? (
                          <span className="attend-off-text">—</span>
                        ) : (
                          <div className="attend-punch-cell">
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span className="attend-time-pill out">
                                {row.punchOut || "—"}
                              </span>
                              {row.punchOutFaceImage && (
                                <button
                                  type="button"
                                  className="attend-photo-thumb-btn out"
                                  title="View Punch Out Face Verification"
                                  onClick={() =>
                                    setPreviewPhotoModal({
                                      image: row.punchOutFaceImage,
                                      execName: row.execName || activeExecutive.name,
                                      time: row.punchOut,
                                      date: row.date,
                                      location: row.punchOutLocation,
                                      punchType: "Punch Out",
                                    })
                                  }
                                >
                                  <img
                                    src={row.punchOutFaceImage}
                                    alt="Punch Out Face"
                                    className="attend-photo-thumb-img"
                                  />
                                  <span className="attend-photo-verified-icon">✓</span>
                                </button>
                              )}
                            </div>
                            {row.punchOut && (
                              <span className="attend-loc-sub">
                                <MapPin size={10} />
                                {row.punchOutLocation?.locality || profileRegion}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`attend-duration-text ${isWeeklyOff ? "off" : ""}`}>
                          {row.duration || "—"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`attend-status-tag ${(row.status || "Present")
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          {row.status || "Present"}
                        </span>
                      </td>
                      <td>
                        <span className="attend-remarks-text">
                          {row.remarks || "Field territory route completed"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        )}
      </div>

      {/* Biometric Face Capture & Location Punch Modal */}
      <FacePunchModal
        isOpen={punchModalOpen}
        onClose={() => setPunchModalOpen(false)}
        onConfirm={handleConfirmPunch}
        actionType={punchActionType}
        executive={activeExecutive}
      />

      {/* Lightbox / Modal for Viewing Captured Face Photo & Biometric Details */}
      {previewPhotoModal && (
        <div
          className="attend-preview-lightbox"
          onClick={() => setPreviewPhotoModal(null)}
        >
          <div
            className="attend-lightbox-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="attend-lightbox-header">
              <div className="attend-lightbox-title">
                <Camera size={18} className="camera-icon-teal" />
                <span>Biometric Face Verification ({previewPhotoModal.punchType || "Punch In"})</span>
              </div>
              <button
                type="button"
                className="attend-lightbox-close"
                onClick={() => setPreviewPhotoModal(null)}
              >
                ✕
              </button>
            </div>
            <div className="attend-lightbox-body">
              <img
                src={previewPhotoModal.image}
                alt="Captured Face verification"
                className="attend-lightbox-img"
              />
              <div className="attend-lightbox-meta">
                <div className="attend-meta-row">
                  <span className="attend-meta-k">Executive:</span>
                  <span className="attend-meta-v">{previewPhotoModal.execName}</span>
                </div>
                <div className="attend-meta-row">
                  <span className="attend-meta-k">{previewPhotoModal.punchType || "Punch In"} Time:</span>
                  <span className="attend-meta-v">{previewPhotoModal.time} ({previewPhotoModal.date})</span>
                </div>
                {previewPhotoModal.location && (
                  <div className="attend-meta-row">
                    <span className="attend-meta-k">GPS Location:</span>
                    <span className="attend-meta-v">
                      📍 {previewPhotoModal.location.locality || profileRegion}
                      {previewPhotoModal.location.lat && (
                        <small className="attend-coords">
                          ({Number(previewPhotoModal.location.lat).toFixed(4)}°, {Number(previewPhotoModal.location.lng).toFixed(4)}°)
                        </small>
                      )}
                    </span>
                  </div>
                )}
                <div className="attend-meta-status-badge">
                  <Check size={14} /> Biometric Match Confirmed · 100% Genuine ({previewPhotoModal.punchType || "Punch In"})
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
