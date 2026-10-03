import React, { useState, useEffect } from "react";
import {
  MapPin,
  Navigation,
  Compass,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Info,
  Laptop,
  Wifi,
  ChevronDown,
  ChevronUp,
  Activity,
  Terminal,
} from "lucide-react";
import LeafletLocationMap from "./LeafletLocationMap.jsx";
import { evaluateLocationAccuracy } from "../geoUtils.js";
import "./GoogleAttendanceMap.css";

/**
 * GoogleAttendanceMap.jsx
 *
 * Dedicated Google Maps visualization and desktop accuracy verification component
 * designed specifically for Sales Executive Attendance on Windows Desktop / Laptop systems.
 *
 * Key Architecture:
 * 1. Coordinates obtained purely from device/browser/Windows Location Service (zero hardcoded defaults).
 * 2. Embedded Leaflet map with Google Maps tiles centered on fresh detected coordinates with live pin marker
 *    and dynamic accuracy circle sized strictly to coords.accuracy (never a fixed 500m circle).
 * 3. Clear separation between:
 *    A. Location Acquisition
 *    B. Attendance Distance / Geofence Validation
 * 4. Never displays "Punch Permission: DISABLED (>500m)" when there are no valid coordinates;
 *    instead displays "Location Status: WAITING FOR LOCATION".
 * 5. Full Windows desktop handling distinguishing permission denied, position unavailable, timeout,
 *    and accuracy refinement.
 * 6. Temporary Dev Diagnostics section showing all live geolocation telemetry.
 */
export default function GoogleAttendanceMap({
  location = null,
  detecting = false,
  detectionStage = "",
  error = null,
  onDetectLocation,
  disabled = false,
}) {
  const [showWindowsHelp, setShowWindowsHelp] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(true);

  // Live browser permission state tracker
  const [permissionState, setPermissionState] = useState("unknown");
  const isGeoSupported = typeof navigator !== "undefined" && "geolocation" in navigator;

  useEffect(() => {
    let active = true;
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((p) => {
          if (active) setPermissionState(p.state);
          p.onchange = () => {
            if (active) setPermissionState(p.state);
          };
        })
        .catch(() => {
          if (active) setPermissionState("unknown");
        });
    }
    return () => {
      active = false;
    };
  }, []);

  const lat = location?.latitude ?? location?.lat ?? null;
  const lng = location?.longitude ?? location?.lng ?? null;
  const accuracy = location?.accuracy ?? location?.location_accuracy ?? null;
  const evaluation = location?.accuracyEvaluation || evaluateLocationAccuracy(accuracy);

  const hasCoords = typeof lat === "number" && typeof lng === "number" && !isNaN(lat) && !isNaN(lng);

  // External Google Maps URL for inspection
  const googleMapsExternalUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : null;

  // No fixed office geofence: Sales Executives can punch from ANY location

  // Error extraction
  const errorCode =
    error?.nativeCode ?? error?.code ?? location?.nativeCode ?? location?.errorCode ?? null;
  const errorMsg =
    typeof error === "string"
      ? error
      : error?.message ?? location?.error ?? location?.message ?? null;

  // Windows Location Status description for diagnostics
  let windowsLocationStatus = "Idle";
  if (detecting) {
    windowsLocationStatus = "Querying Windows Location Services / Browser GPS…";
  } else if (hasCoords) {
    windowsLocationStatus = "Active (Coordinates Received & Verified)";
  } else if (permissionState === "denied" || errorCode === 1) {
    windowsLocationStatus = "Permission Blocked (Allow in Chrome/Edge & Windows Settings)";
  } else if (errorCode === 2 || errorCode === "POSITION_UNAVAILABLE") {
    windowsLocationStatus = "Windows Location Services disabled or Wi-Fi scanning inactive";
  } else if (errorCode === 3 || errorCode === "TIMEOUT") {
    windowsLocationStatus = "Windows Location request timed out";
  } else if (errorMsg) {
    windowsLocationStatus = `Error: ${errorMsg}`;
  }

  return (
    <div className="google-attend-map-card">
      {/* Header Bar */}
      <div className="gam-header">
        <div className="gam-title-group">
          <div className="gam-icon-badge">
            <Compass size={20} className={detecting ? "spin-slow" : ""} />
          </div>
          <div>
            <div className="gam-title-row">
              <h3>Google Maps Attendance Verification</h3>
              {detecting ? (
                <span className="gam-badge detecting">
                  <span className="gam-pulse-dot amber"></span>
                  Detecting Location…
                </span>
              ) : hasCoords ? (
                <span className={`gam-badge ${evaluation.badgeClass}`}>
                  {evaluation.badgeClass === "verified" ? (
                    <CheckCircle2 size={13} />
                  ) : evaluation.badgeClass === "warning" ? (
                    <AlertTriangle size={13} />
                  ) : (
                    <XCircle size={13} />
                  )}
                  {evaluation.badgeText}
                </span>
              ) : error ? (
                <span className="gam-badge rejected">
                  <XCircle size={13} />
                  Location Required
                </span>
              ) : (
                <span className="gam-badge detecting">
                  <span className="gam-pulse-dot amber"></span>
                  Waiting for Detection
                </span>
              )}
            </div>
            <p className="gam-subtitle">
              Desktop positioning via Windows Location Services & Real-Time Reverse Geocoding
            </p>
          </div>
        </div>

        {/* Action Button: Detect Current Location */}
        <button
          type="button"
          id="btn-detect-current-location"
          className="gam-detect-btn"
          onClick={onDetectLocation}
          disabled={detecting || disabled}
          title="Click to request high-accuracy location from Windows/browser service"
        >
          <Navigation size={15} className={detecting ? "spin" : ""} />
          <span>{detecting ? "Detecting Location…" : "Detect Current Location"}</span>
        </button>
      </div>

      {/* Progress / Stage Banner */}
      {detecting && (
        <div className="gam-stage-banner">
          <RefreshCw size={14} className="spin" />
          <span>{detectionStage || "Acquiring high-accuracy coordinates from device/browser…"}</span>
        </div>
      )}

      {/* Error Banner with Windows-specific guidance */}
      {!detecting && errorMsg && (
        <div className="gam-error-banner">
          <AlertTriangle size={18} className="gam-banner-icon danger" />
          <div className="gam-banner-content">
            <strong>Location Detection Failed:</strong>
            <p>{errorMsg}</p>
            {error?.detailedGuidance && (
              <p style={{ marginTop: "4px", fontSize: "0.82rem", opacity: 0.9 }}>
                💡 <em>{error.detailedGuidance}</em>
              </p>
            )}
            <button
              type="button"
              className="gam-retry-link"
              onClick={onDetectLocation}
            >
              Retry Location Detection
            </button>
          </div>
        </div>
      )}

      {/* Desktop Limitation Alert when accuracy is too poor (>500m or coarse IP) */}
      {!detecting && hasCoords && !evaluation.canPunch && (
        <div className="gam-warning-banner">
          <ShieldAlert size={18} className="gam-banner-icon danger" />
          <div className="gam-banner-content">
            <strong>
              Your computer is providing only an approximate location (±
              {accuracy >= 1000 ? `${(accuracy / 1000).toFixed(1)} km` : `${Math.round(accuracy)} m`}).
            </strong>
            <p>
              Attendance punch is disabled because current desktop accuracy does not meet the ≤ 500m requirement.
              Please ensure Wi-Fi is enabled on your computer so Windows Location Services can refine your position.
            </p>
            <button
              type="button"
              className="gam-help-toggle-btn"
              onClick={() => setShowWindowsHelp((prev) => !prev)}
            >
              <Laptop size={14} />
              <span>How to enable Windows Location Services</span>
              {showWindowsHelp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* Acceptable Accuracy Notice (31–100m) */}
      {!detecting && hasCoords && evaluation.level === "acceptable" && (
        <div className="gam-warning-banner acceptable">
          <Info size={18} className="gam-banner-icon warning" />
          <div className="gam-banner-content">
            <strong>Acceptable location accuracy (±{Math.round(accuracy)} meters).</strong>
            <p>
              Desktop location verified via Wi-Fi triangulation. Attendance punch is permitted.
            </p>
          </div>
        </div>
      )}

      {/* Windows Location Services Instructional Card (Expandable) */}
      {showWindowsHelp && (
        <div className="gam-windows-guide">
          <div className="gam-windows-guide-header">
            <Laptop size={16} />
            <h4>How to Enable High Accuracy on Windows Desktop / Laptop</h4>
          </div>
          <ol className="gam-steps-list">
            <li>
              Open <strong>Windows Settings</strong> (press <kbd>Win</kbd> + <kbd>I</kbd>).
            </li>
            <li>
              Navigate to <strong>Privacy & security</strong> → <strong>Location</strong>.
            </li>
            <li>
              Toggle <strong>Location Services</strong> to <strong>ON</strong>.
            </li>
            <li>
              Ensure <strong>Let apps access your location</strong> is <strong>ON</strong>.
            </li>
            <li>
              Ensure your browser (Google Chrome, Edge, Brave) is <strong>Allowed</strong>.
            </li>
            <li>
              <span className="gam-wifi-tip">
                <Wifi size={13} />
                <strong>Critical Tip:</strong> Keep Wi-Fi turned ON (even if connected via LAN cable). Windows Location Services uses surrounding Wi-Fi signals to achieve 15–50m accuracy on laptops!
              </span>
            </li>
          </ol>
        </div>
      )}

      {/* Map View & Telemetry Grid */}
      <div className="gam-body-grid">
        {/* Left Column: Interactive Leaflet Map with Google Maps Tiles, Live Marker, and Coords Accuracy Circle */}
        <div className="gam-map-container">
          {hasCoords ? (
            <div style={{ position: "relative", width: "100%", height: "280px" }}>
              <LeafletLocationMap
                latitude={lat}
                longitude={lng}
                accuracy={accuracy}
                heading={location?.heading}
                height="280px"
              />
              <div className="gam-map-overlay-badge">
                <MapPin size={13} />
                <span>📍 Your Current Location · ⭕ Accuracy Radius: ±{Math.round(accuracy)}m</span>
              </div>
              {googleMapsExternalUrl && (
                <a
                  href={googleMapsExternalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gam-map-external-link"
                  title="Open full view on Google Maps"
                >
                  <span>Open in Google Maps</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          ) : (
            <div className="gam-map-placeholder">
              <div className="gam-placeholder-content">
                <div className="gam-pulse-ring">
                  <MapPin size={32} />
                </div>
                <h4>{detecting ? "Acquiring Coordinates…" : "No Location Detected Yet"}</h4>
                <p>
                  {detecting
                    ? "Connecting to Windows/browser location service…"
                    : "Click 'Detect Current Location' above to locate your workstation on Google Maps."}
                </p>
                {!detecting && (
                  <button
                    type="button"
                    className="gam-inline-detect-btn"
                    onClick={onDetectLocation}
                  >
                    <Navigation size={14} />
                    Detect Current Location
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Address Details & Live Telemetry */}
        <div className="gam-details-container">
          <div className="gam-section-heading">
            <ShieldCheck size={16} />
            <span>Detected Territory & Address Details</span>
          </div>

          <div className="gam-address-card">
            <div className="gam-addr-primary">
              <span className="gam-pin-bullet">📍</span>
              <strong>{location?.area || location?.city || (detecting ? "Detecting…" : "Location Pending")}</strong>
            </div>
            <div className="gam-addr-secondary">
              {[
                location?.city && location.city !== location.area ? location.city : null,
                location?.district && location.district !== location.city ? `Dist: ${location.district}` : null,
                location?.state,
                location?.country || "India",
              ]
                .filter(Boolean)
                .join(", ")}
              {location?.pincode ? ` - ${location.pincode}` : ""}
            </div>
            {location?.full_address && (
              <div className="gam-addr-full">
                {location.full_address}
              </div>
            )}
          </div>

          {/* Component Field Tags Hierarchy */}
          <div className="gam-tags-grid">
            <div className="gam-tag-item">
              <span className="gam-tag-label">Area / Locality</span>
              <span className="gam-tag-val">{location?.area || (detecting ? "…" : "—")}</span>
            </div>
            <div className="gam-tag-item">
              <span className="gam-tag-label">City</span>
              <span className="gam-tag-val">{location?.city || (detecting ? "…" : "—")}</span>
            </div>
            <div className="gam-tag-item">
              <span className="gam-tag-label">District</span>
              <span className="gam-tag-val">{location?.district || (detecting ? "…" : "—")}</span>
            </div>
            <div className="gam-tag-item">
              <span className="gam-tag-label">State</span>
              <span className="gam-tag-val">{location?.state || (detecting ? "…" : "—")}</span>
            </div>
            <div className="gam-tag-item">
              <span className="gam-tag-label">Pincode</span>
              <span className="gam-tag-val">{location?.pincode || (detecting ? "…" : "—")}</span>
            </div>
            <div className="gam-tag-item">
              <span className="gam-tag-label">Location Source</span>
              <span className="gam-tag-val font-mono">
                {hasCoords
                  ? location?.location_source || (typeof navigator !== "undefined" && /windows/i.test(navigator.userAgent) ? "WINDOWS_LOCATION" : "BROWSER_GEOLOCATION")
                  : "—"}
              </span>
            </div>
          </div>

          {/* Device GPS Telemetry Bar */}
          <div className="gam-telemetry-box">
            <div className="gam-telem-header">
              <span>🛰️ Device Hardware Telemetry</span>
              <span className={`gam-telem-status ${hasCoords ? evaluation.badgeClass : detecting ? "detecting" : "rejected"}`}>
                {hasCoords
                  ? `Accuracy: ±${accuracy >= 1000 ? `${(accuracy / 1000).toFixed(1)} km` : `${Math.round(accuracy)} m`}`
                  : detecting
                  ? "Acquiring…"
                  : errorMsg
                  ? "Detection Failed"
                  : "Waiting for Location"}
              </span>
            </div>
            <div className="gam-telem-fields">
              <div>
                Latitude: <strong className="font-mono">{hasCoords ? lat.toFixed(6) : "—"}</strong>
              </div>
              <div>
                Longitude: <strong className="font-mono">{hasCoords ? lng.toFixed(6) : "—"}</strong>
              </div>
              <div>
                Location Accuracy:{" "}
                <strong className={`font-mono ${hasCoords ? (evaluation.canPunch ? "text-emerald" : "text-amber") : ""}`}>
                  {hasCoords ? `${Math.round(accuracy)}m` : "—"}
                </strong>
              </div>
              <div>
                Location Status:{" "}
                <strong className={hasCoords ? (evaluation.level === "good" ? "text-emerald" : evaluation.canPunch ? "text-amber" : "text-danger") : detecting ? "text-amber" : "text-slate"}>
                  {!hasCoords
                    ? (detecting ? "GETTING YOUR CURRENT LOCATION…" : errorMsg ? "LOCATION UNAVAILABLE" : "WAITING FOR LOCATION")
                    : evaluation.level === "good"
                    ? "✓ VERIFIED"
                    : evaluation.canPunch
                    ? "ACCEPTABLE (LOW ACCURACY)"
                    : "INVALID (ACCURACY TOO LOW)"}
                </strong>
              </div>
            </div>
          </div>

          {/* Development Diagnostics Section Toggle */}
          <div className="gam-footer-actions">
            <button
              type="button"
              className="gam-windows-info-link"
              onClick={() => setShowWindowsHelp((prev) => !prev)}
            >
              <Info size={13} />
              <span>{showWindowsHelp ? "Hide Windows Setup Guide" : "Windows Desktop Location Guide"}</span>
            </button>
            <button
              type="button"
              className="gam-windows-info-link"
              onClick={() => setShowDiagnostics((prev) => !prev)}
              style={{ color: "#4f46e5" }}
            >
              <Terminal size={13} />
              <span>{showDiagnostics ? "Hide Diagnostics" : "Show Dev Diagnostics"}</span>
            </button>
            <span className="gam-refresh-time">
              {location?.location_timestamp
                ? `Updated: ${new Date(location.location_timestamp).toLocaleTimeString()}`
                : ""}
            </span>
          </div>
        </div>
      </div>

      {/* ── DEVELOPMENT DIAGNOSTICS SECTION (Required for troubleshooting Windows & browser location) ── */}
      {showDiagnostics && (
        <div
          style={{
            marginTop: "16px",
            padding: "14px 16px",
            background: "#0f172a",
            color: "#e2e8f0",
            borderRadius: "10px",
            fontSize: "0.78rem",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            border: "1px solid #334155",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
              borderBottom: "1px solid #1e293b",
              paddingBottom: "6px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#38bdf8", fontWeight: 700 }}>
              <Activity size={15} />
              <span>🛠️ Real-Time Geolocation Diagnostics (Dev Mode)</span>
            </div>
            <button
              type="button"
              onClick={onDetectLocation}
              disabled={detecting}
              style={{
                background: "#1e293b",
                color: "#38bdf8",
                border: "1px solid #334155",
                borderRadius: "6px",
                padding: "3px 8px",
                fontSize: "0.72rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <RefreshCw size={11} className={detecting ? "spin" : ""} />
              <span>Test Refresh</span>
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "8px 16px",
            }}
          >
            <div>
              <span style={{ color: "#94a3b8" }}>Geolocation supported: </span>
              <strong style={{ color: isGeoSupported ? "#4ade80" : "#f87171" }}>
                {isGeoSupported ? "YES" : "NO"}
              </strong>
            </div>

            <div>
              <span style={{ color: "#94a3b8" }}>Permission state: </span>
              <strong
                style={{
                  color:
                    permissionState === "granted"
                      ? "#4ade80"
                      : permissionState === "denied"
                      ? "#f87171"
                      : "#fbbf24",
                }}
              >
                {permissionState}
              </strong>
            </div>

            <div>
              <span style={{ color: "#94a3b8" }}>Latitude: </span>
              <strong style={{ color: hasCoords ? "#38bdf8" : "#94a3b8" }}>
                {hasCoords ? lat.toFixed(6) : "—"}
              </strong>
            </div>

            <div>
              <span style={{ color: "#94a3b8" }}>Longitude: </span>
              <strong style={{ color: hasCoords ? "#38bdf8" : "#94a3b8" }}>
                {hasCoords ? lng.toFixed(6) : "—"}
              </strong>
            </div>

            <div>
              <span style={{ color: "#94a3b8" }}>Accuracy: </span>
              <strong style={{ color: hasCoords ? "#fbbf24" : "#94a3b8" }}>
                {hasCoords ? `${Math.round(accuracy)} meters` : "—"}
              </strong>
            </div>

            <div>
              <span style={{ color: "#94a3b8" }}>Timestamp: </span>
              <span style={{ color: "#cbd5e1" }}>
                {location?.timestamp ? new Date(location.timestamp).toLocaleTimeString() : (location?.location_timestamp || "—")}
              </span>
            </div>

            <div>
              <span style={{ color: "#94a3b8" }}>Position error code: </span>
              <strong style={{ color: errorCode ? "#f87171" : "#4ade80" }}>
                {errorCode != null ? errorCode : "None"}
              </strong>
            </div>

            <div>
              <span style={{ color: "#94a3b8" }}>Position error message: </span>
              <span style={{ color: errorMsg ? "#f87171" : "#cbd5e1" }}>
                {errorMsg || "None"}
              </span>
            </div>

            <div>
              <span style={{ color: "#94a3b8" }}>Location source: </span>
              <strong style={{ color: hasCoords ? "#a78bfa" : "#94a3b8" }}>
                {hasCoords
                  ? location?.location_source || (typeof navigator !== "undefined" && /windows/i.test(navigator.userAgent) ? "WINDOWS_LOCATION" : "BROWSER_GEOLOCATION")
                  : "None"}
              </strong>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <span style={{ color: "#94a3b8" }}>Windows location status: </span>
              <strong
                style={{
                  color:
                    hasCoords
                      ? "#4ade80"
                      : detecting
                      ? "#fbbf24"
                      : errorCode
                      ? "#f87171"
                      : "#cbd5e1",
                }}
              >
                {windowsLocationStatus}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
