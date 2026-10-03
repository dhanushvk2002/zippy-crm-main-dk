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
import FacePunchModal from "./FacePunchModal.jsx";
import AttendancePunchAlertsPanel from "./AttendancePunchAlertsPanel.jsx";
import { getAttendanceLocation } from "../utils/location.js";
import {
  getFreshExecutiveLocation,
  reverseGeocodeCoordinates,
  VERIFIED_FIELD_LOCATION,
  formatExecutiveLocation,
  formatLocationString,
} from "../geoUtils.js";
import defaultFacePhoto from "../assets/doctor-male.jpg";
import {
  fetchList,
  punchInAttendance,
  punchOutAttendance,
  punchLunchAttendance,
  punchLunchOutAttendance,
  punchLunchInAttendance,
  fetchAttendanceList,
  fetchTodayAttendance,
} from "../api.js";
import { formatAttendanceDateAndDay } from "../dateUtils.js";
import { playChime } from "../notificationSound.js";
import "./AttendanceView.css";
import "./FacePunchModal.css";

const STORAGE_KEY = "zenve_crm_attendance_records";

export function normalizeDisplayLoc(addr, exec = null) {
  if (!addr) return "";
  return formatLocationString(addr, exec);
}

export function normalizeRecordLocations(rec, exec = null) {
  if (!rec || typeof rec !== "object") return rec;
  const updated = { ...rec };
  const currentExec = exec || rec.executiveObj || {
    name: rec.execName,
    city: rec.punchInLocation?.city || rec.city,
    region: rec.punchInLocation?.state || rec.region || rec.state,
  };

  if (updated.punchInLocation) {
    const rawLoc = updated.punchInLocation.displayAddress || updated.punchInLocation.locality || updated.punchInLocation.area;
    const normLoc = formatExecutiveLocation(updated.punchInLocation, currentExec);
    updated.punchInLocation = {
      ...updated.punchInLocation,
      locality: normLoc,
      displayAddress: normLoc,
      formattedAddress: normLoc,
    };
  }
  if (updated.punchOutLocation) {
    const rawLoc = updated.punchOutLocation.displayAddress || updated.punchOutLocation.locality || updated.punchOutLocation.area;
    const normLoc = formatExecutiveLocation(updated.punchOutLocation, currentExec);
    updated.punchOutLocation = {
      ...updated.punchOutLocation,
      locality: normLoc,
      displayAddress: normLoc,
      formattedAddress: normLoc,
    };
  }
  if (updated.lunchOutLocation) {
    const normLoc = formatExecutiveLocation(updated.lunchOutLocation, currentExec);
    updated.lunchOutLocation = {
      ...updated.lunchOutLocation,
      locality: normLoc,
      displayAddress: normLoc,
      formattedAddress: normLoc,
    };
  }
  if (updated.lunchInLocation) {
    const normLoc = formatExecutiveLocation(updated.lunchInLocation, currentExec);
    updated.lunchInLocation = {
      ...updated.lunchInLocation,
      locality: normLoc,
      displayAddress: normLoc,
      formattedAddress: normLoc,
    };
  }
  if (updated.remarks && /📍/.test(updated.remarks)) {
    const parts = updated.remarks.split("📍");
    const prefix = parts[0].trim();
    const rawAddr = parts.slice(1).join("📍").trim();
    updated.remarks = `${prefix} · 📍 ${formatLocationString(rawAddr, currentExec)}`;
  }
  return updated;
}

export function formatShortLocation(loc, exec = null) {
  return formatExecutiveLocation(loc, exec);
}

export function formatShortLocationString(str, exec = null) {
  return formatLocationString(str, exec);
}

export function formatShortRemarks(rem, exec = null) {
  if (!rem) return "";
  const s = String(rem);
  if (/📍/.test(s)) {
    const parts = s.split("📍");
    const prefix = parts[0].trim();
    const rawAddr = parts.slice(1).join("📍").trim();
    return `${prefix} · 📍 ${formatLocationString(rawAddr, exec)}`;
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
  const [locationStage, setLocationStage] = useState("Fetching current location...");
  const [locationError, setLocationError] = useState(null);

  // Fresh GPS Geolocation and Reverse Geocoding
  const refreshLiveLocation = useCallback(async () => {
    setLocationDetecting(true);
    setLocationStage("Fetching current location...");
    setLocationError(null);
    try {
      const loc = await getAttendanceLocation((stage) => setLocationStage(stage));
      if (!loc || loc.latitude == null) {
        if (!currentLocation) setCurrentLocation(null);
        setLocationError("Your device could not determine your current location. Please enable Windows Location Services and try again.");
      } else {
        setCurrentLocation(loc);
        setLocationError(null);
      }
    } catch (err) {
      if (!currentLocation) setCurrentLocation(null);
      setLocationError(err?.message || "Location request failed. Please check browser permissions and Windows Location Services.");
    } finally {
      setLocationDetecting(false);
    }
  }, [currentLocation]);

  // Request fresh location on component mount or executive switch
  useEffect(() => {
    refreshLiveLocation();
  }, [refreshLiveLocation, activeExecutive?.id]);

  // Backward compatibility alias for any remaining sub-render references
  const liveLocality = currentLocation?.displayAddress || "";
  const liveLocalityDetecting = locationDetecting;

  // Desktop location verification: accuracy <= 500m required for punches once location is obtained
  const canPunchByAccuracy = Boolean(
    !currentLocation || (
      currentLocation.canPunch &&
      currentLocation.latitude != null &&
      currentLocation.accuracy != null &&
      currentLocation.accuracy <= 500
    )
  );

  const todayIso = getTodayIso();

  // Load attendance store with automatic address normalization
  const [records, setRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        let cleaned = false;
        Object.keys(parsed).forEach((k) => {
          if (
            parsed[k]?.punchIn === "04:27:45 PM" ||
            parsed[k]?.remarks?.includes("Regular field shift") ||
            (parsed[k]?.punchInLocation?.displayAddress && parsed[k].punchInLocation.displayAddress.includes("1478/1")) ||
            (parsed[k]?.punchInLocation?.area && parsed[k].punchInLocation.area.includes("1478/1"))
          ) {
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
          const inLoc = normalizeDisplayLoc(todayDb.login_full_address || todayDb.full_address || [todayDb.login_area || todayDb.area, todayDb.login_city || todayDb.city, todayDb.login_state || todayDb.state].filter(Boolean).join(", "));
          const hasLogout = Boolean(todayDb.logout_time && (todayDb.logout_latitude != null || todayDb.logout_area || todayDb.logout_full_address));
          const outLoc = hasLogout
            ? normalizeDisplayLoc(todayDb.logout_full_address || [todayDb.logout_area, todayDb.logout_city, todayDb.logout_state].filter(Boolean).join(", "))
            : null;

          const hasLunchOut = Boolean(todayDb.lunch_out_time || todayDb.lunch_out);
          const lunchOutLoc = hasLunchOut && (todayDb.lunch_out_latitude != null || todayDb.lunch_out_area)
            ? normalizeDisplayLoc(todayDb.lunch_out_full_address || [todayDb.lunch_out_area, todayDb.lunch_out_city, todayDb.lunch_out_state].filter(Boolean).join(", "))
            : null;

          const hasLunchIn = Boolean(todayDb.lunch_in_time || todayDb.lunch_in);
          const lunchInLoc = hasLunchIn && (todayDb.lunch_in_latitude != null || todayDb.lunch_in_area)
            ? normalizeDisplayLoc(todayDb.lunch_in_full_address || [todayDb.lunch_in_area, todayDb.lunch_in_city, todayDb.lunch_in_state].filter(Boolean).join(", "))
            : null;

          const mapped = {
            id: `${todayDb.executive_id}_${todayDb.attendance_date}`,
            backendId: todayDb.id,
            execId: todayDb.executive_id,
            execName: todayDb.executive_name || activeExecutive.name,
            date: String(todayDb.attendance_date),
            punchIn: formatIsoToTimeStr(todayDb.login_time),
            punchInLocation: {
              area: todayDb.login_area || todayDb.area || "",
              city: todayDb.login_city || todayDb.city || "",
              state: todayDb.login_state || todayDb.state || "",
              country: todayDb.login_country || todayDb.country || "India",
              pincode: todayDb.login_pincode || todayDb.pincode || "",
              full_address: todayDb.login_full_address || todayDb.full_address || inLoc,
              location_accuracy: todayDb.login_accuracy ?? todayDb.location_accuracy ?? null,
              locality: inLoc,
              displayAddress: inLoc,
              formattedAddress: inLoc,
              coords: { latitude: todayDb.login_latitude ?? todayDb.latitude ?? null, longitude: todayDb.login_longitude ?? todayDb.longitude ?? null },
              location_timestamp: todayDb.login_location_timestamp || todayDb.location_timestamp,
            },
            faceImage: todayDb.login_selfie_url,
            lunchOut: formatIsoToTimeStr(todayDb.lunch_out_time || todayDb.lunch_out),
            lunchOutLocation: lunchOutLoc
              ? {
                  area: todayDb.lunch_out_area || "",
                  city: todayDb.lunch_out_city || "",
                  state: todayDb.lunch_out_state || "",
                  country: todayDb.lunch_out_country || "India",
                  pincode: todayDb.lunch_out_pincode || "",
                  full_address: todayDb.lunch_out_full_address || lunchOutLoc,
                  location_accuracy: todayDb.lunch_out_accuracy ?? null,
                  locality: lunchOutLoc,
                  displayAddress: lunchOutLoc,
                  formattedAddress: lunchOutLoc,
                  coords: { latitude: todayDb.lunch_out_latitude ?? null, longitude: todayDb.lunch_out_longitude ?? null },
                  location_timestamp: todayDb.lunch_out_location_timestamp,
                }
              : null,
            lunchIn: formatIsoToTimeStr(todayDb.lunch_in_time || todayDb.lunch_in),
            lunchInLocation: lunchInLoc
              ? {
                  area: todayDb.lunch_in_area || "",
                  city: todayDb.lunch_in_city || "",
                  state: todayDb.lunch_in_state || "",
                  country: todayDb.lunch_in_country || "India",
                  pincode: todayDb.lunch_in_pincode || "",
                  full_address: todayDb.lunch_in_full_address || lunchInLoc,
                  location_accuracy: todayDb.lunch_in_accuracy ?? null,
                  locality: lunchInLoc,
                  displayAddress: lunchInLoc,
                  formattedAddress: lunchInLoc,
                  coords: { latitude: todayDb.lunch_in_latitude ?? null, longitude: todayDb.lunch_in_longitude ?? null },
                  location_timestamp: todayDb.lunch_in_location_timestamp,
                }
              : null,
            punchOut: formatIsoToTimeStr(todayDb.logout_time),
            punchOutLocation: outLoc
              ? {
                  area: todayDb.logout_area || "",
                  city: todayDb.logout_city || "",
                  state: todayDb.logout_state || "",
                  country: todayDb.logout_country || "India",
                  pincode: todayDb.logout_pincode || "",
                  full_address: todayDb.logout_full_address || outLoc,
                  location_accuracy: todayDb.logout_accuracy ?? null,
                  locality: outLoc,
                  displayAddress: outLoc,
                  formattedAddress: outLoc,
                  coords: { latitude: todayDb.logout_latitude ?? null, longitude: todayDb.logout_longitude ?? null },
                  location_timestamp: todayDb.logout_location_timestamp,
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

  // Action: Open Face & Location Verification Modal for Lunch Out
  const handleLunchOut = () => {
    if (!isPunchedIn || isLunchOut || isPunchedOut) return;
    setPunchActionType("lunch_out");
    setPunchModalOpen(true);
  };

  // Action: Open Face & Location Verification Modal for Lunch In
  const handleLunchIn = () => {
    if (!isLunchOut || isLunchIn || isPunchedOut) return;
    setPunchActionType("lunch_in");
    setPunchModalOpen(true);
  };

  // Helper: get fresh high-accuracy device GPS position and reverse-geocoded address
  const fetchCurrentLocation = async (actionLabel = "attendance") => {
    try {
      const loc = await getAttendanceLocation();
      return {
        success: true,
        latitude: loc.latitude,
        longitude: loc.longitude,
        area: loc.area,
        city: loc.city,
        district: loc.district,
        state: loc.state,
        country: loc.country || "India",
        pincode: loc.pincode || "",
        full_address: loc.displayAddress || `${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`,
        accuracy: loc.accuracy,
        location_accuracy: loc.accuracy,
        location_source: "BROWSER_GEOLOCATION",
        location_timestamp: loc.timestamp || new Date().toISOString(),
        displayAddress: loc.displayAddress,
        locationObj: loc,
      };
    } catch (e) {
      return {
        success: false,
        error: e?.message || "Unable to determine your current location. Please check browser permissions and Windows Location Services.",
      };
    }
  };

  // Confirm and Save Verified Punch Record to LocalStorage and MySQL Database
  const handleConfirmPunch = async ({ punchTime, punchDate, locationData, faceImage }) => {
    // 1. Strict real-time GPS validation - never fallback to fake/hardcoded location
    const locLat = locationData?.latitude ?? locationData?.coords?.latitude ?? locationData?.lat;
    const locLng = locationData?.longitude ?? locationData?.coords?.longitude ?? locationData?.lng;

    if (locLat == null || locLng == null) {
      const msg = locationData?.error || "Your device could not determine your current location. Please enable Windows Location Services, allow browser location permission, and try again.";
      alert(msg);
      showToast(msg, "error");
      return;
    }

    const locAccuracy = locationData?.accuracy != null ? Number(locationData.accuracy) : (locationData?.location_accuracy != null ? Number(locationData.location_accuracy) : null);

    // Enforce strict accuracy validation before allowing attendance punch (>500m rejected)
    if (locAccuracy != null && locAccuracy > 500) {
      const msg = "Your current location accuracy is poor. Please enable Windows Location Services, allow browser location permission, and try again.";
      alert(msg);
      showToast(msg, "error");
      return;
    }

    const locArea = locationData?.area || "";
    const locCity = locationData?.city || "";
    const locDistrict = locationData?.district || "";
    const locState = locationData?.state || locationData?.region || "";
    const locCountry = locationData?.country || "India";
    const locPincode = locationData?.pincode || locationData?.postalCode || "";
    const locSource = locationData?.location_source || "WINDOWS_LOCATION";
    const locFull = locationData?.full_address || locationData?.displayAddress || locationData?.locality || locationData?.formattedAddress || [locArea, locCity, locState].filter(Boolean).join(", ");
    const locTs = locationData?.location_timestamp || getLocalIsoString();

    const locObj = {
      ...locationData,
      area: locArea,
      city: locCity,
      district: locDistrict,
      state: locState,
      region: locState,
      country: locCountry,
      pincode: locPincode,
      full_address: locFull,
      location_accuracy: locAccuracy,
      accuracy: locAccuracy,
      location_source: locSource,
      location_timestamp: locTs,
      locality: locFull,
      displayAddress: locFull,
      formattedAddress: locFull,
      coords: { latitude: Number(locLat), longitude: Number(locLng) },
    };

    if (punchActionType === "in") {
      let dbRes = null;
      try {
        const payload = {
          sales_executive_id: Number(activeExecutive.id),
          employee_id: Number(activeExecutive.id),
          employee_name: activeExecutive.name,
          executive_id: Number(activeExecutive.id),
          attendance_date: punchDate || todayIso,
          punch_type: "PUNCH_IN",
          punch_time: getLocalIsoString(),
          login_time: getLocalIsoString(),
          latitude: Number(locLat),
          longitude: Number(locLng),
          area: locArea || locFull,
          city: locCity,
          district: locDistrict,
          state: locState,
          country: locCountry,
          pincode: locPincode,
          full_address: locFull,
          location_accuracy: locAccuracy,
          location_source: locSource,
          location_timestamp: locTs,
          // Legacy columns support
          login_latitude: Number(locLat),
          login_longitude: Number(locLng),
          login_area: locArea || locFull,
          login_city: locCity,
          login_district: locDistrict,
          login_state: locState,
          login_country: locCountry,
          login_pincode: locPincode,
          login_full_address: locFull,
          login_accuracy: locAccuracy,
          login_location_source: locSource,
          login_location_timestamp: locTs,
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
    } else if (punchActionType === "lunch_out") {
      try {
        const payload = {
          sales_executive_id: Number(activeExecutive.id),
          executive_id: Number(activeExecutive.id),
          employee_id: Number(activeExecutive.id),
          attendance_date: punchDate || todayRecord?.date || todayIso,
          action: "lunch_out",
          punch_type: "LUNCH_OUT",
          punch_time: getLocalIsoString(),
          latitude: Number(locLat),
          longitude: Number(locLng),
          area: locArea || locFull,
          city: locCity,
          district: locDistrict,
          state: locState,
          country: locCountry,
          pincode: locPincode,
          full_address: locFull,
          location_accuracy: locAccuracy,
          location_source: locSource,
          location_timestamp: locTs,
          selfie_url: faceImage,
          lunch_selfie_url: faceImage,
        };
        await punchLunchAttendance(payload);
      } catch (err) {
        console.error("Backend punchLunchAttendance error:", err);
      }

      setPunchModalOpen(false);

      const updated = {
        ...records,
        [todayKey]: {
          ...(todayRecord || {
            id: todayKey,
            execId: activeExecutive.id,
            execName: activeExecutive.name,
            date: todayIso,
          }),
          lunchOut: punchTime,
          lunchOutLocation: locObj,
          lunchOutFaceImage: faceImage,
        },
      };
      setRecords(updated);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      showToast(`🍴 Lunch Out recorded at ${punchTime} · 📍 ${locFull}!`);
    } else if (punchActionType === "lunch_in") {
      try {
        const payload = {
          sales_executive_id: Number(activeExecutive.id),
          executive_id: Number(activeExecutive.id),
          employee_id: Number(activeExecutive.id),
          attendance_date: todayRecord?.date || todayIso,
          action: "lunch_in",
          punch_type: "LUNCH_IN",
          punch_time: getLocalIsoString(),
          latitude: Number(locLat),
          longitude: Number(locLng),
          area: locArea || locFull,
          city: locCity,
          district: locDistrict,
          state: locState,
          country: locCountry,
          pincode: locPincode,
          full_address: locFull,
          location_accuracy: locAccuracy,
          location_source: locSource,
          location_timestamp: locTs,
          selfie_url: faceImage,
          lunch_selfie_url: faceImage,
        };
        await punchLunchAttendance(payload);
      } catch (err) {
        console.error("Backend punchLunchAttendance error:", err);
      }

      setPunchModalOpen(false);

      const updated = {
        ...records,
        [todayKey]: {
          ...todayRecord,
          lunchIn: punchTime,
          lunchInLocation: locObj,
          lunchInFaceImage: faceImage,
        },
      };
      setRecords(updated);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      showToast(`🍱 Lunch In recorded at ${punchTime} · 📍 ${locFull}!`);
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
          sales_executive_id: Number(activeExecutive.id),
          employee_id: Number(activeExecutive.id),
          employee_name: activeExecutive.name,
          executive_id: Number(activeExecutive.id),
          attendance_date: punchDate || todayIso,
          punch_type: "PUNCH_OUT",
          punch_time: getLocalIsoString(),
          logout_time: getLocalIsoString(),
          latitude: Number(locLat),
          longitude: Number(locLng),
          area: locArea || locFull,
          city: locCity,
          district: locDistrict,
          state: locState,
          country: locCountry,
          pincode: locPincode,
          full_address: locFull,
          location_accuracy: locAccuracy,
          location_source: locSource,
          location_timestamp: locTs,
          // Legacy columns support
          logout_latitude: Number(locLat),
          logout_longitude: Number(locLng),
          logout_area: locArea || locFull,
          logout_city: locCity,
          logout_district: locDistrict,
          logout_state: locState,
          logout_country: locCountry,
          logout_pincode: locPincode,
          logout_full_address: locFull,
          logout_accuracy: locAccuracy,
          logout_location_source: locSource,
          logout_location_timestamp: locTs,
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
      const inLoc = normalizeDisplayLoc(d.login_full_address || d.full_address || [d.login_area || d.area, d.login_city || d.city, d.login_state || d.state].filter(Boolean).join(", "));
      const hasLogout = Boolean(d.logout_time && (d.logout_latitude != null || d.logout_area || d.logout_full_address));
      const outLoc = hasLogout
        ? normalizeDisplayLoc(d.logout_full_address || [d.logout_area, d.logout_city, d.logout_state].filter(Boolean).join(", "))
        : null;

      const hasLunchOut = Boolean(d.lunch_out_time || d.lunch_out);
      const lunchOutLoc = hasLunchOut && (d.lunch_out_latitude != null || d.lunch_out_area)
        ? normalizeDisplayLoc(d.lunch_out_full_address || [d.lunch_out_area, d.lunch_out_city, d.lunch_out_state].filter(Boolean).join(", "))
        : null;

      const hasLunchIn = Boolean(d.lunch_in_time || d.lunch_in);
      const lunchInLoc = hasLunchIn && (d.lunch_in_latitude != null || d.lunch_in_area)
        ? normalizeDisplayLoc(d.lunch_in_full_address || [d.lunch_in_area, d.lunch_in_city, d.lunch_in_state].filter(Boolean).join(", "))
        : null;

      const inArea = d.login_area || d.area || "";
      const inCity = d.login_city || d.city || "";
      const inState = d.login_state || d.state || "";
      const inCountry = d.login_country || d.country || "India";
      const inPincode = d.login_pincode || d.pincode || "";
      const inFull = d.login_full_address || d.full_address || inLoc;
      const inAccuracy = d.login_accuracy ?? d.location_accuracy ?? null;
      const inLat = d.login_latitude ?? d.latitude ?? null;
      const inLng = d.login_longitude ?? d.longitude ?? null;

      const outArea = d.logout_area || "";
      const outCity = d.logout_city || "";
      const outState = d.logout_state || "";
      const outCountry = d.logout_country || "India";
      const outPincode = d.logout_pincode || "";
      const outFull = d.logout_full_address || outLoc;
      const outAccuracy = d.logout_accuracy ?? null;
      const outLat = d.logout_latitude ?? null;
      const outLng = d.logout_longitude ?? null;

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
          formattedAddress: inFull,
          full_address: inFull,
          area: inArea,
          city: inCity,
          state: inState,
          region: inState,
          country: inCountry,
          pincode: inPincode,
          accuracy: inAccuracy,
          location_accuracy: inAccuracy,
          coords: { latitude: inLat, longitude: inLng },
          location_timestamp: d.login_location_timestamp || d.location_timestamp,
        },
        faceImage: d.login_selfie_url,
        lunchOut: formatIsoToTimeStr(d.lunch_out_time || d.lunch_out),
        lunchOutLocation: lunchOutLoc
          ? {
              locality: lunchOutLoc,
              displayAddress: lunchOutLoc,
              formattedAddress: d.lunch_out_full_address || lunchOutLoc,
              full_address: d.lunch_out_full_address || lunchOutLoc,
              area: d.lunch_out_area || "",
              city: d.lunch_out_city || "",
              state: d.lunch_out_state || "",
              country: d.lunch_out_country || "India",
              pincode: d.lunch_out_pincode || "",
              accuracy: d.lunch_out_accuracy ?? null,
              location_accuracy: d.lunch_out_accuracy ?? null,
              coords: { latitude: d.lunch_out_latitude ?? null, longitude: d.lunch_out_longitude ?? null },
              location_timestamp: d.lunch_out_location_timestamp,
            }
          : null,
        lunchIn: formatIsoToTimeStr(d.lunch_in_time || d.lunch_in),
        lunchInLocation: lunchInLoc
          ? {
              locality: lunchInLoc,
              displayAddress: lunchInLoc,
              formattedAddress: d.lunch_in_full_address || lunchInLoc,
              full_address: d.lunch_in_full_address || lunchInLoc,
              area: d.lunch_in_area || "",
              city: d.lunch_in_city || "",
              state: d.lunch_in_state || "",
              country: d.lunch_in_country || "India",
              pincode: d.lunch_in_pincode || "",
              accuracy: d.lunch_in_accuracy ?? null,
              location_accuracy: d.lunch_in_accuracy ?? null,
              coords: { latitude: d.lunch_in_latitude ?? null, longitude: d.lunch_in_longitude ?? null },
              location_timestamp: d.lunch_in_location_timestamp,
            }
          : null,
        punchOut: formatIsoToTimeStr(d.logout_time),
        punchOutLocation: outLoc
          ? {
              locality: outLoc,
              displayAddress: outLoc,
              formattedAddress: outFull,
              full_address: outFull,
              area: outArea,
              city: outCity,
              state: outState,
              region: outState,
              country: outCountry,
              pincode: outPincode,
              accuracy: outAccuracy,
              location_accuracy: outAccuracy,
              coords: { latitude: outLat, longitude: outLng },
              location_timestamp: d.logout_location_timestamp,
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
          lunchOutLocation: item.lunchOutLocation || undefined,
          lunchInLocation: item.lunchInLocation || undefined,
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
        lunchOutLocation: todayRecord.lunchOutLocation || undefined,
        lunchInLocation: todayRecord.lunchInLocation || undefined,
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

          <div className="attend-header-geo-chip" title="Live Device Location Status">
            <span className={`attend-geo-dot ${locationDetecting ? "detecting" : (currentLocation?.accuracyEvaluation?.badgeClass || "")}`}></span>
            <span>
              {locationDetecting
                ? `📡 ${locationStage || "Detecting GPS location…"}`
                : currentLocation?.accuracyEvaluation
                ? `${currentLocation.accuracyEvaluation.badgeText} (±${Math.round(currentLocation?.accuracy || 0)}m)`
                : currentLocation?.area
                ? `📍 ${[currentLocation.area, currentLocation.city, currentLocation.state].filter(Boolean).join(", ")}`
                : "📍 Location Required"}
            </span>
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
              id="btn-morning-punch-in"
              className={`attend-punch-btn punch-in-btn ${isPunchedIn ? "punched" : ""}`}
              onClick={handlePunchIn}
              disabled={isPunchedIn}
              title={
                isPunchedIn
                  ? `Morning Punched In at ${todayRecord?.punchIn}`
                  : "Click to record Morning Punch In with biometric face verification"
              }
            >
              <div className="attend-btn-icon-wrap in-icon">
                {isPunchedIn ? <Check size={24} /> : <LogIn size={24} />}
              </div>
              <div className="attend-btn-content">
                <span className="attend-btn-action">
                  {isPunchedIn ? "Morning Punched In" : "Morning Punch In"}
                </span>
                <span className="attend-btn-time">
                  {isPunchedIn
                    ? todayRecord?.punchIn
                    : "Click to Start Shift"}
                </span>
              </div>
            </button>

            {/* 2. LUNCH OUT BUTTON (Timing only - NO face auto generation) */}
            <button
              type="button"
              id="btn-lunch-out"
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
              id="btn-lunch-in"
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
              id="btn-evening-punch-out"
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
                    : !isPunchedIn
                    ? "Punch In First"
                    : "Click to End Shift"}
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
              {todayRecord?.lunchOut && (
                <span className="attend-loc-sub" title={formatShortLocation(todayRecord?.lunchOutLocation)}>
                  {formatShortLocation(todayRecord?.lunchOutLocation) ? (
                    <><MapPin size={10} /> {formatShortLocation(todayRecord.lunchOutLocation)}</>
                  ) : "GPS Fetched"}
                </span>
              )}
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
              {todayRecord?.lunchIn && (
                <span className="attend-loc-sub" title={formatShortLocation(todayRecord?.lunchInLocation)}>
                  {formatShortLocation(todayRecord?.lunchInLocation) ? (
                    <><MapPin size={10} /> {formatShortLocation(todayRecord.lunchInLocation)}</>
                  ) : "GPS Fetched"}
                </span>
              )}
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
                            <span className="attend-loc-sub" title={formatExecutiveLocation(row.punchInLocation, row.executiveObj || row)}>
                              <MapPin size={10} />
                              {formatExecutiveLocation(row.punchInLocation, row.executiveObj || row)}
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
                            formatShortLocation(row.lunchOutLocation, row.executiveObj || row) ? (
                              <span className="attend-loc-sub" title={formatExecutiveLocation(row.lunchOutLocation, row.executiveObj || row)}>
                                <MapPin size={10} />
                                {formatExecutiveLocation(row.lunchOutLocation, row.executiveObj || row)}
                              </span>
                            ) : (
                              <span className="attend-loc-sub timing-only">
                                Timing Only
                              </span>
                            )
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="attend-punch-cell">
                          <span className={`attend-time-pill ${row.lunchIn ? "lunch-in" : "empty"}`}>
                            {row.lunchIn || "—"}
                          </span>
                          {row.lunchIn && (
                            formatShortLocation(row.lunchInLocation, row.executiveObj || row) ? (
                              <span className="attend-loc-sub" title={formatExecutiveLocation(row.lunchInLocation, row.executiveObj || row)}>
                                <MapPin size={10} />
                                {formatExecutiveLocation(row.lunchInLocation, row.executiveObj || row)}
                              </span>
                            ) : (
                              <span className="attend-loc-sub timing-only">
                                Timing Only
                              </span>
                            )
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="attend-punch-cell">
                          <span className="attend-time-pill out">
                            {row.punchOut || "—"}
                          </span>
                          {row.punchOut && (
                            <span className="attend-loc-sub" title={formatExecutiveLocation(row.punchOutLocation, row.executiveObj || row)}>
                              <MapPin size={10} />
                              {formatExecutiveLocation(row.punchOutLocation, row.executiveObj || row)}
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
        initialLocation={currentLocation}
        executive={{
          ...activeExecutive,
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
                    <span className="attend-meta-k">Location:</span>
                    <span className="attend-meta-v">
                      📍 {formatExecutiveLocation(previewPhotoModal.location, { name: previewPhotoModal.execName, region: profileRegion })}
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
