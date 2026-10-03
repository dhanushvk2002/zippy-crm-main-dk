import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./LeafletLocationMap.css";

/**
 * LeafletLocationMap.jsx
 *
 * Google Maps-style interactive map component for Sales Executive Attendance:
 * - Centers automatically on the latest GPS coordinates (no hardcoded cities).
 * - Displays "Your Current Location" custom pulse marker.
 * - Draws accuracy circle with radius in meters matching coords.accuracy.
 * - Displays direction heading arrow IF device heading is available.
 * - Gracefully handles Windows desktop browsers without compass heading (no fake direction).
 * - Full interactive zoom and pan support.
 */
export default function LeafletLocationMap({
  latitude,
  longitude,
  accuracy = 0,
  heading = null,
  height = "260px",
  zoom = 16,
  onMapReady = null,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  const hasCoords =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    !isNaN(latitude) &&
    !isNaN(longitude);

  useEffect(() => {
    if (!mapContainerRef.current || !hasCoords) return;

    // Initialize Map if not yet created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: zoom,
        zoomControl: true,
        attributionControl: false,
      });

      // Standard Google Maps style road tile layer (high resolution, fast)
      const googleRoadTile = L.tileLayer(
        "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        {
          maxZoom: 20,
          subdomains: ["mt0", "mt1", "mt2", "mt3"],
          attribution: "© Google Maps",
        }
      );

      // Fallback OpenStreetMap layer
      const osmTile = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution: "© OpenStreetMap contributors",
        }
      );

      googleRoadTile.addTo(map);
      googleRoadTile.on("tileerror", () => {
        try {
          map.removeLayer(googleRoadTile);
          osmTile.addTo(map);
        } catch {}
      });

      mapInstanceRef.current = map;
      if (onMapReady) onMapReady(map);
    }

    const map = mapInstanceRef.current;
    const latLng = [latitude, longitude];

    // Build custom Google Maps style current location marker
    const hasValidHeading = typeof heading === "number" && !isNaN(heading) && heading >= 0;

    const iconHtml = hasValidHeading
      ? `
        <div class="leaflet-current-loc-marker with-heading">
          <div class="leaflet-heading-cone" style="transform: rotate(${heading}deg);"></div>
          <div class="leaflet-loc-pulse"></div>
          <div class="leaflet-loc-dot"></div>
          <div class="leaflet-heading-arrow" style="transform: rotate(${heading}deg);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L19 21L12 17L5 21L12 2Z" fill="#1d4ed8" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      `
      : `
        <div class="leaflet-current-loc-marker">
          <div class="leaflet-loc-pulse"></div>
          <div class="leaflet-loc-ring"></div>
          <div class="leaflet-loc-dot"></div>
        </div>
      `;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: "custom-leaflet-loc-icon",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    // Update or Create Marker
    if (markerRef.current) {
      markerRef.current.setLatLng(latLng);
      markerRef.current.setIcon(customIcon);
    } else {
      markerRef.current = L.marker(latLng, { icon: customIcon }).addTo(map);
      markerRef.current.bindPopup(
        `<div class="leaflet-popup-loc-card">
          <strong>Your Current Location</strong>
          <span>GPS Accuracy: ±${Math.round(accuracy || 0)}m</span>
        </div>`,
        { offset: [0, -10] }
      );
    }

    // Update or Create Accuracy Circle (represents location uncertainty, NOT office geofence)
    const accRadius = Math.max(5, Number(accuracy) || 15);
    const circleColor = accRadius <= 100 ? "#10b981" : accRadius <= 500 ? "#f59e0b" : "#ef4444";
    const fillColor = accRadius <= 100 ? "#34d399" : accRadius <= 500 ? "#fbbf24" : "#f87171";

    if (circleRef.current) {
      circleRef.current.setLatLng(latLng);
      circleRef.current.setRadius(accRadius);
      circleRef.current.setStyle({
        color: circleColor,
        fillColor: fillColor,
        fillOpacity: 0.18,
        weight: 1.5,
      });
    } else {
      circleRef.current = L.circle(latLng, {
        radius: accRadius,
        color: circleColor,
        fillColor: fillColor,
        fillOpacity: 0.18,
        weight: 1.5,
        dashArray: accRadius > 50 ? "4, 4" : undefined,
      }).addTo(map);
    }

    // Pan map to new center
    map.setView(latLng, map.getZoom() || zoom);

    // Invalidate size in case of modal transition/resizing
    setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
    }, 200);
  }, [latitude, longitude, accuracy, heading, zoom, hasCoords]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
  }, []);

  if (!hasCoords) {
    return (
      <div className="leaflet-map-placeholder" style={{ height }}>
        <div className="leaflet-placeholder-msg">
          <div className="leaflet-pulse-ring"></div>
          <span>Waiting for real-time GPS coordinates…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="leaflet-map-wrapper" style={{ height }}>
      <div ref={mapContainerRef} className="leaflet-map-element" />
      <div className="leaflet-map-chip-badge">
        <span className="leaflet-live-dot"></span>
        <span>Google Maps · Current Location</span>
      </div>
    </div>
  );
}
