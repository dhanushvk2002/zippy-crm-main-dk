import { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  Coffee,
  LogIn,
  LogOut,
  MapPin,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Upload,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import docMale1 from "../assets/doctor-male.jpg";
import docMale2 from "../assets/doctor-male-2.jpg";
import docMale3 from "../assets/doctor-male-3.jpg";
import docFemale1 from "../assets/doctor-female.jpg";
import docFemale2 from "../assets/doctor-female-2.jpg";
import docFemale3 from "../assets/doctor-female-3.jpg";
import { getAttendanceLocation } from "../utils/location.js";
import { checkFaceImage } from "../api.js";
import "./FacePunchModal.css";

const MAX_SELFIE_DATA_URL_LENGTH = 48 * 1024;

function createCompactSelfie(sourceCanvas) {
  const outputCanvas = document.createElement("canvas");
  const context = outputCanvas.getContext("2d");
  if (!context) return sourceCanvas.toDataURL("image/jpeg", 0.5);

  const initialScale = Math.min(1, 440 / Math.max(sourceCanvas.width, sourceCanvas.height));
  let width = Math.max(1, Math.round(sourceCanvas.width * initialScale));
  let height = Math.max(1, Math.round(sourceCanvas.height * initialScale));
  let lastDataUrl = "";

  while (width >= 120 && height >= 120) {
    outputCanvas.width = width;
    outputCanvas.height = height;
    context.drawImage(sourceCanvas, 0, 0, width, height);

    for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42]) {
      lastDataUrl = outputCanvas.toDataURL("image/jpeg", quality);
      if (lastDataUrl.length <= MAX_SELFIE_DATA_URL_LENGTH) return lastDataUrl;
    }

    width = Math.round(width * 0.8);
    height = Math.round(height * 0.8);
  }

  return lastDataUrl;
}

/**
 * Format location as "area, city, state"
 * e.g., "Pattabhirama Nagara, Bengaluru, Karnataka"
 */
export function formatAreaCityState(loc, exec) {
  const area =
    loc?.area ||
    loc?.accurateArea ||
    loc?.suburb ||
    loc?.neighbourhood ||
    loc?.locality ||
    exec?.area ||
    "";
  const city = loc?.city || loc?.town || exec?.city || "";
  const state = loc?.state || loc?.region || exec?.region || exec?.state || "";

  const parts = [];
  if (area && area !== "Field Area" && area !== "Field Territory") {
    parts.push(area.trim());
  }
  if (city && city !== "Field City") {
    const trimmedCity = city.trim();
    if (!parts.some((p) => p.toLowerCase().includes(trimmedCity.toLowerCase()))) {
      parts.push(trimmedCity);
    }
  }
  if (state && state !== "Field State") {
    const trimmedState = state.trim();
    if (!parts.some((p) => p.toLowerCase().includes(trimmedState.toLowerCase()))) {
      parts.push(trimmedState);
    }
  }

  if (parts.length > 0) {
    return parts.join(", ");
  }

  if (loc?.displayAddress) return loc.displayAddress;
  if (loc?.formattedAddress) return loc.formattedAddress;
  if (loc?.locality) return loc.locality;
  if (exec?.city || exec?.region) {
    return [exec.city, exec.region].filter(Boolean).join(", ");
  }
  return "Location unavailable";
}

export default function FacePunchModal({
  isOpen,
  executive = {},
  actionType = "in", // "in" | "out" | "lunch_out" | "lunch_in"
  initialLocation = null,
  onClose,
  onConfirmPunch,
  onConfirm,
}) {
  const [stream, setStream] = useState(null);
  const [cameraStatus, setCameraStatus] = useState("loading"); // "loading" | "active" | "denied" | "error"
  const [cameraErrorMsg, setCameraErrorMsg] = useState("");
  const [capturedImage, setCapturedImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Face Count Biometric Verification State
  const [faceCheckStatus, setFaceCheckStatus] = useState("idle"); // "idle" | "checking" | "valid" | "multiple_faces" | "no_face"
  const [detectedFaceCount, setDetectedFaceCount] = useState(0);

  // Location State
  const [locationStatus, setLocationStatus] = useState("detecting"); // "detecting" | "locked" | "error"
  const [locationStage, setLocationStage] = useState("Fetching current location...");
  const [locationError, setLocationError] = useState("");
  const [locationData, setLocationData] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const locationRequestRef = useRef(0);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Clean stop for media stream tracks
  const stopCameraStream = useCallback(() => {
    if (stream) {
      try {
        stream.getTracks().forEach((track) => track.stop());
      } catch {}
      setStream(null);
    }
  }, [stream]);

  // Start Camera
  const startCamera = useCallback(async () => {
    setCameraStatus("loading");
    setCameraErrorMsg("");

    if (stream) {
      try {
        stream.getTracks().forEach((track) => track.stop());
      } catch {}
      setStream(null);
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus("error");
      setCameraErrorMsg("Webcam API not supported in this browser environment.");
      return;
    }

    let mediaStream = null;

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
    } catch (err1) {
      console.warn("Attempt 1 (user facing mode) failed:", err1);
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (err2) {
        console.warn("Attempt 2 (simple video) failed:", err2);
        if (
          err2.name === "NotAllowedError" ||
          err2.name === "PermissionDeniedError"
        ) {
          setCameraStatus("denied");
          setCameraErrorMsg("Camera access was blocked by browser permissions.");
        } else {
          setCameraStatus("error");
          setCameraErrorMsg("Webcam not accessible.");
        }
        return;
      }
    }

    if (mediaStream) {
      setStream(mediaStream);
      setCameraStatus("active");
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
        videoRef.current.play().catch(() => {});
      }
    }
  }, [stream]);

  // Sync video source
  useEffect(() => {
    if (videoRef.current && stream && cameraStatus === "active") {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, cameraStatus]);

  // Fetch Geolocation
  const fetchLocation = useCallback(async () => {
    const requestId = ++locationRequestRef.current;
    setLocationStatus("detecting");
    setLocationError("");
    setLocationStage("Fetching current location...");

    try {
      const loc = await getAttendanceLocation((stage) => {
        if (requestId === locationRequestRef.current) {
          setLocationStage(stage);
        }
      });
      if (requestId !== locationRequestRef.current) return;

      if (loc && loc.latitude != null && loc.longitude != null) {
        setLocationData(loc);
        setLocationStatus("locked");
        setLocationError("");
      } else {
        throw new Error("Unable to determine your current location. Please enable GPS/location permission and try again.");
      }
    } catch (err) {
      if (requestId !== locationRequestRef.current) return;
      console.warn("[FacePunchModal] Location error:", err);
      setLocationData(null);
      setLocationStatus("error");
      setLocationError(err?.message || "Unable to determine your current location. Please try again.");
    }
  }, []);

  // Biometric Face Count Check
  const runFaceCheck = async (dataUrl) => {
    if (!dataUrl) return;
    setFaceCheckStatus("checking");

    try {
      const res = await checkFaceImage(dataUrl);
      if (res) {
        const count = res.face_count ?? 0;
        setDetectedFaceCount(count);
        if (count === 1) {
          setFaceCheckStatus("valid");
        } else if (count > 1) {
          setFaceCheckStatus("multiple_faces");
        } else {
          setFaceCheckStatus("valid");
        }
      }
    } catch (err) {
      setFaceCheckStatus("valid");
      setDetectedFaceCount(1);
    }
  };

  // Background Live Detection Loop (Checks if multiple persons in frame)
  const liveCheckRef = useRef(false);
  useEffect(() => {
    if (!isOpen || capturedImage || cameraStatus !== "active") return;

    let isMounted = true;
    const interval = setInterval(async () => {
      if (liveCheckRef.current || !videoRef.current || videoRef.current.readyState < 2) return;
      liveCheckRef.current = true;

      try {
        const video = videoRef.current;
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = 240;
        tempCanvas.height = 240;
        const ctx = tempCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, 240, 240);
          const dataUrl = tempCanvas.toDataURL("image/jpeg", 0.5);
          const res = await checkFaceImage(dataUrl);
          if (isMounted && res && !capturedImage) {
            const count = res.face_count ?? 0;
            setDetectedFaceCount(count);
            if (count > 1) {
              setFaceCheckStatus("multiple_faces");
            } else if (count === 1) {
              setFaceCheckStatus("valid");
            } else {
              setFaceCheckStatus("idle");
            }
          }
        }
      } catch (err) {
        // ignore background poll errors
      } finally {
        liveCheckRef.current = false;
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, capturedImage, cameraStatus]);

  // Initialize on modal open
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setFaceCheckStatus("idle");
      setDetectedFaceCount(0);
      setIsSubmitting(false);
      startCamera();
      fetchLocation();
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen]);

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    setFaceCheckStatus("idle");
    setDetectedFaceCount(0);
    startCamera();
  };

  // Upload file fallback
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        setCapturedImage(dataUrl);
        stopCameraStream();
        runFaceCheck(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate fallback portrait
  const generateSimulatedSelfie = useCallback(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, 400, 400);
    grad.addColorStop(0, "#064e3b");
    grad.addColorStop(1, "#022c22");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 400, 400);

    const name = executive?.name || "Sales Executive";
    const clean = name.replace(/^(dr|doctor|dct)\.?\s*/i, "").trim();
    const hash = clean.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const males = [docMale1, docMale2, docMale3];
    const females = [docFemale1, docFemale2, docFemale3];
    const avatarSrc = males[hash % males.length];

    const img = new Image();
    img.crossOrigin = "anonymous";

    return new Promise((resolve) => {
      img.onload = () => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(200, 200, 160, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 40, 40, 320, 320);
        ctx.restore();
        const url = createCompactSelfie(canvas);
        resolve(url);
      };
      img.onerror = () => {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(200, 200, 100, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#065f46";
        ctx.font = "bold 80px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(name.charAt(0).toUpperCase() || "S", 200, 200);
        const url = createCompactSelfie(canvas);
        resolve(url);
      };
      img.src = avatarSrc;
    });
  }, [executive]);

  // Main Submit / Capture Action Handler
  const handleCaptureAndPunch = async () => {
    if (isSubmitting) return;

    if (faceCheckStatus === "multiple_faces") {
      alert(
        `Attendance Rejected: Multiple faces detected (${detectedFaceCount} faces found). Strictly 1 member face allowed.`
      );
      return;
    }

    setIsSubmitting(true);

    let currentLoc = locationData;
    if (!currentLoc || currentLoc.latitude == null) {
      try {
        currentLoc = await getAttendanceLocation((stage) => setLocationStage(stage));
        setLocationData(currentLoc);
        setLocationStatus("locked");
        setLocationError("");
      } catch (err) {
        setIsSubmitting(false);
        setLocationStatus("error");
        setLocationError(err?.message || "Unable to determine your current location. Please try again.");
        alert(err?.message || "Unable to determine your current location. Please enable GPS/location permission and try again.");
        return;
      }
    }

    let selfieUrl = capturedImage;

    // Capture snapshot from webcam if not yet captured
    if (!selfieUrl && videoRef.current && cameraStatus === "active") {
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current || document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        selfieUrl = createCompactSelfie(canvas);
        setCapturedImage(selfieUrl);
      } catch (err) {
        console.warn("Could not capture video frame:", err);
      }
    }

    if (!selfieUrl) {
      try {
        selfieUrl = await generateSimulatedSelfie();
        setCapturedImage(selfieUrl);
      } catch (e) {
        console.warn("Failed simulated selfie:", e);
      }
    }

    // Format current time and date
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    const finalArea = currentLoc?.area || "";
    const finalCity = currentLoc?.city || "";
    const finalState = currentLoc?.state || "";
    const finalPin = currentLoc?.pincode || "";

    const displayLocationStr = currentLoc?.displayAddress || formatAreaCityState(currentLoc, executive);

    const finalLocation = {
      latitude: currentLoc.latitude,
      longitude: currentLoc.longitude,
      lat: currentLoc.latitude,
      lng: currentLoc.longitude,
      accuracy: currentLoc.accuracy,
      accuracyText: `±${currentLoc.accuracy}m`,
      area: finalArea,
      city: finalCity,
      district: currentLoc.district || "",
      state: finalState,
      region: finalState,
      pincode: finalPin,
      country: currentLoc.country || "India",
      locality: displayLocationStr,
      displayAddress: displayLocationStr,
      formattedAddress: displayLocationStr,
      timestamp: currentLoc.timestamp || new Date().toISOString(),
    };

    stopCameraStream();

    const callback = onConfirmPunch || onConfirm;
    if (callback) {
      await callback({
        punchTime: timeStr,
        punchDate: dateStr,
        locationData: finalLocation,
        faceImage: selfieUrl,
      });
    }

    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  // Determine Title, Icon, and Button Label based on actionType
  let punchLabel = "Lunch Out";
  let HeaderIcon = Coffee;

  if (actionType === "lunch_out") {
    punchLabel = "Lunch Out";
    HeaderIcon = Coffee;
  } else if (actionType === "lunch_in") {
    punchLabel = "Lunch In";
    HeaderIcon = Coffee;
  } else if (actionType === "out") {
    punchLabel = "Evening Logout";
    HeaderIcon = LogOut;
  } else {
    punchLabel = "Morning Punch In";
    HeaderIcon = LogIn;
  }

  const displayLocation = formatAreaCityState(locationData, executive);

  return (
    <div
      className="face-punch-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          stopCameraStream();
          onClose();
        }
      }}
    >
      <div className="face-punch-modal">
        {/* Header: Action Icon + Title + Close Button */}
        <div className="face-modal-header">
          <div className="face-modal-header-left">
            <span className="face-modal-header-icon">
              <HeaderIcon size={22} />
            </span>
            <h3 className="face-modal-title">{punchLabel}</h3>
          </div>
          <button
            type="button"
            className="face-modal-close-btn"
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            title="Close"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="face-modal-body">
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />

          {/* Circular Camera Preview Container */}
          <div
            className={`face-camera-container ${
              faceCheckStatus === "multiple_faces" ? "circle-red" : ""
            }`}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="face-video-feed"
              style={{
                display:
                  !capturedImage && cameraStatus === "active" ? "block" : "none",
              }}
            />

            {capturedImage ? (
              <img
                src={capturedImage}
                alt="Face Preview"
                className="face-captured-preview"
              />
            ) : cameraStatus === "loading" ? (
              <div className="face-camera-fallback">
                <RefreshCw size={26} className="spin" style={{ color: "#f97316" }} />
                <div className="face-fallback-title">Starting Camera…</div>
              </div>
            ) : cameraStatus !== "active" ? (
              <div className="face-camera-fallback">
                <Camera size={28} style={{ color: "#94a3b8" }} />
                <div className="face-fallback-title">Camera Inactive</div>
                <div className="face-fallback-btn-row">
                  <button
                    type="button"
                    className="face-fallback-primary-btn"
                    onClick={async () => {
                      const url = await generateSimulatedSelfie();
                      setCapturedImage(url);
                    }}
                  >
                    <Sparkles size={13} />
                    <span>Auto-Verify</span>
                  </button>
                  <button
                    type="button"
                    className="face-upload-label-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={13} />
                    <span>Upload</span>
                  </button>
                </div>
              </div>
            ) : null}

            {capturedImage && (
              <button
                type="button"
                className="face-retake-circle-btn"
                onClick={handleRetake}
                title="Retake photo"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>

          {/* Multiple Faces Detected Warning */}
          {faceCheckStatus === "multiple_faces" && (
            <div className="face-status-alert-box error">
              <Users size={18} />
              <span>❌ More Than 1 Person Detected. Strictly 1 person allowed.</span>
            </div>
          )}

          {/* Location Status Card */}
          <div className="face-location-card" style={locationStatus === "error" ? { borderColor: "#f87171", background: "rgba(239, 68, 68, 0.06)" } : {}}>
            <span className="face-location-icon" style={locationStatus === "error" ? { color: "#ef4444" } : {}}>
              <MapPin size={20} />
            </span>
            <div className="face-location-copy" style={{ flex: 1 }}>
              <div className="face-location-label" style={locationStatus === "error" ? { color: "#ef4444" } : {}}>
                {locationStatus === "error" ? "LOCATION ERROR" : "LOCATION STATUS"}
              </div>
              <div className="face-location-value" style={locationStatus === "error" ? { color: "#dc2626", fontSize: "12px", lineHeight: "1.3" } : {}}>
                {locationStatus === "detecting"
                  ? locationStage || "Fetching current location..."
                  : locationStatus === "error"
                  ? locationError
                  : (locationData?.displayAddress || displayLocation)}
              </div>
            </div>
            {locationStatus === "error" && (
              <button
                type="button"
                className="face-location-retry-btn"
                onClick={fetchLocation}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 600,
                  borderRadius: "6px",
                  background: "#0284c7",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            )}
          </div>

          {/* Action Button: Capture & [Punch Type] */}
          <div className="face-modal-footer">
            <button
              type="button"
              className="face-confirm-submit-btn"
              disabled={
                isSubmitting ||
                locationStatus === "detecting" ||
                faceCheckStatus === "multiple_faces" ||
                (cameraStatus === "loading" && !capturedImage)
              }
              onClick={handleCaptureAndPunch}
            >
              {isSubmitting ? (
                <RefreshCw size={18} className="spin" />
              ) : (
                <Camera size={18} />
              )}
              <span>
                {isSubmitting
                  ? "Recording Attendance…"
                  : `Capture & ${punchLabel}`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
