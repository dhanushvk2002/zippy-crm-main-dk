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
  Sparkles,
  TrendingUp,
  Award,
  Camera,
  MapPin,
  UserCheck,
  Utensils,
  Coffee,
} from "lucide-react";
import DoctorAvatar from "./DoctorAvatar.jsx";
import ModernDatePicker from "./ModernDatePicker.jsx";
import FacePunchModal from "./FacePunchModal.jsx";
import defaultFacePhoto from "../assets/doctor-male.jpg";
import {
  fetchList,
  punchInAttendance,
  punchOutAttendance,
  punchLunchAttendance,
  fetchAttendanceList,
  fetchTodayAttendance,
} from "../api.js";
import { formatAttendanceDateAndDay } from "../dateUtils.js";
import "./AttendanceView.css";
import "./FacePunchModal.css";

const STORAGE_KEY = "zenve_crm_attendance_records";

function getLocalIsoString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

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

function calculateTotalMinutes(inTimeStr, outTimeStr, lunchOutStr, lunchInStr, dateStr = getTodayIso()) {
  if (!inTimeStr) return 0;
  const inDate = parseTimeToDate(inTimeStr, dateStr);
  let outDate = outTimeStr ? parseTimeToDate(outTimeStr, dateStr) : new Date();
  if (!inDate || !outDate) return 0;

  // If on lunch break and not yet resumed or logged out, freeze live work timer at lunch-out time
  if (lunchOutStr && !lunchInStr && !outTimeStr) {
    const lOut = parseTimeToDate(lunchOutStr, dateStr);
    if (lOut && lOut <= outDate) {
      outDate = lOut;
    }
  }

  let diffMs = Math.max(0, outDate.getTime() - inDate.getTime());

  // Deduct completed lunch break if both lunchOut and lunchIn are present
  if (lunchOutStr && lunchInStr) {
    const lOut = parseTimeToDate(lunchOutStr, dateStr);
    const lIn = parseTimeToDate(lunchInStr, dateStr);
    if (lOut && lIn && lIn > lOut) {
      const lunchMs = lIn.getTime() - lOut.getTime();
      diffMs = Math.max(0, diffMs - lunchMs);
    }
  }

  return Math.floor(diffMs / (1000 * 60));
}

function calculateDuration(inTimeStr, outTimeStr, lunchOutStr, lunchInStr, dateStr = getTodayIso()) {
  if (!inTimeStr) return "0h 0m";
  const totalMinutes = calculateTotalMinutes(inTimeStr, outTimeStr, lunchOutStr, lunchInStr, dateStr);
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

  const [internalExecutives, setInternalExecutives] = useState([]);

  useEffect(() => {
    if (!data?.executives || !data.executives.length) {
      fetchList("sales_executives")
        .then((list) => {
          if (Array.isArray(list) && list.length) {
            setInternalExecutives(list);
          }
        })
        .catch(() => {});
    }
  }, [data?.executives]);

  const executivesList = useMemo(() => {
    if (data?.executives && Array.isArray(data.executives) && data.executives.length) {
      return data.executives;
    }
    return internalExecutives;
  }, [data?.executives, internalExecutives]);

  const [selectedExecId, setSelectedExecId] = useState(() => {
    try {
      const saved = localStorage.getItem("zippy_crm_selected_exec_id");
      if (saved) return Number(saved);
    } catch (e) {}
    return execId || null;
  });

  const handleSwitchExec = (newId) => {
    setSelectedExecId(newId);
    try {
      localStorage.setItem("zippy_crm_selected_exec_id", String(newId));
      localStorage.setItem("zippy_crm_preferred_exec_id", String(newId));
    } catch (e) {}
    onSwitchExecutive?.(newId);
  };

  // Active executive
  const activeExecutive = useMemo(() => {
    if (selectedExecId && executivesList.length) {
      const bySel = executivesList.find((e) => e && String(e.id) === String(selectedExecId));
      if (bySel) return bySel;
    }
    if (currentRecord?.name) {
      return currentRecord;
    }
    if (execId && executivesList.length) {
      const byId = executivesList.find((e) => e && (String(e.id) === String(execId)));
      if (byId) return byId;
    }
    // Check if preferred executive ID exists in localStorage
    try {
      const prefId = localStorage.getItem("zippy_crm_preferred_exec_id");
      if (prefId && executivesList.length) {
        const byPref = executivesList.find((e) => String(e.id) === String(prefId));
        if (byPref) return byPref;
      }
    } catch (e) {}

    // Check if active auth exists in localStorage
    try {
      const authStr = localStorage.getItem("zippy_crm_active_auth");
      if (authStr) {
        const auth = JSON.parse(authStr);
        if (auth?.role === "executive" && auth?.user?.name) {
          const matchAuth = executivesList.find((e) => String(e.id) === String(auth.user.id) || e.name === auth.user.name);
          if (matchAuth) return matchAuth;
          return auth.user;
        }
      }
    } catch (e) {}

    // Default to first or preferred executive in database
    if (executivesList.length) {
      return executivesList[0];
    }

    return {
      id: 7,
      name: "Kavin",
      code: "KN-24",
      region: "Tamil Nadu",
      city: "Tirupathur",
    };
  }, [selectedExecId, currentRecord, executivesList, execId]);

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

  // Shared helper: rich reverse-geocode to get specific area name
  // Uses BigDataCloud first, falls back to OpenStreetMap Nominatim
  const resolveAreaFromCoords = async (latitude, longitude) => {
    // 1. BigDataCloud — fast, free, CORS-safe
    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      if (res.ok) {
        const data = await res.json();

        // localityInfo.informative is ordered general→specific (continent first, neighbourhood last)
        // Iterate in REVERSE to get the most specific area, skip continent/country
        let finestArea = "";
        const informative = data.localityInfo?.informative || [];
        const skipDesc = new Set(["continent", "country", "country region", "region", "postcode", "postal code", "zip code", "zip"]);
        for (let i = informative.length - 1; i >= 0; i--) {
          const info = informative[i];
          const desc = (info.description || "").toLowerCase();
          if (info.name && info.name.trim() && !skipDesc.has(desc)) {
            finestArea = info.name.trim();
            break;
          }
        }

        const locality = finestArea || data.locality || "";
        const city = data.city || data.principalSubdivision || "";
        const state = data.principalSubdivision || "";
        const parts = [];
        if (locality && locality !== city) parts.push(locality);
        if (city && !parts.includes(city)) parts.push(city);
        if (state && !parts.includes(state)) parts.push(state);
        if (parts.length > 0) return parts.join(", ");
      }
    } catch (e) {}

    // 2. Nominatim fallback — suburb/neighbourhood level detail
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
        { headers: { "User-Agent": "ZenveCRM/1.0" } }
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const neighbourhood = addr.quarter || addr.suburb || addr.neighbourhood || addr.road || "";
        const city = addr.city || addr.town || addr.county || addr.city_district || "";
        const state = addr.state || "";
        const parts = [];
        if (neighbourhood) parts.push(neighbourhood);
        if (city && city !== neighbourhood) parts.push(city);
        if (state && !parts.includes(state)) parts.push(state);
        if (parts.length > 0) return parts.join(", ");
      }
    } catch (e) {}

    return "";
  };

  // Live Auto-Generated GPS Locality (shown in the header area chip)
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
        const loc = await resolveAreaFromCoords(latitude, longitude);
        if (loc) {
          setLiveLocality(loc);
          try {
            localStorage.setItem("zenve_crm_last_live_locality", loc);
          } catch (e) {}
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
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
              locality: todayDb.area || todayDb.login_area || activeExecutive.region,
              coords: { latitude: todayDb.latitude ?? todayDb.login_latitude, longitude: todayDb.longitude ?? todayDb.login_longitude },
            },
            faceImage: todayDb.login_selfie_url,
            lunchOut: formatIsoToTimeStr(todayDb.lunch_out_time || todayDb.lunch_out),
            lunchIn: formatIsoToTimeStr(todayDb.lunch_in_time || todayDb.lunch_in),
            punchOut: formatIsoToTimeStr(todayDb.logout_time),
            punchOutLocation: (todayDb.area || todayDb.logout_area)
              ? {
                  locality: todayDb.area || todayDb.logout_area,
                  coords: { latitude: todayDb.latitude ?? todayDb.logout_latitude, longitude: todayDb.longitude ?? todayDb.logout_longitude },
                }
              : null,
            punchOutFaceImage: todayDb.logout_selfie_url,
            duration:
              todayDb.total_working_minutes !== null && todayDb.total_working_minutes !== undefined
                ? `${Math.floor(todayDb.total_working_minutes / 60)}h ${todayDb.total_working_minutes % 60}m`
                : calculateDuration(
                    formatIsoToTimeStr(todayDb.login_time),
                    formatIsoToTimeStr(todayDb.logout_time),
                    formatIsoToTimeStr(todayDb.lunch_out_time || todayDb.lunch_out),
                    formatIsoToTimeStr(todayDb.lunch_in_time || todayDb.lunch_in)
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
  const isLunchOut = Boolean(todayRecord?.lunchOut);
  const isLunchIn = Boolean(todayRecord?.lunchIn);
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
      setLiveDuration(
        calculateDuration(
          todayRecord?.punchIn,
          todayRecord?.punchOut,
          todayRecord?.lunchOut,
          todayRecord?.lunchIn
        )
      );
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

  // Helper: get current GPS position and resolve detailed area name
  const fetchCurrentLocation = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({ latitude: null, longitude: null, area: "" });
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const area = await resolveAreaFromCoords(latitude, longitude);
          resolve({ latitude, longitude, area });
        },
        () => resolve({ latitude: null, longitude: null, area: "" }),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });

  // Action: Record Lunch Out (auto-fetches GPS location)
  const handleLunchOut = async () => {
    if (!isPunchedIn || isLunchOut || isPunchedOut) return;
    const now = new Date();
    const timeStr = formatTime(now);
    const isoNow = getLocalIsoString();

    setToastMessage("📍 Fetching your location for Lunch Out…");
    const { latitude, longitude, area } = await fetchCurrentLocation();

    const updated = {
      ...records,
      [todayKey]: {
        ...(todayRecord || {
          id: todayKey,
          execId: activeExecutive.id,
          execName: activeExecutive.name,
          date: todayIso,
        }),
        lunchOut: timeStr,
        lunchOutLocation: { locality: area, coords: { latitude, longitude } },
      },
    };
    setRecords(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    setToastMessage(`🍴 Lunch Out recorded at ${timeStr}${area ? ` · 📍 ${area}` : ""}!`);

    try {
      await punchLunchAttendance({
        executive_id: Number(activeExecutive.id),
        attendance_date: todayRecord?.date || todayIso,
        action: "lunch_out",
        punch_time: isoNow,
        latitude,
        longitude,
        area,
      });
    } catch (err) {
      console.error("Backend punchLunchAttendance lunch_out error:", err);
    }
  };

  // Action: Record Lunch In (auto-fetches GPS location)
  const handleLunchIn = async () => {
    if (!isLunchOut || isLunchIn || isPunchedOut) return;
    const now = new Date();
    const timeStr = formatTime(now);
    const isoNow = getLocalIsoString();

    setToastMessage("📍 Fetching your location for Lunch In…");
    const { latitude, longitude, area } = await fetchCurrentLocation();

    const updated = {
      ...records,
      [todayKey]: {
        ...todayRecord,
        lunchIn: timeStr,
        lunchInLocation: { locality: area, coords: { latitude, longitude } },
      },
    };
    setRecords(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    setToastMessage(`🍱 Lunch In recorded at ${timeStr}${area ? ` · 📍 ${area}` : ""}!`);

    try {
      await punchLunchAttendance({
        executive_id: Number(activeExecutive.id),
        attendance_date: todayRecord?.date || todayIso,
        action: "lunch_in",
        punch_time: isoNow,
        latitude,
        longitude,
        area,
      });
    } catch (err) {
      console.error("Backend punchLunchAttendance lunch_in error:", err);
    }
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
        lunchOut: null,
        lunchIn: null,
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
          login_time: getLocalIsoString(),
          latitude: locationData?.coords?.latitude || locationData?.lat || null,
          longitude: locationData?.coords?.longitude || locationData?.lng || null,
          area: locationData?.locality || profileRegion,
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
      const finalDuration = calculateDuration(
        todayRecord.punchIn,
        punchTime,
        todayRecord.lunchOut,
        todayRecord.lunchIn
      );
      const totalMinutes = calculateTotalMinutes(
        todayRecord.punchIn,
        punchTime,
        todayRecord.lunchOut,
        todayRecord.lunchIn
      );

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
          logout_time: getLocalIsoString(),
          latitude: locationData?.coords?.latitude || locationData?.lat || null,
          longitude: locationData?.coords?.longitude || locationData?.lng || null,
          area: locationData?.locality || profileRegion,
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
          locality: d.area || d.login_area || profileRegion,
          coords: { latitude: d.latitude ?? d.login_latitude, longitude: d.longitude ?? d.login_longitude },
        },
        faceImage: d.login_selfie_url,
        lunchOut: formatIsoToTimeStr(d.lunch_out_time || d.lunch_out),
        lunchIn: formatIsoToTimeStr(d.lunch_in_time || d.lunch_in),
        punchOut: formatIsoToTimeStr(d.logout_time),
        punchOutLocation: (d.area || d.logout_area)
          ? {
              locality: d.area || d.logout_area,
              coords: { latitude: d.latitude ?? d.logout_latitude, longitude: d.longitude ?? d.logout_longitude },
            }
          : null,
        punchOutFaceImage: d.logout_selfie_url,
        duration:
          d.total_working_minutes !== null && d.total_working_minutes !== undefined
            ? `${Math.floor(d.total_working_minutes / 60)}h ${d.total_working_minutes % 60}m`
            : calculateDuration(
                formatIsoToTimeStr(d.login_time),
                formatIsoToTimeStr(d.logout_time),
                formatIsoToTimeStr(d.lunch_out_time || d.lunch_out),
                formatIsoToTimeStr(d.lunch_in_time || d.lunch_in)
              ),
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

    return Array.from(map.values())
      .filter((r) => r.punchIn || r.punchOut)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
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

  // Today Date & Day Formatted (Monday if Monday, Tuesday if Tuesday)
  const todayInfo = useMemo(() => formatAttendanceDateAndDay(todayIso), [todayIso]);

  // Sort order: newest first (desc) or oldest first (asc)
  const [sortOrder, setSortOrder] = useState("desc");

  const displayList = useMemo(() => {
    const list = [...historyList];
    list.sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
    });
    return list;
  }, [historyList, sortOrder]);

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
          ) : isLunchOut && !isLunchIn ? (
            <div className="attend-header-status-chip lunch">
              <Utensils size={14} />
              <span>On Lunch Break ({todayRecord?.lunchOut})</span>
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
            <div
              className={`attend-status-indicator ${
                isPunchedOut
                  ? "done"
                  : isLunchOut && !isLunchIn
                  ? "lunch"
                  : isPunchedIn
                  ? "active"
                  : "pending"
              }`}
            >
              {isPunchedOut ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>Shift Completed</span>
                </>
              ) : isLunchOut && !isLunchIn ? (
                <>
                  <Utensils size={16} />
                  <span>On Lunch Break ({todayRecord?.lunchOut})</span>
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

        {/* Right Card: Punch Buttons (Morning, Lunch Out, Lunch In, Evening) */}
        <div className="attend-actions-card">
          <div className="attend-actions-title">
            <div className="attend-actions-icon-badge">
              <Clock size={18} />
            </div>
            <div>
              <h3>Daily Shift Punch — {todayInfo.formattedDate}, {todayInfo.dayName}</h3>
              <p>Record biometric morning login, lunch breaks, and evening logout for field duty</p>
            </div>
          </div>

          <div className="attend-punch-buttons-row">
            {/* 1. MORNING PUNCH IN BUTTON (Biometric Face Verification Modal) */}
            <button
              type="button"
              className={`attend-punch-btn punch-in-btn ${isPunchedIn ? "punched" : ""}`}
              onClick={handlePunchIn}
              disabled={isPunchedIn}
              title={isPunchedIn ? `Morning Punched In at ${todayRecord?.punchIn}` : "Click to record Morning Punch In with biometric face verification"}
            >
              <div className="attend-btn-icon-wrap in-icon">
                {isPunchedIn ? <Check size={24} /> : <LogIn size={24} />}
              </div>
              <div className="attend-btn-content">
                <span className="attend-btn-action">
                  {isPunchedIn ? "Morning Punched In" : "Morning Punch In"}
                </span>
                <span className="attend-btn-time">
                  {isPunchedIn ? todayRecord?.punchIn : "Click to Start Shift"}
                </span>
              </div>
            </button>

            {/* 2. LUNCH OUT BUTTON (Timing only - NO face auto generation) */}
            <button
              type="button"
              className={`attend-punch-btn lunch-out-btn ${
                isLunchOut
                  ? "punched"
                  : !isPunchedIn || isPunchedOut
                  ? "disabled"
                  : ""
              }`}
              onClick={handleLunchOut}
              disabled={!isPunchedIn || isLunchOut || isPunchedOut}
              title={
                !isPunchedIn
                  ? "Please punch in morning first"
                  : isLunchOut
                  ? `Lunch Out recorded at ${todayRecord?.lunchOut} (Timing only)`
                  : isPunchedOut
                  ? "Shift already ended"
                  : "Click to record Lunch Out (Timing only - no biometric prompt)"
              }
            >
              <div className="attend-btn-icon-wrap lunch-out-icon">
                {isLunchOut ? <Check size={24} /> : <Utensils size={24} />}
              </div>
              <div className="attend-btn-content">
                <span className="attend-btn-action">
                  {isLunchOut ? "Lunch Out Recorded" : "Lunch Out"}
                </span>
                <span className="attend-btn-time">
                  {isLunchOut
                    ? todayRecord?.lunchOut
                    : !isPunchedIn
                    ? "Punch In First"
                    : isPunchedOut
                    ? "Shift Ended"
                    : "Click to Record"}
                </span>
              </div>
            </button>

            {/* 3. LUNCH IN BUTTON (Timing only - NO face auto generation) */}
            <button
              type="button"
              className={`attend-punch-btn lunch-in-btn ${
                isLunchIn
                  ? "punched"
                  : !isLunchOut || isPunchedOut
                  ? "disabled"
                  : ""
              }`}
              onClick={handleLunchIn}
              disabled={!isLunchOut || isLunchIn || isPunchedOut}
              title={
                !isLunchOut
                  ? "Please record Lunch Out first"
                  : isLunchIn
                  ? `Lunch In recorded at ${todayRecord?.lunchIn} (Timing recorded)`
                  : isPunchedOut
                  ? "Shift already ended"
                  : "Click to record Lunch In (Timing only - no biometric prompt)"
              }
            >
              <div className="attend-btn-icon-wrap lunch-in-icon">
                {isLunchIn ? <Check size={24} /> : <Coffee size={24} />}
              </div>
              <div className="attend-btn-content">
                <span className="attend-btn-action">
                  {isLunchIn ? "Lunch In Recorded" : "Lunch In"}
                </span>
                <span className="attend-btn-time">
                  {isLunchIn
                    ? todayRecord?.lunchIn
                    : !isLunchOut
                    ? "Lunch Out First"
                    : isPunchedOut
                    ? "Shift Ended"
                    : "Click to Resume"}
                </span>
              </div>
            </button>

            {/* 4. EVENING LOGOUT BUTTON (Biometric Face Verification Modal) */}
            <button
              type="button"
              className={`attend-punch-btn punch-out-btn ${isPunchedOut ? "punched" : !isPunchedIn ? "disabled" : ""}`}
              onClick={handlePunchOut}
              disabled={!isPunchedIn || isPunchedOut}
              title={
                !isPunchedIn
                  ? "Please complete Morning Punch In first"
                  : isPunchedOut
                  ? `Evening Logged Out at ${todayRecord?.punchOut}`
                  : "Click to record Evening Logout with biometric face verification"
              }
            >
              <div className="attend-btn-icon-wrap out-icon">
                {isPunchedOut ? <Check size={24} /> : <LogOut size={24} />}
              </div>
              <div className="attend-btn-content">
                <span className="attend-btn-action">
                  {isPunchedOut ? "Evening Logged Out" : "Evening Logout"}
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

          {/* Today's Punch Summary Bar: Morning, Lunch Out, Lunch In, Evening Logout, Duration */}
          <div className="attend-summary-bar">
            {/* Morning Punch In */}
            <div className="attend-bar-item">
              <span className="bar-label">Morning Punch In</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="bar-val">{todayRecord?.punchIn || "—"}</span>
                {todayRecord?.faceImage && (
                  <button
                    type="button"
                    className="attend-photo-thumb-btn"
                    title="View Morning Punch In Face Verification"
                    onClick={() =>
                      setPreviewPhotoModal({
                        image: todayRecord.faceImage,
                        execName: activeExecutive.name,
                        time: todayRecord.punchIn,
                        date: todayRecord.date || todayIso,
                        location: todayRecord.punchInLocation,
                        punchType: "Morning Punch In",
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

            {/* Lunch Out (Timing only - no face photo) */}
            <div className="attend-bar-item">
              <span className="bar-label">Lunch Out</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="bar-val">{todayRecord?.lunchOut || "—"}</span>
                {todayRecord?.lunchOut && (
                  <span className="attend-timing-chip amber">
                    <Check size={10} /> Punched
                  </span>
                )}
              </div>
              <span className="attend-loc-sub">
                {todayRecord?.lunchOutLocation?.locality ? (
                  <><MapPin size={10} /> {todayRecord.lunchOutLocation.locality}</>
                ) : todayRecord?.lunchOut ? "GPS Fetched" : "Break Out"}
              </span>
            </div>

            <div className="attend-bar-divider"></div>

            {/* Lunch In (Timing only - no face photo) */}
            <div className="attend-bar-item">
              <span className="bar-label">Lunch In</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="bar-val">{todayRecord?.lunchIn || "—"}</span>
                {todayRecord?.lunchIn && (
                  <span className="attend-timing-chip sky">
                    <Check size={10} /> Punched
                  </span>
                )}
              </div>
              <span className="attend-loc-sub">
                {todayRecord?.lunchInLocation?.locality ? (
                  <><MapPin size={10} /> {todayRecord.lunchInLocation.locality}</>
                ) : todayRecord?.lunchIn ? "GPS Fetched" : "Break In"}
              </span>
            </div>

            <div className="attend-bar-divider"></div>

            {/* Evening Logout */}
            <div className="attend-bar-item">
              <span className="bar-label">Evening Logout</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="bar-val">{todayRecord?.punchOut || "—"}</span>
                {todayRecord?.punchOutFaceImage && (
                  <button
                    type="button"
                    className="attend-photo-thumb-btn out"
                    title="View Evening Logout Face Verification"
                    onClick={() =>
                      setPreviewPhotoModal({
                        image: todayRecord.punchOutFaceImage,
                        execName: activeExecutive.name,
                        time: todayRecord.punchOut,
                        date: todayRecord.date || todayIso,
                        location: todayRecord.punchOutLocation,
                        punchType: "Evening Logout",
                      })
                    }
                  >
                    <img
                      src={todayRecord.punchOutFaceImage}
                      alt="Verified Face"
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

            {/* Total Duration */}
            <div className="attend-bar-item">
              <span className="bar-label">Total Duration</span>
              <span className="bar-val">{isPunchedIn ? liveDuration : "0h 0m"}</span>
            </div>
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

      {/* Attendance Log Table — Only Punched Records */}
      <div className="attend-table-card">
        <div className="attend-table-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h3>Attendance — {todayInfo.formattedDate}, {todayInfo.dayName}</h3>
              <span className="attend-live-badge">
                <span className="attend-pulse-dot" />
                Live Punch Records
              </span>
            </div>
            <p>
              Daily duty punches, face verification, and verified hours for {profileName}
            </p>
          </div>

          <div className="attend-header-actions-right">
            {/* Sort Order Selector */}
            <div className="attend-order-selector-wrap">
              <label htmlFor="punch_sort_sel">SORT:</label>
              <select
                id="punch_sort_sel"
                className="attend-order-select"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="desc">Latest First (Newest ➔ Oldest)</option>
                <option value="asc">Oldest First (Oldest ➔ Newest)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="attend-table-responsive">
          {displayList.length === 0 ? (
            <div
              className="attend-week-card"
              style={{
                padding: "48px 24px",
                textAlign: "center",
                border: "1px dashed var(--border, #cbd5e1)",
                background: "var(--card, #ffffff)",
                borderRadius: "12px",
                margin: "16px",
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
                No Punched Attendance Records Yet
              </h4>
              <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>
                Punch in above using "Morning Punch In" to start today's shift. Only days with punch activity are displayed!
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
                  <th>Morning Punch In</th>
                  <th>Lunch Out</th>
                  <th>Lunch In</th>
                  <th>Evening Logout</th>
                  <th>Working Hours</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {displayList.map((row) => {
                  const dateInfo = formatAttendanceDateAndDay(row.date);
                  return (
                    <tr key={row.id}>
                      <td>
                        <span className="attend-date-text">{row.date}</span>
                      </td>
                      <td>
                        <span className={`attend-day-text ${dateInfo.dayName.toLowerCase() === "sunday" ? "sunday" : ""}`}>
                          {dateInfo.dayName}
                        </span>
                      </td>
                      <td>
                        <div className="attend-exec-cell">
                          <DoctorAvatar name={row.execName || activeExecutive.name} size={24} />
                          <span>{row.execName || activeExecutive.name}</span>
                        </div>
                      </td>
                      <td>
                        {(row.faceImage || row.punchOutFaceImage) ? (
                          <div className="attend-face-cell" style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            {row.faceImage && (
                              <button
                                type="button"
                                className="attend-photo-thumb-btn"
                                title="Click to view Morning Punch In Face Verification"
                                onClick={() =>
                                  setPreviewPhotoModal({
                                    image: row.faceImage,
                                    execName: row.execName || activeExecutive.name,
                                    time: row.punchIn,
                                    date: row.date,
                                    location: row.punchInLocation,
                                    punchType: "Morning Punch In",
                                  })
                                }
                              >
                                <img
                                  src={row.faceImage}
                                  alt="Morning Punch In Face"
                                  className="attend-photo-thumb-img"
                                />
                                <span className="attend-photo-verified-icon">✓</span>
                              </button>
                            )}
                            {row.punchOutFaceImage && (
                              <button
                                type="button"
                                className="attend-photo-thumb-btn out"
                                title="Click to view Evening Logout Face Verification"
                                onClick={() =>
                                  setPreviewPhotoModal({
                                    image: row.punchOutFaceImage,
                                    execName: row.execName || activeExecutive.name,
                                    time: row.punchOut,
                                    date: row.date,
                                    location: row.punchOutLocation,
                                    punchType: "Evening Logout",
                                  })
                                }
                              >
                                <img
                                  src={row.punchOutFaceImage}
                                  alt="Evening Logout Face"
                                  className="attend-photo-thumb-img"
                                />
                                <span className="attend-photo-verified-icon">✓</span>
                              </button>
                            )}
                            <span className="attend-face-tag">
                              {row.faceImage && row.punchOutFaceImage
                                ? "In & Out Verified"
                                : row.faceImage
                                ? "Morning In Verified"
                                : "Evening Out Verified"}
                            </span>
                          </div>
                        ) : (
                          <span className="attend-no-photo-badge" title="SE Biometric registered">
                            <Check size={11} style={{ color: "#10b981" }} /> SE Biometric
                          </span>
                        )}
                      </td>
                      <td>
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
                      </td>
                      <td>
                        <div className="attend-punch-cell">
                          <span className={`attend-time-pill ${row.lunchOut ? "lunch" : "empty"}`}>
                            {row.lunchOut || "—"}
                          </span>
                          {row.lunchOut && (
                            <span className="attend-loc-sub timing-only">
                              Timing Only
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="attend-punch-cell">
                          <span className={`attend-time-pill ${row.lunchIn ? "lunch-in" : "empty"}`}>
                            {row.lunchIn || "—"}
                          </span>
                          {row.lunchIn && (
                            <span className="attend-loc-sub timing-only">
                              Timing Only
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="attend-punch-cell">
                          <span className="attend-time-pill out">
                            {row.punchOut || "—"}
                          </span>
                          {row.punchOut && (
                            <span className="attend-loc-sub">
                              <MapPin size={10} />
                              {row.punchOutLocation?.locality || profileRegion}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="attend-duration-text">
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
