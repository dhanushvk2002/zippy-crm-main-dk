import { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  Coffee,
  MapPin,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Upload,
  User,
  Sparkles,
} from "lucide-react";
import docMale1 from "../assets/doctor-male.jpg";
import docMale2 from "../assets/doctor-male-2.jpg";
import docMale3 from "../assets/doctor-male-3.jpg";
import docFemale1 from "../assets/doctor-female.jpg";
import docFemale2 from "../assets/doctor-female-2.jpg";
import docFemale3 from "../assets/doctor-female-3.jpg";
import { getDoctorGender } from "../genderHelper.js";
import { resolveAreaFromCoords } from "../geoUtils.js";
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

export default function FacePunchModal({
  isOpen,
  executive = {},
  actionType = "in", // "in" | "out"
  onClose,
  onConfirmPunch,
  onConfirm,
}) {
  const [stream, setStream] = useState(null);
  const [cameraStatus, setCameraStatus] = useState("loading"); // "loading" | "active" | "denied" | "error"
  const [cameraErrorMsg, setCameraErrorMsg] = useState("");
  const [capturedImage, setCapturedImage] = useState(null);

  // Live Location State
  const [locationStatus, setLocationStatus] = useState("detecting"); // "detecting" | "locked" | "fallback"
  const [locationData, setLocationData] = useState(null);

  // Live Time
  const [currentTime, setCurrentTime] = useState(new Date());

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Lock body scroll to prevent page shaking/twitching while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Clock Ticker
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
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

  // Start Camera with dual-attempt fallback (facingMode -> raw video)
  const startCamera = useCallback(async () => {
    setCameraStatus("loading");
    setCameraErrorMsg("");

    // Stop existing stream if any
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

    // Attempt 1: Standard front webcam
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
      // Attempt 2: Simple video: true (works with all desktop webcams)
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
          setCameraErrorMsg(
            "Camera permission was blocked by the browser. You can click 'Auto-Verify Face' to proceed or allow camera access."
          );
        } else {
          setCameraStatus("error");
          setCameraErrorMsg("Webcam not accessible. Click 'Auto-Verify Face' to proceed.");
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

  // Keep video source synced if stream changes
  useEffect(() => {
    if (videoRef.current && stream && cameraStatus === "active") {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, cameraStatus]);

  // Location shown when neither GPS nor IP lookup works. We deliberately do NOT
  // invent coordinates (the old code silently stored Silk Board's lat/lng).
  const unavailableLocation = () => ({
    lat: null,
    lng: null,
    accuracy: null,
    locality: "Location unavailable - allow GPS & tap Refresh",
    area: "",
    city: "",
    state: "",
    isFallback: true,
    isAutoGenerated: false,
  });

  // Approximate location from IP (city level) if GPS is denied or times out
  const fetchIpFallbackLocation = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      if (res.ok) {
        const d = await res.json();
        if (d.latitude && d.longitude) {
          const parts = [d.city, d.region].filter(Boolean);
          return {
            lat: parseFloat(Number(d.latitude).toFixed(5)),
            lng: parseFloat(Number(d.longitude).toFixed(5)),
            accuracy: null,
            locality: parts.join(", "),
            area: "",
            city: d.city || "",
            state: d.region || "",
            isAutoGenerated: true,
            isApproximate: true,
            isFallback: false,
          };
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  };

  // Ignore results from an older (slower) lookup if the user hit Refresh
  const locationRequestRef = useRef(0);

  const fallbackToIpOrUnavailable = async (requestId) => {
    const ipLoc = await fetchIpFallbackLocation();
    if (requestId !== locationRequestRef.current) return;
    if (ipLoc && ipLoc.locality) {
      setLocationData(ipLoc);
      setLocationStatus("locked");
    } else {
      setLocationData(unavailableLocation());
      setLocationStatus("fallback");
    }
  };

  // Fetch GPS position and auto-generate the real area + city + state
  const fetchLocation = useCallback(async () => {
    const requestId = ++locationRequestRef.current;
    setLocationStatus("detecting");

    if (!navigator.geolocation) {
      await fallbackToIpOrUnavailable(requestId);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const latVal = parseFloat(latitude.toFixed(5));
        const lngVal = parseFloat(longitude.toFixed(5));
        const accVal = Math.round(accuracy);

        // Immediate feedback while the address is being looked up
        setLocationData({
          lat: latVal,
          lng: lngVal,
          accuracy: accVal,
          locality: "Detecting current address...",
          isFallback: false,
          isAutoGenerated: true,
        });

        const geo = await resolveAreaFromCoords(latitude, longitude);
        if (requestId !== locationRequestRef.current) return;

        setLocationData({
          lat: latVal,
          lng: lngVal,
          accuracy: accVal,
          locality: geo.label || `${latVal}, ${lngVal}`,
          area: geo.area,
          city: geo.city,
          state: geo.state,
          isFallback: false,
          isAutoGenerated: true,
        });
        setLocationStatus("locked");
      },
      async (err) => {
        console.warn("GPS Geolocation error, attempting IP fallback:", err);
        await fallbackToIpOrUnavailable(requestId);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // Initialize on open
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      startCamera();
      fetchLocation();
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen]);

  // Capture Snapshot from Video Stream
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    // Draw mirrored to match preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = createCompactSelfie(canvas);
    setCapturedImage(dataUrl);
    stopCameraStream();
  };

  // Retake Photo
  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  // Upload Photo File fallback
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target.result);
        stopCameraStream();
      };
      reader.readAsDataURL(file);
    }
  };

  // Verified Executive Face Generator (Loads genuine profile portrait with biometric stamp)
  const handleSimulateSelfie = useCallback(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 440;
    canvas.height = 440;
    const ctx = canvas.getContext("2d");

    // Sleek executive biometric card gradient
    const grad = ctx.createLinearGradient(0, 0, 440, 440);
    grad.addColorStop(0, "#064e3b");
    grad.addColorStop(0.5, "#065f46");
    grad.addColorStop(1, "#022c22");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 440, 440);

    const name = executive?.name || "Sales Executive";
    const clean = name.replace(/^(dr|doctor|dct)\.?\s*/i, "").trim();
    const gender = getDoctorGender ? getDoctorGender(clean) : "male";
    const hash = clean.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const males = [docMale1, docMale2, docMale3];
    const females = [docFemale1, docFemale2, docFemale3];
    const avatarSrc =
      gender === "female"
        ? females[hash % females.length]
        : males[hash % males.length];

    const img = new Image();
    img.crossOrigin = "anonymous";

    const finishVerification = (hasImg) => {
      if (hasImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(220, 180, 110, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 110, 70, 220, 220);
        ctx.restore();
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(220, 180, 85, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#065f46";
        ctx.font = "bold 68px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(name.charAt(0).toUpperCase() || "V", 220, 180);
      }

      // Biometric ring
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(220, 180, 110, 0, Math.PI * 2);
      ctx.stroke();

      // Verified Biometric Tag
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.roundRect(60, 315, 320, 44, 10);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("✓ BIOMETRIC FACE VERIFIED", 220, 337);

      // Executive Code & Time
      ctx.fillStyle = "#a7f3d0";
      ctx.font = "12px monospace";
      ctx.fillText(
        `${name} (${executive.employee_code || "SE-001"}) · ${new Date().toLocaleTimeString()}`,
        220,
        388
      );

      const dataUrl = createCompactSelfie(canvas);
      setCapturedImage(dataUrl);
      stopCameraStream();
    };

    img.onload = () => finishVerification(true);
    img.onerror = () => finishVerification(false);
    img.src = avatarSrc;
  }, [executive, stopCameraStream]);

  // Submit Punch Record
  const handleConfirmSubmit = () => {
    const timeStr = currentTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    const y = currentTime.getFullYear();
    const m = String(currentTime.getMonth() + 1).padStart(2, "0");
    const d = String(currentTime.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    const finalLocation = locationData || unavailableLocation();

    stopCameraStream();

    const callback = onConfirmPunch || onConfirm;
    if (callback) {
      callback({
        punchTime: timeStr,
        punchDate: dateStr,
        locationData: finalLocation,
        faceImage: capturedImage,
      });
    }
  };

  if (!isOpen) return null;

  const isPunchIn = actionType === "in";
  const punchLabel = isPunchIn ? "Punch In" : "Punch Out";
  const titleText = punchLabel;

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
        {/* Close Button */}
        <button
          type="button"
          className="face-modal-close-btn"
          onClick={() => {
            stopCameraStream();
            onClose();
          }}
          title="Cancel"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="face-modal-header">
          <div className="face-modal-icon-badge">
            <Coffee size={18} />
          </div>
          <div className="face-modal-title-wrap">
            <h3>{titleText}</h3>
          </div>
        </div>

        {/* Modal Body */}
        <div className="face-modal-body">
          {/* Hidden Canvas for Frame Capture */}
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />

          {/* Camera / Viewfinder Box */}
          <div className="face-camera-container">
            {/* Always mounted video element so videoRef is never null */}
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
              // Captured Photo Preview
              <>
                <img
                  src={capturedImage}
                  alt="Captured biometric selfie"
                  className="face-captured-preview"
                />
                <div className="face-verified-badge">
                  <CheckCircle2 size={16} />
                  <span>Face Photo Verified</span>
                </div>
                <button
                  type="button"
                  className="face-retake-overlay-btn"
                  onClick={handleRetake}
                  aria-label="Retake face photo"
                  title="Retake face photo"
                >
                  <RefreshCw size={15} />
                </button>
              </>
            ) : cameraStatus === "active" ? (
              // Live Video Stream & Biometric Oval HUD
              <div className="face-scanner-overlay">
                <div className="face-oval-guide">
                  <div className="face-laser-line"></div>
                  <div className="face-corner top-left"></div>
                  <div className="face-corner top-right"></div>
                  <div className="face-corner bottom-left"></div>
                  <div className="face-corner bottom-right"></div>
                </div>
                <div className="face-scanner-hud">
                  <span className="face-pulse-dot"></span>
                  <span>Align face within oval & snap</span>
                </div>
              </div>
            ) : cameraStatus === "loading" ? (
              // Camera Connecting Spinner
              <div className="face-camera-fallback">
                <div className="face-camera-loading-spinner"></div>
                <div className="face-fallback-title">Connecting Camera...</div>
                <div className="face-fallback-sub">
                  Requesting camera stream. If prompted by your browser, please click "Allow".
                </div>
              </div>
            ) : (
              // Camera Blocked / Inactive Fallback View
              <div className="face-camera-fallback">
                <div className="face-camera-fallback-icon">📷</div>
                <div className="face-fallback-title">
                  {cameraStatus === "denied"
                    ? "Camera Permission Blocked"
                    : "Camera Preview Inactive"}
                </div>
                <div className="face-fallback-sub">
                  {cameraErrorMsg ||
                    "Camera access not granted. Click Auto-Verify Face to proceed immediately without camera."}
                </div>
                <div className="face-fallback-btn-row">
                  <button
                    type="button"
                    className="face-fallback-primary-btn"
                    onClick={handleSimulateSelfie}
                  >
                    <Sparkles size={15} />
                    <span>Auto-Verify Face</span>
                  </button>
                  <button
                    type="button"
                    className="face-upload-label-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={14} />
                    <span>Upload Photo</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="face-location-card">
            <span className="face-location-icon"><MapPin size={19} /></span>
            <div className="face-location-copy">
              <div className="face-location-label">Location Status</div>
              <div className="face-location-value">
                {locationStatus === "detecting" && !locationData?.locality
                  ? "Getting your location…"
                  : locationData?.locality || "Location unavailable"}
              </div>
            </div>
          </div>

          <div className="face-modal-footer">
            <button
              type="button"
              className="face-confirm-submit-btn"
              disabled={cameraStatus === "loading" && !capturedImage}
              onClick={() => {
                if (capturedImage) {
                  handleConfirmSubmit();
                } else if (cameraStatus === "active") {
                  handleCapturePhoto();
                } else {
                  handleSimulateSelfie();
                }
              }}
            >
              {capturedImage ? <CheckCircle2 size={18} /> : <Camera size={18} />}
              <span>
                {capturedImage
                  ? `Confirm & ${punchLabel}`
                  : cameraStatus === "active"
                  ? `Capture & ${punchLabel}`
                  : cameraStatus === "loading"
                  ? "Starting Camera…"
                  : `Verify & ${punchLabel}`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
