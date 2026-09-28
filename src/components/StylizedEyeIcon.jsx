import React, { useState, useRef, useEffect } from "react";

let eyeCounter = 0;

/**
 * Live Stylized Eye Icon:
 * - Almond curved eye shape with pastel sky-blue sclera
 * - Dark slate navy iris & deep inner pupil
 * - Bright white specular reflection highlight
 * - Natural lifelike blinking every ~4.2s (live mode)
 * - Gentle saccade glancing / looking around
 * - Interactive mouse tracking when cursor is near or hovered
 */
export default function StylizedEyeIcon({
  size,
  width = 22,
  height = 14,
  live = true,
  interactive = true,
  tracking = false,
  delay,
  forceBlink = false,
  className = "",
  style = {},
  ...props
}) {
  const finalWidth = size !== undefined ? size : width;
  const finalHeight = size !== undefined ? Math.round(size * 0.62) : height;

  // Staggered blink delay so multiple eyes in a table blink naturally at different moments
  const [animDelay] = useState(() => {
    if (delay !== undefined) return delay;
    eyeCounter = (eyeCounter + 1) % 8;
    return (eyeCounter * 0.55).toFixed(2);
  });

  const svgRef = useRef(null);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isManualBlinking, setIsManualBlinking] = useState(false);

  // Trigger manual blink when requested
  useEffect(() => {
    if (forceBlink) {
      setIsManualBlinking(true);
      const timer = setTimeout(() => setIsManualBlinking(false), 200);
      return () => clearTimeout(timer);
    }
  }, [forceBlink]);

  // Window-level tracking if tracking={true}
  useEffect(() => {
    if (!tracking) return;
    function onDocMouseMove(e) {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const eyeCenterX = rect.left + rect.width / 2;
      const eyeCenterY = rect.top + rect.height / 2;
      const deltaX = e.clientX - eyeCenterX;
      const deltaY = e.clientY - eyeCenterY;
      const dist = Math.hypot(deltaX, deltaY);
      const maxOffset = 5.5;
      const factor = Math.min(1, 120 / (dist + 0.1));
      const offsetX = Math.max(-maxOffset, Math.min(maxOffset, (deltaX / 12) * factor));
      const offsetY = Math.max(-maxOffset * 0.65, Math.min(maxOffset * 0.65, (deltaY / 12) * factor));
      setPupilOffset({ x: offsetX, y: offsetY });
    }
    window.addEventListener("mousemove", onDocMouseMove);
    return () => window.removeEventListener("mousemove", onDocMouseMove);
  }, [tracking]);

  // Local mouse tracking on container hover
  const handleMouseMove = (e) => {
    if (!interactive || tracking || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const eyeCenterX = rect.left + rect.width / 2;
    const eyeCenterY = rect.top + rect.height / 2;
    const deltaX = e.clientX - eyeCenterX;
    const deltaY = e.clientY - eyeCenterY;
    const dist = Math.hypot(deltaX, deltaY);
    const maxOffset = 5.5;
    const factor = Math.min(1, 60 / (dist + 0.1));
    const offsetX = Math.max(-maxOffset, Math.min(maxOffset, (deltaX / 8) * factor));
    const offsetY = Math.max(-maxOffset * 0.65, Math.min(maxOffset * 0.65, (deltaY / 8) * factor));
    setPupilOffset({ x: offsetX, y: offsetY });
  };

  const handleMouseEnter = (e) => {
    if (interactive && !tracking) {
      setIsHovered(true);
      handleMouseMove(e);
    }
  };

  const handleMouseLeave = () => {
    if (interactive && !tracking) {
      setIsHovered(false);
      setPupilOffset({ x: 0, y: 0 });
    }
  };

  const activeTracking = tracking || isHovered;

  return (
    <svg
      ref={svgRef}
      width={finalWidth}
      height={finalHeight}
      viewBox="0 0 100 62"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`live-eye-svg ${className}`}
      onMouseMove={interactive && !tracking ? handleMouseMove : undefined}
      onMouseEnter={interactive && !tracking ? handleMouseEnter : undefined}
      onMouseLeave={interactive && !tracking ? handleMouseLeave : undefined}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        overflow: "visible",
        ...style,
      }}
      aria-label="Live Eye Icon"
      {...props}
    >
      <defs>
        <style>{`
          @keyframes liveEyeBlinkAnim {
            0%, 88%, 100% { transform: scaleY(1); }
            92%, 94% { transform: scaleY(0.08); }
          }
          @keyframes liveEyeGlanceAnim {
            0%, 25%, 85%, 100% { transform: translate(0px, 0px); }
            30%, 50% { transform: translate(-3.2px, -0.6px); }
            55%, 75% { transform: translate(3.2px, 0.6px); }
          }
        `}</style>
      </defs>

      {/* Sclera & Eyelid Blink Group */}
      <g
        style={{
          transformOrigin: "50px 31px",
          transform: isManualBlinking ? "scaleY(0.08)" : undefined,
          transition: isManualBlinking ? "transform 0.1s ease-in-out" : undefined,
          animation: live && !isManualBlinking ? `liveEyeBlinkAnim 4.2s ease-in-out ${animDelay}s infinite` : "none",
        }}
      >
        {/* Soft pastel sky-blue almond sclera */}
        <path
          d="M 5 31 C 18 1, 82 1, 95 31 C 82 61, 18 61, 5 31 Z"
          fill="#bce5f8"
        />

        {/* Pupil & Iris Group with gentle glancing and interactive cursor tracking */}
        <g
          style={{
            transform: activeTracking
              ? `translate(${pupilOffset.x}px, ${pupilOffset.y}px)`
              : undefined,
            transition: activeTracking ? "transform 0.08s ease-out" : "transform 0.4s ease-out",
            animation: live && !activeTracking ? `liveEyeGlanceAnim 6.5s ease-in-out ${animDelay}s infinite` : "none",
          }}
        >
          {/* Outer Iris */}
          <circle cx="50" cy="31" r="19" fill="#2d3248" />
          {/* Inner Pupil */}
          <circle cx="50" cy="31" r="15" fill="#202336" />
          {/* Specular Highlight Glint */}
          <circle cx="42" cy="23" r="4.2" fill="#ffffff" />
        </g>
      </g>
    </svg>
  );
}

export { StylizedEyeIcon };
