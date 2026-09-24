import React from "react";

/**
 * StylishSearchIcon
 * A 3D glossy metallic button icon with a glowing cyan/turquoise neon ring,
 * dark glossy lens center, glass specular sheen reflection, and crisp white magnifying glass.
 * Styled after the user reference image for a high-tech, modern look.
 */
export default function StylishSearchIcon({
  size = 28,
  className = "",
  style = {},
  title = "Search",
  onClick = null,
  isButton = false,
}) {
  const iconContent = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        display: "block",
        flexShrink: 0,
        ...style,
      }}
      className={`stylish-search-svg ${className}`}
    >
      <defs>
        {/* Ambient Contact Shadow at the base */}
        <radialGradient id="ssContactShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0f172a" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
        </radialGradient>

        {/* Outer 3D Metallic Gunmetal Bezel */}
        <linearGradient id="ssMetalRim" x1="25%" y1="12%" x2="80%" y2="88%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="35%" stopColor="#475569" />
          <stop offset="70%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        {/* Top Metallic Highlight Edge */}
        <linearGradient id="ssBevelHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.85" />
          <stop offset="45%" stopColor="#64748b" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#090d16" stopOpacity="0.95" />
        </linearGradient>

        {/* Vivid Neon Cyan / Turquoise Glowing Ring */}
        <radialGradient id="ssCyanRingGlow" cx="36%" cy="32%" r="66%">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="28%" stopColor="#22d3ee" />
          <stop offset="55%" stopColor="#00b4d8" />
          <stop offset="82%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </radialGradient>

        {/* Inner Dark Glossy Core */}
        <linearGradient id="ssInnerCore" x1="30%" y1="20%" x2="80%" y2="90%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="40%" stopColor="#334155" />
          <stop offset="85%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#090d16" />
        </linearGradient>

        {/* Glass Curved Specular Sheen (Gloss Reflection) */}
        <linearGradient id="ssGlassSheen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="30%" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.3" />
        </linearGradient>

        {/* Soft Drop Shadow on Magnifying Glass Icon */}
        <filter id="ssIconShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="1.5" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.55" />
        </filter>
      </defs>

      {/* Base Contact Shadow */}
      <ellipse cx="50" cy="94" rx="34" ry="4" fill="url(#ssContactShadow)" />

      {/* Outer Metallic Bezel */}
      <circle
        cx="50"
        cy="48"
        r="44"
        fill="url(#ssMetalRim)"
        stroke="url(#ssBevelHighlight)"
        strokeWidth="1.5"
      />

      {/* Neon Cyan Luminous Ring */}
      <circle cx="50" cy="48" r="37.5" fill="url(#ssCyanRingGlow)" />

      {/* Neon Ring Inner Depth Bevel */}
      <circle
        cx="50"
        cy="48"
        r="37.5"
        stroke="#003554"
        strokeWidth="2.5"
        opacity="0.35"
        fill="none"
      />

      {/* Inner Metallic Bezel Rim */}
      <circle
        cx="50"
        cy="48"
        r="28.5"
        fill="url(#ssInnerCore)"
        stroke="#1e293b"
        strokeWidth="1"
      />

      {/* Signature Curved Glass Specular Sheen across lens */}
      <path
        d="M 23 48 C 23 33.5 35.5 21 50 21 C 64.5 21 77 33.5 77 48 C 77 56 73 63 67 68 C 55 60 40 58 23 48 Z"
        fill="url(#ssGlassSheen)"
        opacity="0.5"
      />
      <path
        d="M 24 55 C 38 60 55 62 67 68 C 62 73 56 76 50 76 C 36 76 24 64 24 55 Z"
        fill="#ffffff"
        opacity="0.14"
      />

      {/* Crisp White Magnifying Glass with Drop Shadow */}
      <g filter="url(#ssIconShadow)">
        {/* Glass Ring */}
        <circle
          cx="45"
          cy="43"
          r="11"
          stroke="#ffffff"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        {/* Handle */}
        <path
          d="M 53.5 51.5 L 64.5 62.5"
          stroke="#ffffff"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );

  const [isPressed, setIsPressed] = React.useState(false);

  const handleClick = (e) => {
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 300);
    onClick?.(e);
  };

  if (isButton || onClick) {
    return (
      <button
        type="button"
        className={`stylish-search-btn ${isPressed ? "is-pressed" : ""}`}
        title={title}
        aria-label={title || "Search"}
        onClick={handleClick}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          margin: 0,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          outline: "none",
        }}
      >
        {iconContent}
      </button>
    );
  }

  return iconContent;
}
