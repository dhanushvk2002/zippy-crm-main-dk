import React, { useState } from "react";
import docFemale1 from "../assets/doctor-female.jpg";
import docFemale2 from "../assets/doctor-female-2.jpg";
import docFemale3 from "../assets/doctor-female-3.jpg";
import docMale1 from "../assets/doctor-male.jpg";
import docMale2 from "../assets/doctor-male-2.jpg";
import docMale3 from "../assets/doctor-male-3.jpg";
import { getDoctorGender } from "../genderHelper.js";

export default function DoctorAvatar({
  name = "",
  gender = null,
  size = 36,
  className = "",
  style = {},
  alt = "",
  src = null,
  isOnline = null,
  showOnline = false,
}) {
  const [hasError, setHasError] = useState(false);

  const cleanName = (name || "").replace(/^(dr|doctor|dct)\.?\s*/i, "").trim();
  const detectedGender = gender || getDoctorGender(name);

  // Deterministic avatar index based on character code sum so it stays consistent per doctor
  const hash = cleanName
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  const femaleImgs = [docFemale1, docFemale2, docFemale3];
  const maleImgs = [docMale1, docMale2, docMale3];

  const defaultAvatar =
    detectedGender === "female"
      ? femaleImgs[hash % femaleImgs.length]
      : maleImgs[hash % maleImgs.length];

  const imageSrc = src || defaultAvatar;
  const initialChar = cleanName.charAt(0).toUpperCase() || "D";
  const hasStatus = isOnline !== null && isOnline !== undefined;
  const online = Boolean(isOnline ?? showOnline);

  const dotSize = Math.max(9, Math.round(size * 0.28));

  return (
    <div
      className={`doc-face-avatar-wrap ${className}`}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        flexShrink: 0,
        userSelect: "none",
        ...style,
      }}
      title={name ? `${name} (${detectedGender === "female" ? "Female" : "Male"})${hasStatus ? (online ? " · Online" : " · Offline") : ""}` : (hasStatus ? (online ? "Online" : "Offline") : "Doctor")}
    >
      <div
        className="doc-face-avatar-circle"
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          overflow: "hidden",
          backgroundColor: detectedGender === "female" ? "#fce7f3" : "#e0f2fe",
          border: "1.5px solid #cbd5e1",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!hasError ? (
          <img
            src={imageSrc}
            alt={alt || name || "Doctor Avatar"}
            onError={() => setHasError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 20%",
              display: "block",
            }}
          />
        ) : (
          <span
            style={{
              fontWeight: "bold",
              fontSize: `${Math.round(size * 0.42)}px`,
              color: detectedGender === "female" ? "#db2777" : "#0284c7",
            }}
          >
            {initialChar}
          </span>
        )}
      </div>

      {hasStatus && (
        <span
          className={online ? "avatar-online-dot" : "avatar-offline-dot"}
          style={{
            width: `${dotSize}px`,
            height: `${dotSize}px`,
          }}
          title={online ? "Online" : "Offline"}
        />
      )}
    </div>
  );
}
