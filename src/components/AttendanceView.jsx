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
} from "lucide-react";
import DoctorAvatar from "./DoctorAvatar.jsx";
import ModernDatePicker from "./ModernDatePicker.jsx";
import FacePunchModal from "./FacePunchModal.jsx";

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

function calculateDuration(inTimeStr, outTimeStr) {
  if (!inTimeStr) return "0 hrs 0 mins";
  // Parse today with time string
  const today = getTodayIso();
  const inDate = new Date(`${today} ${inTimeStr}`);
  const outDate = outTimeStr ? new Date(`${today} ${outTimeStr}`) : new Date();

  if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) return "—";

  let diffMs = outDate - inDate;
  if (diffMs < 0) diffMs = 0;

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hrs}h ${mins}m`;
}

// Default sample attendance records for previous days to give realistic context
function getInitialAttendanceHistory(execId, execName) {
  const now = new Date();
  const list = [];
  const sampleTimes = [
    { in: "09:04:12 AM", out: "06:12:45 PM", status: "Present" },
    { in: "08:58:30 AM", out: "06:25:10 PM", status: "Present" },
    { in: "09:15:00 AM", out: "06:05:22 PM", status: "Present" },
    { in: "09:02:18 AM", out: "05:50:40 PM", status: "Present" },
    { in: "08:55:05 AM", out: "06:30:15 PM", status: "Present" },
    { in: "09:20:10 AM", out: "06:15:00 PM", status: "Late Arrival" },
    { in: "09:00:00 AM", out: "06:00:00 PM", status: "Present" },
  ];

  for (let i = 1; i <= sampleTimes.length; i++) {
    const past = new Date(now);
    past.setDate(now.getDate() - i);
    // Skip Sundays
    if (past.getDay() === 0) continue;

    const y = past.getFullYear();
    const m = String(past.getMonth() + 1).padStart(2, "0");
    const d = String(past.getDate()).padStart(2, "0");
    const iso = `${y}-${m}-${d}`;
    const sample = sampleTimes[(i - 1) % sampleTimes.length];

    list.push({
      id: `${execId}_${iso}`,
      execId,
      execName,
      date: iso,
      punchIn: sample.in,
      punchOut: sample.out,
      duration: "8h 45m",
      status: sample.status,
      remarks: "Field territory route completed",
    });
  }

  return list;
}

export default function AttendanceView({
  data = {},
  execId,
  role,
  currentRecord,
  onSwitchExecutive,
}) {
  // Active executive
  const activeExecutive = useMemo(() => {
    if (currentRecord) return currentRecord;
    return (
      data.executives?.find((e) => e.id === execId) ||
      data.executives?.[0] || {
        id: 1,
        name: "Sales Executive",
        employee_code: "SE-001",
        region: "Territory",
      }
    );
  }, [currentRecord, data.executives, execId]);

  // Live ticking clock
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayIso = getTodayIso();

  // Load attendance store
  const [records, setRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return {};
  });

  // Today's attendance key for this executive
  const todayKey = `${activeExecutive.id}_${todayIso}`;
  const todayRecord = records[todayKey] || null;

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
    if (!isPunchedIn) {
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

  // Confirm and Save Verified Punch Record
  const handleConfirmPunch = ({ punchTime, punchDate, locationData, faceImage }) => {
    setPunchModalOpen(false);

    if (punchActionType === "in") {
      const updated = {
        ...records,
        [todayKey]: {
          id: todayKey,
          execId: activeExecutive.id,
          execName: activeExecutive.name,
          date: punchDate || todayIso,
          punchIn: punchTime,
          punchInLocation: locationData,
          faceImage: faceImage,
          punchOut: null,
          duration: "0h 0m",
          status: "Working",
          remarks: `Face verified · 📍 ${locationData?.locality || "Silk Board"}`,
        },
      };
      setRecords(updated);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      setToastMessage(
        `🟢 Punched In successfully at ${punchTime}! Face verified & location recorded (${locationData?.locality || "Silk Board"}).`
      );
    } else {
      // Punch Out
      if (!todayRecord?.punchIn) return;
      const finalDuration = calculateDuration(todayRecord.punchIn, punchTime);
      const updated = {
        ...records,
        [todayKey]: {
          ...todayRecord,
          punchOut: punchTime,
          punchOutLocation: locationData,
          punchOutFaceImage: faceImage,
          duration: finalDuration,
          status: "Completed",
          remarks: `Shift completed · 📍 ${locationData?.locality || "Silk Board"}`,
        },
      };
      setRecords(updated);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      setToastMessage(
        `🔴 Punched Out successfully at ${punchTime} (Total: ${finalDuration}). Great job today!`
      );
    }
  };

  // Action: Reset Today's Punch (with confirmation)
  const handleResetToday = () => {
    if (!window.confirm("Are you sure you want to reset today's punch in / punch out record?")) {
      return;
    }
    const updated = { ...records };
    delete updated[todayKey];
    setRecords(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    setToastMessage("Attendance record for today was reset.");
  };

  // Combined attendance history for the executive
  const historyList = useMemo(() => {
    const fromStorage = Object.values(records).filter(
      (r) => r.execId === activeExecutive.id
    );

    // Initial mock history for past days
    const mockHistory = getInitialAttendanceHistory(
      activeExecutive.id,
      activeExecutive.name
    );

    // Merge: storage items override mock items for identical dates
    const map = new Map();
    mockHistory.forEach((item) => map.set(item.date, item));
    fromStorage.forEach((item) => map.set(item.date, item));

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
  }, [records, activeExecutive.id, activeExecutive.name]);

  // Statistics
  const stats = useMemo(() => {
    const presentDays = historyList.filter(
      (h) => h.status === "Present" || h.status === "Completed"
    ).length;
    const totalDays = historyList.length;
    const onTimeRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;
    return {
      presentDays,
      totalDays,
      onTimeRate,
    };
  }, [historyList]);

  return (
    <div className="attend-wrapper">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="attend-toast" role="alert">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage("")}>✕</button>
        </div>
      )}

      {/* Top Bar Header */}
      <div className="attend-header-card">
        <div className="attend-profile-info">
          <DoctorAvatar name={activeExecutive.name} size={54} isOnline={true} />
          <div>
            <div className="attend-user-title">
              <h2>{activeExecutive.name}</h2>
              <span className="attend-code-badge">
                {activeExecutive.employee_code || `SE-00${activeExecutive.id}`}
              </span>
              <span className="attend-region-pill">
                📍 {activeExecutive.region || "Territory"}
              </span>
            </div>
            <p className="attend-user-sub">
              Sales Executive Attendance & Daily Field Shift Portal
            </p>
          </div>
        </div>

        {/* Executive Switcher (for managers / quick switch) */}
        {data.executives && data.executives.length > 1 && (
          <div className="attend-exec-switcher">
            <label>Select Executive</label>
            <select
              value={activeExecutive.id}
              onChange={(e) => onSwitchExecutive?.(Number(e.target.value))}
            >
              {data.executives.map((exec) => (
                <option key={exec.id} value={exec.id}>
                  {exec.name} ({exec.employee_code || `SE-00${exec.id}`})
                </option>
              ))}
            </select>
          </div>
        )}
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
              <Calendar size={14} />
              {currentDateTime.toLocaleDateString("en-US", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>

          <div className="attend-digital-clock">
            {formatTime(currentDateTime)}
          </div>

          <div className="attend-shift-status-box">
            <div className="attend-shift-label">Today's Shift Status</div>
            <div className={`attend-status-indicator ${isPunchedOut ? "done" : isPunchedIn ? "active" : "pending"}`}>
              {isPunchedOut ? (
                <>
                  <CheckCircle2 size={18} />
                  <span>Shift Completed</span>
                </>
              ) : isPunchedIn ? (
                <>
                  <span className="attend-working-pulse"></span>
                  <span>On Duty · Working ({liveDuration})</span>
                </>
              ) : (
                <>
                  <AlertCircle size={18} />
                  <span>Not Punched In Yet</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Card: Punch In / Punch Out Buttons */}
        <div className="attend-actions-card">
          <div className="attend-actions-title">
            <Clock size={20} className="attend-title-icon" />
            <div>
              <h3>Daily Shift Punch</h3>
              <p>Record your start and end times for field visits</p>
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
                {isPunchedIn ? <Check size={28} /> : <LogIn size={28} />}
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
                {isPunchedOut ? <Check size={28} /> : <LogOut size={28} />}
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
                    title="View Face Verification"
                    onClick={() =>
                      setPreviewPhotoModal({
                        image: todayRecord.faceImage,
                        execName: activeExecutive.name,
                        time: todayRecord.punchIn,
                        date: todayRecord.date || todayIso,
                        location: todayRecord.punchInLocation,
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
              <span className="bar-val">{todayRecord?.punchOut || "—"}</span>
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
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="attend-stats-grid">
        <div className="attend-stat-card">
          <div className="attend-stat-icon-wrap teal">
            <Calendar size={20} />
          </div>
          <div>
            <div className="attend-stat-value">{stats.presentDays} Days</div>
            <div className="attend-stat-label">Days Present This Month</div>
          </div>
        </div>

        <div className="attend-stat-card">
          <div className="attend-stat-icon-wrap cyan">
            <Timer size={20} />
          </div>
          <div>
            <div className="attend-stat-value">{liveDuration}</div>
            <div className="attend-stat-label">Today's Logged Hours</div>
          </div>
        </div>

        <div className="attend-stat-card">
          <div className="attend-stat-icon-wrap emerald">
            <Award size={20} />
          </div>
          <div>
            <div className="attend-stat-value">{stats.onTimeRate}%</div>
            <div className="attend-stat-label">Attendance Punctuality</div>
          </div>
        </div>

        <div className="attend-stat-card">
          <div className="attend-stat-icon-wrap amber">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="attend-stat-value">Active Duty</div>
            <div className="attend-stat-label">Field Status Verification</div>
          </div>
        </div>
      </div>

      {/* Monthly Attendance Log Table */}
      <div className="attend-table-card">
        <div className="attend-table-header">
          <div>
            <h3>Monthly Attendance Log</h3>
            <p>Chronological punch records and hours for {activeExecutive.name}</p>
          </div>
          <span className="attend-table-badge">
            {historyList.length} Records Logged
          </span>
        </div>

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
              {historyList.map((row) => {
                const rowDate = new Date(`${row.date}T00:00:00`);
                const isToday = row.date === todayIso;
                const dayName = rowDate.toLocaleDateString("en-US", { weekday: "short" });

                return (
                  <tr key={row.id} className={isToday ? "today-row" : ""}>
                    <td>
                      <span className="attend-date-text">
                        {row.date}
                        {isToday && <span className="today-tag">Today</span>}
                      </span>
                    </td>
                    <td>
                      <span className="attend-day-text">{dayName}</span>
                    </td>
                    <td>
                      <div className="attend-exec-cell">
                        <DoctorAvatar name={row.execName || activeExecutive.name} size={24} />
                        <span>{row.execName || activeExecutive.name}</span>
                      </div>
                    </td>
                    <td>
                      {row.faceImage ? (
                        <div className="attend-face-cell">
                          <button
                            type="button"
                            className="attend-photo-thumb-btn"
                            title="Click to inspect captured face photo & GPS location"
                            onClick={() =>
                              setPreviewPhotoModal({
                                image: row.faceImage,
                                execName: row.execName || activeExecutive.name,
                                time: row.punchIn,
                                date: row.date,
                                location: row.punchInLocation,
                              })
                            }
                          >
                            <img
                              src={row.faceImage}
                              alt="Captured Face"
                              className="attend-photo-thumb-img"
                            />
                            <span className="attend-photo-verified-icon">✓</span>
                          </button>
                          <span className="attend-face-tag">Face Verified</span>
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
                            {row.punchInLocation?.locality || "Silk Board, Karnataka"}
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
                            {row.punchOutLocation?.locality || "Silk Board, Karnataka"}
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
                      <span className={`attend-status-tag ${row.status.toLowerCase().replace(/\s+/g, "-")}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>
                      <span className="attend-remarks-text">
                        {row.remarks || "Regular field shift"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
                <span>Biometric Face Verification</span>
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
                  <span className="attend-meta-k">Punch Time:</span>
                  <span className="attend-meta-v">{previewPhotoModal.time} ({previewPhotoModal.date})</span>
                </div>
                {previewPhotoModal.location && (
                  <div className="attend-meta-row">
                    <span className="attend-meta-k">GPS Location:</span>
                    <span className="attend-meta-v">
                      📍 {previewPhotoModal.location.locality || "Silk Board, Karnataka"}
                      {previewPhotoModal.location.lat && (
                        <small className="attend-coords">
                          ({Number(previewPhotoModal.location.lat).toFixed(4)}°, {Number(previewPhotoModal.location.lng).toFixed(4)}°)
                        </small>
                      )}
                    </span>
                  </div>
                )}
                <div className="attend-meta-status-badge">
                  <Check size={14} /> Biometric Match Confirmed · 100% Genuine
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
