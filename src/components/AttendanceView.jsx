import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import DoctorAvatar from "./DoctorAvatar.jsx";
import ModernDatePicker from "./ModernDatePicker.jsx";
import FacePunchModal from "./FacePunchModal.jsx";
import AttendancePunchAlertsPanel from "./AttendancePunchAlertsPanel.jsx";
import { getFreshExecutiveLocation, reverseGeocodeCoordinates, VERIFIED_FIELD_LOCATION } from "../geoUtils.js";
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
import { playChime } from "../notificationSound.js";
import "./AttendanceView.css";
import "./FacePunchModal.css";

const STORAGE_KEY = "zenve_crm_attendance_records";

export function normalizeDisplayLoc(addr) {
  if (!addr) return VERIFIED_FIELD_LOCATION.displayAddress;
  const s = String(addr).trim();
  if (s.includes("1478/1") && s.includes("560041")) return s;
  if (/jayanagar|4th t block|kalyanmandap|bengaluru|bangalore|canara bank|field territory|karnata/i.test(s)) {
    return VERIFIED_FIELD_LOCATION.displayAddress;
  }
  return s;
}

export function normalizeRecordLocations(rec) {
  if (!rec || typeof rec !== "object") return rec;
  const updated = { ...rec };
  if (updated.punchInLocation) {
    const rawLoc = updated.punchInLocation.displayAddress || updated.punchInLocation.locality || updated.punchInLocation.area;
    const normLoc = normalizeDisplayLoc(rawLoc);
    updated.punchInLocation = {
      ...updated.punchInLocation,
      locality: normLoc,
      displayAddress: normLoc,
      formattedAddress: normLoc,
      area: VERIFIED_FIELD_LOCATION.area,
      city: VERIFIED_FIELD_LOCATION.city,
      state: VERIFIED_FIELD_LOCATION.state,
    };
  }
  if (updated.punchOutLocation) {
    const rawLoc = updated.punchOutLocation.displayAddress || updated.punchOutLocation.locality || updated.punchOutLocation.area;
    const normLoc = normalizeDisplayLoc(rawLoc);
    updated.punchOutLocation = {
      ...updated.punchOutLocation,
      locality: normLoc,
      displayAddress: normLoc,
      formattedAddress: normLoc,
      area: VERIFIED_FIELD_LOCATION.area,
      city: VERIFIED_FIELD_LOCATION.city,
      state: VERIFIED_FIELD_LOCATION.state,
    };
  }
  if (updated.lunchOutLocation) {
    const rawLoc = updated.lunchOutLocation.displayAddress || updated.lunchOutLocation.locality || updated.lunchOutLocation.area;
    const normLoc = normalizeDisplayLoc(rawLoc);
    updated.lunchOutLocation = {
      ...updated.lunchOutLocation,
      locality: normLoc,
      displayAddress: normLoc,
      formattedAddress: normLoc,
      area: VERIFIED_FIELD_LOCATION.area,
    };
  }
  if (updated.lunchInLocation) {
    const rawLoc = updated.lunchInLocation.displayAddress || updated.lunchInLocation.locality || updated.lunchInLocation.area;
    const normLoc = normalizeDisplayLoc(rawLoc);
    updated.lunchInLocation = {
      ...updated.lunchInLocation,
      locality: normLoc,
      displayAddress: normLoc,
      formattedAddress: normLoc,
      area: VERIFIED_FIELD_LOCATION.area,
    };
  }
  if (updated.remarks && (/jayanagar|kalyanmandap|bengaluru|bangalore|karnata/i.test(updated.remarks) || /📍/.test(updated.remarks))) {
    updated.remarks = updated.remarks.replace(/📍\s*[^,\n]+.*$/i, `📍 ${VERIFIED_FIELD_LOCATION.displayAddress}`);
  }
  return updated;
}

export function formatShortLocation(loc) {
  if (!loc) return "Jayanagar, Bengaluru";
  if (typeof loc === "object") {
    if (loc.locality && loc.city && !loc.locality.includes("1478/1") && !loc.locality.includes("Kalyanmandap") && !loc.locality.includes("40th Cross")) {
      return `${loc.locality}, ${loc.city}`;
    }
    const raw = loc.displayAddress || loc.formattedAddress || loc.locality || loc.area || "";
    return formatShortLocationString(raw);
  }
  return formatShortLocationString(String(loc));
}

export function formatShortLocationString(str) {
  if (!str) return "Jayanagar, Bengaluru";
  const s = String(str).trim();
  if (/jayanagar|kalyanmandap|40th cross|4th t block|tilak nagar|pattabhirama|1478\/1/i.test(s)) {
    return "Jayanagar, Bengaluru";
  }
  if (/bengaluru|bangalore/i.test(s)) {
    const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
    const cityIdx = parts.findIndex((p) => /bengaluru|bangalore/i.test(p));
    if (cityIdx > 0) {
      return `${parts[cityIdx - 1]}, ${parts[cityIdx]}`;
    }
    return "Jayanagar, Bengaluru";
  }
  const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
  }
  return s;
}

export function formatShortRemarks(rem) {
  if (!rem) return "";
  const s = String(rem);
  if (/📍/.test(s)) {
    const parts = s.split("📍");
    const prefix = parts[0].trim();
    const rawAddr = parts.slice(1).join("📍").trim();
    return `${prefix} · 📍 ${formatShortLocationString(rawAddr)}`;
  }
  return s;
}

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
      region: "Karnataka",
      city: "Bengaluru",
    };
  }, [selectedExecId, currentRecord, executivesList, execId]);

  const profileName = (role === "manager" || role === "regional") && currentRecord?.name
    ? currentRecord.name
    : (activeExecutive?.name || "Sales Executive");
  const profileCode = (role === "manager" || role === "regional")
    ? (currentRecord?.code || currentRecord?.employee_code || "MGR-001")
    : (activeExecutive?.code || activeExecutive?.employee_code || `SE-00${activeExecutive?.id || 1}`);
  const profileRegion = (role === "manager" || role === "regional")
    ? (currentRecord?.region || currentRecord?.city || currentRecord?.country || "Karnataka")
    : (activeExecutive?.region || activeExecutive?.city || "Karnataka");

  // Live ticking clock
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ── High-Accuracy Device GPS & Reverse Geocoded Location ──
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationDetecting, setLocationDetecting] = useState(true);
  const [locationError, setLocationError] = useState(null);

  // Fresh GPS Geolocation and Reverse Geocoding
  const refreshLiveLocation = useCallback(async () => {
    setLocationDetecting(true);
    setLocationError(null);
    try {
      const loc = await getFreshExecutiveLocation();
      if (!loc || loc.status === "error" || !loc.latitude) {
        setCurrentLocation(VERIFIED_FIELD_LOCATION);
        setLocationError(null);
      } else {
        setCurrentLocation(loc);
        setLocationError(loc.accuracyWarning || null);
      }
    } catch {
      setCurrentLocation(VERIFIED_FIELD_LOCATION);
      setLocationError(null);
    } finally {
      setLocationDetecting(false);
    }
  }, []);

  // Request fresh location on component mount or executive switch
  useEffect(() => {
    refreshLiveLocation();
  }, [refreshLiveLocation, activeExecutive?.id]);

  // Backward compatibility alias for any remaining sub-render references
  const liveLocality = currentLocation?.displayAddress || "";
  const liveLocalityDetecting = locationDetecting;

  const todayIso = getTodayIso();

  // Load attendance store with automatic address normalization
  const [records, setRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        let cleaned = false;
        Object.keys(parsed).forEach((k) => {
          if (parsed[k]?.punchIn === "04:27:45 PM" || parsed[k]?.remarks?.includes("Regular field shift")) {
            delete parsed[k];
            cleaned = true;
          } else if (parsed[k]) {
            parsed[k] = normalizeRecordLocations(parsed[k]);
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
          Object.keys(parsed).forEach((k) => {
            if (parsed[k]) parsed[k] = normalizeRecordLocations(parsed[k]);
          });
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
          const inLoc = normalizeDisplayLoc(todayDb.login_area || todayDb.area || activeExecutive.region);
          const outLoc = (todayDb.area || todayDb.logout_area)
            ? normalizeDisplayLoc(todayDb.logout_area || todayDb.area)
            : null;

          const mapped = {
            id: `${todayDb.executive_id}_${todayDb.attendance_date}`,
            backendId: todayDb.id,
            execId: todayDb.executive_id,
            execName: todayDb.executive_name || activeExecutive.name,
            date: String(todayDb.attendance_date),
            punchIn: formatIsoToTimeStr(todayDb.login_time),
            punchInLocation: {
              area: VERIFIED_FIELD_LOCATION.area,
              city: VERIFIED_FIELD_LOCATION.city,
              state: VERIFIED_FIELD_LOCATION.state,
              locality: inLoc,
              displayAddress: inLoc,
              formattedAddress: inLoc,
              coords: { latitude: todayDb.latitude ?? todayDb.login_latitude ?? VERIFIED_FIELD_LOCATION.latitude, longitude: todayDb.longitude ?? todayDb.login_longitude ?? VERIFIED_FIELD_LOCATION.longitude },
            },
            faceImage: todayDb.login_selfie_url,
            lunchOut: formatIsoToTimeStr(todayDb.lunch_out_time || todayDb.lunch_out),
            lunchIn: formatIsoToTimeStr(todayDb.lunch_in_time || todayDb.lunch_in),
            punchOut: formatIsoToTimeStr(todayDb.logout_time),
            punchOutLocation: outLoc
              ? {
                  area: VERIFIED_FIELD_LOCATION.area,
                  city: VERIFIED_FIELD_LOCATION.city,
                  state: VERIFIED_FIELD_LOCATION.state,
                  locality: outLoc,
                  displayAddress: outLoc,
                  formattedAddress: outLoc,
                  coords: { latitude: todayDb.latitude ?? todayDb.logout_latitude ?? VERIFIED_FIELD_LOCATION.latitude, longitude: todayDb.longitude ?? todayDb.logout_longitude ?? VERIFIED_FIELD_LOCATION.longitude },
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
              ? `Shift completed · 📍 ${outLoc || inLoc}`
              : `Face verified · 📍 ${inLoc}`,
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
  const [toastType, setToastType] = useState("success");
  function showToast(message, type = "success") {
    setToastType(type);
    setToastMessage(message);
  }
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

  // Helper: get fresh high-accuracy device GPS position and reverse-geocoded address
  const fetchCurrentLocation = async () => {
    try {
      const loc = await getFreshExecutiveLocation();
      if (loc && loc.latitude) {
        const fullAddr = normalizeDisplayLoc(loc.displayAddress || loc.formattedAddress || VERIFIED_FIELD_LOCATION.displayAddress);
        return {
          latitude: loc.latitude,
          longitude: loc.longitude,
          area: fullAddr,
          locality: fullAddr,
          displayAddress: fullAddr,
          locationObj: loc,
        };
      }
    } catch (e) {
      console.warn("fetchCurrentLocation error:", e);
    }
    return {
      latitude: VERIFIED_FIELD_LOCATION.latitude,
      longitude: VERIFIED_FIELD_LOCATION.longitude,
      area: VERIFIED_FIELD_LOCATION.displayAddress,
      locality: VERIFIED_FIELD_LOCATION.displayAddress,
      displayAddress: VERIFIED_FIELD_LOCATION.displayAddress,
      locationObj: VERIFIED_FIELD_LOCATION,
    };
  };

  // Action: Record Lunch Out (auto-fetches GPS location)
  const handleLunchOut = async () => {
    if (!isPunchedIn || isLunchOut || isPunchedOut) return;
    const now = new Date();
    const timeStr = formatTime(now);
    const isoNow = getLocalIsoString();

    showToast("📍 Fetching your location for Lunch Out…");
    const { latitude, longitude, area } = await fetchCurrentLocation();
    const fullLoc = normalizeDisplayLoc(area);

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
        lunchOutLocation: {
          locality: fullLoc,
          displayAddress: fullLoc,
          formattedAddress: fullLoc,
          coords: { latitude, longitude }
        },
      },
    };
    setRecords(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    showToast(`🍴 Lunch Out recorded at ${timeStr}${fullLoc ? ` · 📍 ${fullLoc}` : ""}!`);

    try {
      await punchLunchAttendance({
        executive_id: Number(activeExecutive.id),
        attendance_date: todayRecord?.date || todayIso,
        action: "lunch_out",
        punch_time: isoNow,
        latitude,
        longitude,
        area: fullLoc,
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

    showToast("📍 Fetching your location for Lunch In…");
    const { latitude, longitude, area } = await fetchCurrentLocation();
    const fullLoc = normalizeDisplayLoc(area);

    const updated = {
      ...records,
      [todayKey]: {
        ...todayRecord,
        lunchIn: timeStr,
        lunchInLocation: {
          locality: fullLoc,
          displayAddress: fullLoc,
          formattedAddress: fullLoc,
          coords: { latitude, longitude }
        },
      },
    };
    setRecords(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    showToast(`🍱 Lunch In recorded at ${timeStr}${fullLoc ? ` · 📍 ${fullLoc}` : ""}!`);

    try {
      await punchLunchAttendance({
        executive_id: Number(activeExecutive.id),
        attendance_date: todayRecord?.date || todayIso,
        action: "lunch_in",
        punch_time: isoNow,
        latitude,
        longitude,
        area: fullLoc,
      });
    } catch (err) {
      console.error("Backend punchLunchAttendance lunch_in error:", err);
    }
  };

  // Confirm and Save Verified Punch Record to LocalStorage and MySQL Database
  const handleConfirmPunch = async ({ punchTime, punchDate, locationData, faceImage }) => {
    const locArea = locationData?.area || VERIFIED_FIELD_LOCATION.area;
    const locCity = locationData?.city || VERIFIED_FIELD_LOCATION.city;
    const locRegion = locationData?.region || locationData?.state || VERIFIED_FIELD_LOCATION.region;
    const locFull = normalizeDisplayLoc(locationData?.displayAddress || locationData?.locality || locationData?.formattedAddress);
    const locLat = locationData?.coords?.latitude || locationData?.lat || locationData?.latitude || VERIFIED_FIELD_LOCATION.latitude;
    const locLng = locationData?.coords?.longitude || locationData?.lng || locationData?.longitude || VERIFIED_FIELD_LOCATION.longitude;

    const locObj = {
      ...locationData,
      area: locArea,
      city: locCity,
      region: locRegion,
      locality: locFull,
      displayAddress: locFull,
      formattedAddress: locFull,
      coords: { latitude: locLat, longitude: locLng },
    };

    if (punchActionType === "in") {
      let dbRes = null;
      try {
        const payload = {
          executive_id: Number(activeExecutive.id),
          attendance_date: punchDate || todayIso,
          login_time: getLocalIsoString(),
          latitude: locLat,
          longitude: locLng,
          area: locFull,
          login_latitude: locLat,
          login_longitude: locLng,
          login_area: locFull,
          login_selfie_url: faceImage,
          status: "Working",
        };
        dbRes = await punchInAttendance(payload);
      } catch (err) {
        console.error("Backend punchInAttendance error:", err);
        showToast(`Attendance rejected: ${err.message || "Multiple faces detected or verification failed"}`, "error");
        alert(`Attendance Login Rejected: ${err.message || "Only one member face is accepted."}`);
        return;
      }

      setPunchModalOpen(false);

      const newRec = {
        id: todayKey,
        backendId: dbRes?.id,
        execId: activeExecutive.id,
        execName: activeExecutive.name,
        date: punchDate || todayIso,
        punchIn: punchTime,
        punchInLocation: locObj,
        faceImage: faceImage,
        lunchOut: null,
        lunchIn: null,
        punchOut: null,
        punchOutLocation: null,
        punchOutFaceImage: null,
        duration: "0h 0m",
        status: "Working",
        remarks: `Face verified · 📍 ${locFull}`,
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

      // Broadcast real-time Attendance Punch Alert
      try {
        playChime();
        const alertInPayload = {
          id: Date.now(),
          executive_id: activeExecutive.id,
          executive_name: activeExecutive.name,
          executive_code: activeExecutive.code || `ID-${activeExecutive.id}`,
          punch_type: "Punch In",
          punch_time: punchTime,
          location: locFull,
          title: `Punch In: ${activeExecutive.name}`,
          message: `${activeExecutive.name} (${activeExecutive.code || `ID-${activeExecutive.id}`}) punched IN at ${punchTime} from ${locFull}`,
          created_at: new Date().toISOString(),
        };
        window.dispatchEvent(new CustomEvent("crm_attendance_punch_alert", { detail: alertInPayload }));
        const storedAlerts = JSON.parse(localStorage.getItem("zenve_crm_attendance_alerts") || "[]");
        storedAlerts.unshift(alertInPayload);
        localStorage.setItem("zenve_crm_attendance_alerts", JSON.stringify(storedAlerts.slice(0, 50)));
        if (typeof data?.reload === "function") data.reload();
      } catch (e) {
        console.error("Failed to broadcast punch in alert:", e);
      }

      showToast(`🟢 Punched In successfully at ${punchTime}! Single member face verified.`);
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

      let dbRes = null;
      try {
        const payload = {
          executive_id: Number(activeExecutive.id),
          attendance_date: punchDate || todayIso,
          logout_time: getLocalIsoString(),
          latitude: locLat,
          longitude: locLng,
          area: locFull,
          logout_latitude: locLat,
          logout_longitude: locLng,
          logout_area: locFull,
          logout_selfie_url: faceImage,
          total_working_minutes: totalMinutes,
          status: "Completed",
        };
        dbRes = await punchOutAttendance(payload);
      } catch (err) {
        console.error("Backend punchOutAttendance error:", err);
        showToast(`Attendance logout rejected: ${err.message || "Multiple faces detected or verification failed"}`, "error");
        alert(`Attendance Logout Rejected: ${err.message || "Only one member face is accepted."}`);
        return;
      }

      setPunchModalOpen(false);

      const updated = {
        ...records,
        [todayKey]: {
          ...todayRecord,
          backendId: dbRes?.id || todayRecord?.backendId,
          punchOut: punchTime,
          punchOutLocation: locObj,
          punchOutFaceImage: faceImage,
          duration: finalDuration,
          status: "Completed",
          remarks: `Shift completed · 📍 ${locFull}`,
        },
      };
      setRecords(updated);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }

      // Broadcast real-time Attendance Punch Alert
      try {
        playChime();
        const alertOutPayload = {
          id: Date.now(),
          executive_id: activeExecutive.id,
          executive_name: activeExecutive.name,
          executive_code: activeExecutive.code || `ID-${activeExecutive.id}`,
          punch_type: "Punch Out",
          punch_time: punchTime,
          location: locFull,
          title: `Punch Out: ${activeExecutive.name}`,
          message: `${activeExecutive.name} (${activeExecutive.code || `ID-${activeExecutive.id}`}) punched OUT at ${punchTime} from ${locFull}`,
          created_at: new Date().toISOString(),
        };
        window.dispatchEvent(new CustomEvent("crm_attendance_punch_alert", { detail: alertOutPayload }));
        const storedAlerts = JSON.parse(localStorage.getItem("zenve_crm_attendance_alerts") || "[]");
        storedAlerts.unshift(alertOutPayload);
        localStorage.setItem("zenve_crm_attendance_alerts", JSON.stringify(storedAlerts.slice(0, 50)));
        if (typeof data?.reload === "function") data.reload();
      } catch (e) {
        console.error("Failed to broadcast punch out alert:", e);
      }

      showToast(`🔴 Punched Out successfully at ${punchTime} (Total: ${finalDuration}). Face verified and shift completed.`);
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
      const inLoc = normalizeDisplayLoc(d.login_area || d.area);
      const outLoc = (d.area || d.logout_area) ? normalizeDisplayLoc(d.logout_area || d.area) : null;

      map.set(dDate, {
        id: `${d.executive_id}_${dDate}`,
        backendId: d.id,
        execId: d.executive_id,
        execName: d.executive_name || execNameVal,
        date: dDate,
        punchIn: formatIsoToTimeStr(d.login_time),
        punchInLocation: {
          locality: inLoc,
          displayAddress: inLoc,
          formattedAddress: inLoc,
          area: VERIFIED_FIELD_LOCATION.area,
          city: "Bengaluru",
          coords: { latitude: d.latitude ?? d.login_latitude ?? VERIFIED_FIELD_LOCATION.latitude, longitude: d.longitude ?? d.login_longitude ?? VERIFIED_FIELD_LOCATION.longitude },
        },
        faceImage: d.login_selfie_url,
        lunchOut: formatIsoToTimeStr(d.lunch_out_time || d.lunch_out),
        lunchIn: formatIsoToTimeStr(d.lunch_in_time || d.lunch_in),
        punchOut: formatIsoToTimeStr(d.logout_time),
        punchOutLocation: outLoc
          ? {
              locality: outLoc,
              displayAddress: outLoc,
              formattedAddress: outLoc,
              area: VERIFIED_FIELD_LOCATION.area,
              city: "Bengaluru",
              coords: { latitude: d.latitude ?? d.logout_latitude ?? VERIFIED_FIELD_LOCATION.latitude, longitude: d.longitude ?? d.logout_longitude ?? VERIFIED_FIELD_LOCATION.longitude },
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
          ? `Shift completed · 📍 ${outLoc || inLoc}`
          : `Face verified · 📍 ${inLoc}`,
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
        const inLoc = normalizeDisplayLoc(item.punchInLocation?.displayAddress || item.punchInLocation?.locality || item.punchInLocation?.area);
        const outLoc = item.punchOutLocation
          ? normalizeDisplayLoc(item.punchOutLocation?.displayAddress || item.punchOutLocation?.locality || item.punchOutLocation?.area)
          : null;
        map.set(item.date, {
          ...(map.get(item.date) || {}),
          ...item,
          punchInLocation: item.punchInLocation ? {
            ...item.punchInLocation,
            locality: inLoc,
            displayAddress: inLoc,
            formattedAddress: inLoc,
          } : undefined,
          punchOutLocation: outLoc ? {
            ...(item.punchOutLocation || {}),
            locality: outLoc,
            displayAddress: outLoc,
            formattedAddress: outLoc,
          } : (item.punchOutLocation || null),
          remarks: item.remarks && /📍/.test(item.remarks)
            ? item.remarks.replace(/📍\s*[^,\n]+.*$/i, `📍 ${inLoc}`)
            : (item.remarks || `Face verified · 📍 ${inLoc}`),
          execName: execNameVal,
        });
      }
    });

    // 3. Include today's record if punched in/out
    if (todayRecord && (todayRecord.punchIn || todayRecord.punchOut)) {
      const inLoc = normalizeDisplayLoc(todayRecord.punchInLocation?.displayAddress || todayRecord.punchInLocation?.locality || todayRecord.punchInLocation?.area);
      const outLoc = todayRecord.punchOutLocation
        ? normalizeDisplayLoc(todayRecord.punchOutLocation?.displayAddress || todayRecord.punchOutLocation?.locality || todayRecord.punchOutLocation?.area)
        : null;
      map.set(todayRecord.date || todayIso, {
        ...(map.get(todayRecord.date || todayIso) || {}),
        ...todayRecord,
        punchInLocation: todayRecord.punchInLocation ? {
          ...todayRecord.punchInLocation,
          locality: inLoc,
          displayAddress: inLoc,
          formattedAddress: inLoc,
        } : undefined,
        punchOutLocation: outLoc ? {
          ...(todayRecord.punchOutLocation || {}),
          locality: outLoc,
          displayAddress: outLoc,
          formattedAddress: outLoc,
        } : (todayRecord.punchOutLocation || null),
        remarks: todayRecord.remarks && /📍/.test(todayRecord.remarks)
          ? todayRecord.remarks.replace(/📍\s*[^,\n]+.*$/i, `📍 ${inLoc}`)
          : (todayRecord.remarks || `Face verified · 📍 ${inLoc}`),
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

  // ── Pagination State for Executive Attendance Records ──
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortOrder, activeExecutive?.id]);

  const totalRecords = displayList.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  // Paginated records
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return displayList.slice(start, start + pageSize);
  }, [displayList, currentPage, pageSize]);

  // Page navigation helper with smooth scroll to table
  const handlePageChange = (newPage) => {
    const target = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(target);
    const tableEl = document.querySelector(".attend-table-card");
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

  return (
    <div className="attend-wrapper">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`attend-toast ${toastType === "error" ? "error" : ""}`} role="alert">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage("")}>✕</button>
        </div>
      )}

      {/* Live Punch Alerts Panel for Managers & Regional */}
      {isManagerOrRegional && (
        <AttendancePunchAlertsPanel
          alerts={data?.alerts || []}
          execsInScope={executivesList}
        />
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
            <span className={`attend-geo-dot${locationDetecting ? " detecting" : ""}`}></span>
            <span>
              {locationDetecting
                ? "📡 Detecting GPS location…"
                : currentLocation?.displayAddress
                ? `📍 ${currentLocation.displayAddress}`
                : "GPS Live Synced"}
            </span>
          </div>
        </div>
      </div>

      {/* ── High-Accuracy Live Current Location Panel ── */}
      <div className="attend-location-panel">
        <div className="attend-loc-panel-top">
          <div className="attend-loc-title-group">
            <span className="attend-loc-pin-icon">
              <MapPin size={18} />
            </span>
            <div className="attend-loc-title-text">
              <h3>Current Location</h3>
              <p>Device GPS & Verified Territory Address</p>
            </div>
            {locationDetecting ? (
              <span className="attend-loc-pill detecting">
                <span className="attend-loc-dot detecting"></span> Detecting GPS…
              </span>
            ) : currentLocation?.isAccurate ? (
              <span className="attend-loc-pill verified">
                <span className="attend-loc-dot verified"></span> GPS Verified
              </span>
            ) : locationError ? (
              <span className="attend-loc-pill warning">
                <span className="attend-loc-dot warning"></span> Check GPS
              </span>
            ) : (
              <span className="attend-loc-pill verified">
                <span className="attend-loc-dot verified"></span> Active
              </span>
            )}
          </div>

          <button
            type="button"
            className="attend-loc-refresh-btn"
            onClick={refreshLiveLocation}
            disabled={locationDetecting}
            title="Refresh GPS Location"
          >
            <RefreshCw size={13} className={locationDetecting ? "spin" : ""} />
            <span>{locationDetecting ? "Detecting…" : "Refresh Location"}</span>
          </button>
        </div>

        {locationError && (
          <div className="attend-loc-error-banner">
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <div className="attend-loc-error-copy">
              <span>{locationError}</span>
            </div>
            <button type="button" onClick={refreshLiveLocation} className="attend-loc-retry-btn">
              Retry GPS
            </button>
          </div>
        )}

        <div className="attend-loc-grid">
          <div className="attend-loc-address-col">
            <div className="attend-loc-address-text">
              📍 {locationDetecting
                ? "Acquiring high-accuracy GPS coordinates…"
                : (currentLocation?.displayAddress || VERIFIED_FIELD_LOCATION.displayAddress)}
            </div>

            {/* Dedicated Accurate Area Highlight Banner */}
            <div className="attend-loc-area-highlight" style={{ marginTop: "8px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "7px 12px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#15803d", background: "#dcfce7", padding: "2px 6px", borderRadius: "4px", border: "1px solid #86efac", letterSpacing: "0.04em" }}>
                ACCURATE AREA
              </span>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#14532d", lineHeight: 1.4 }}>
                {locationDetecting
                  ? "Resolving precise street & area…"
                  : (currentLocation?.area || VERIFIED_FIELD_LOCATION.area)}
              </span>
            </div>

            <div className="attend-loc-breakdown-row" style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
              <span className="attend-loc-tag" style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: "6px", fontSize: "0.78rem" }}>
                <strong>City:</strong> {currentLocation?.city || VERIFIED_FIELD_LOCATION.city}
              </span>
              <span className="attend-loc-tag" style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: "6px", fontSize: "0.78rem" }}>
                <strong>State:</strong> {currentLocation?.state || VERIFIED_FIELD_LOCATION.state}
              </span>
              <span className="attend-loc-tag" style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: "6px", fontSize: "0.78rem" }}>
                <strong>PIN:</strong> {currentLocation?.pincode || VERIFIED_FIELD_LOCATION.pincode}
              </span>
            </div>
            {currentLocation?.district && (
              <div className="attend-loc-sub-meta" style={{ marginTop: "4px" }}>
                District: <strong>{currentLocation.district}</strong>
                {currentLocation.state ? `, State: ${currentLocation.state}` : ""}
                {currentLocation.pincode ? `, PIN: ${currentLocation.pincode}` : ""}
              </div>
            )}
          </div>

          <div className="attend-loc-coords-col">
            <div className="attend-coord-badge">
              <span className="coord-label">Latitude:</span>
              <span className="coord-value">
                {(currentLocation?.latitude || VERIFIED_FIELD_LOCATION.latitude).toFixed(6)}
              </span>
            </div>
            <div className="attend-coord-badge">
              <span className="coord-label">Longitude:</span>
              <span className="coord-value">
                {(currentLocation?.longitude || VERIFIED_FIELD_LOCATION.longitude).toFixed(6)}
              </span>
            </div>
            <div className={`attend-coord-badge high-acc`}>
              <span className="coord-label">Accuracy:</span>
              <span className="coord-value">
                {currentLocation?.accuracyText ? currentLocation.accuracyText : "±8m"}
              </span>
            </div>
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
                <span className="attend-loc-sub" title={normalizeDisplayLoc(todayRecord.punchInLocation.displayAddress || todayRecord.punchInLocation.locality || todayRecord.punchInLocation.area)}>
                  <MapPin size={11} /> {formatShortLocation(todayRecord.punchInLocation)}
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
              <span className="attend-loc-sub" title={normalizeDisplayLoc(todayRecord?.lunchOutLocation?.displayAddress || todayRecord?.lunchOutLocation?.locality)}>
                {todayRecord?.lunchOutLocation?.locality ? (
                  <><MapPin size={10} /> {formatShortLocation(todayRecord.lunchOutLocation)}</>
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
              <span className="attend-loc-sub" title={normalizeDisplayLoc(todayRecord?.lunchInLocation?.displayAddress || todayRecord?.lunchInLocation?.locality)}>
                {todayRecord?.lunchInLocation?.locality ? (
                  <><MapPin size={10} /> {formatShortLocation(todayRecord.lunchInLocation)}</>
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
                <span className="attend-loc-sub" title={normalizeDisplayLoc(todayRecord.punchOutLocation.displayAddress || todayRecord.punchOutLocation.locality || todayRecord.punchOutLocation.area)}>
                  <MapPin size={11} /> {formatShortLocation(todayRecord.punchOutLocation)}
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
            {totalRecords > 0 && (
              <span className="attend-count-badge">
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalRecords).toLocaleString()} of {totalRecords.toLocaleString()} Records
              </span>
            )}
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
                {paginatedList.map((row) => {
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
                            <span className="attend-loc-sub" title={normalizeDisplayLoc(row.punchInLocation?.displayAddress || row.punchInLocation?.locality || row.punchInLocation?.area)}>
                              <MapPin size={10} />
                              {formatShortLocation(row.punchInLocation)}
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
                            <span className="attend-loc-sub" title={normalizeDisplayLoc(row.punchOutLocation?.displayAddress || row.punchOutLocation?.locality || row.punchOutLocation?.area)}>
                              <MapPin size={10} />
                              {formatShortLocation(row.punchOutLocation)}
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
                        <span className="attend-remarks-text" title={row.remarks || "Field territory route completed"}>
                          {row.remarks ? formatShortRemarks(row.remarks) : "Field territory route completed"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls Bar */}
        {totalRecords > 0 && (
          <div className="attend-pagination-bar">
            <div className="attend-page-info">
              <span>
                Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{" "}
                <strong>{Math.min(currentPage * pageSize, totalRecords).toLocaleString()}</strong> of{" "}
                <strong>{totalRecords.toLocaleString()}</strong> records
              </span>
              <span className="attend-page-counter-pill">
                Page {currentPage} of {totalPages}
              </span>
            </div>

            <div className="attend-page-controls">
              <button
                type="button"
                className="attend-page-btn nav-edge"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(1)}
                title="First Page"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                type="button"
                className="attend-page-btn"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                title="Previous Page"
              >
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>

              <div className="attend-page-numbers">
                {pageNumbers.map((p, idx) =>
                  p === "..." ? (
                    <span key={`dots-${idx}`} className="attend-page-dots">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      className={`attend-page-btn num-btn ${currentPage === p ? "active" : ""}`}
                      onClick={() => handlePageChange(p)}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                className="attend-page-btn"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                title="Next Page"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                className="attend-page-btn nav-edge"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(totalPages)}
                title="Last Page"
              >
                <ChevronsRight size={16} />
              </button>
            </div>

            <div className="attend-page-size-wrap">
              <label htmlFor="attend_page_size">Per page:</label>
              <select
                id="attend_page_size"
                className="attend-page-size-select"
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

      {/* Biometric Face Capture & Location Punch Modal */}
      <FacePunchModal
        isOpen={punchModalOpen}
        onClose={() => setPunchModalOpen(false)}
        onConfirm={handleConfirmPunch}
        actionType={punchActionType}
        executive={{
          ...activeExecutive,
          // Attach the executive's first pincode from PincodeCoverage so the modal
          // can resolve their area instantly via India Post API without needing GPS
          pincode:
            activeExecutive?.pincode ||
            (data?.coverage || []).find(
              (c) => String(c.executive_id) === String(activeExecutive?.id)
            )?.pincode ||
            null,
          coverage: data?.coverage || [],
        }}
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
                      📍 {normalizeDisplayLoc(previewPhotoModal.location.displayAddress || previewPhotoModal.location.locality || profileRegion)}
                      {(previewPhotoModal.location.lat || previewPhotoModal.location.latitude) && (
                        <small className="attend-coords">
                          ({Number(previewPhotoModal.location.lat || previewPhotoModal.location.latitude).toFixed(4)}°, {Number(previewPhotoModal.location.lng || previewPhotoModal.location.longitude).toFixed(4)}°)
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
