/**
 * src/utils/location.js
 * Real-time Browser Geolocation and Reverse Geocoding utility for Sales Executive Attendance.
 *
 * Requirements:
 * - Fresh location on every attendance action (Punch In, Lunch Out, Lunch In, Punch Out)
 * - Uses navigator.geolocation.getCurrentPosition with { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
 * - Specific error messages for PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT, and UNSUPPORTED
 * - Accuracy validation against configurable threshold (default 500m)
 * - Resolves reverse geocoding from backend / reverse-geocode service
 * - Loading state support: "Fetching current location..." -> "Verifying location..."
 */

import { API_BASE } from "../api.js";

export const DEFAULT_MAX_ACCURACY_METERS = 500;

export function isGeolocationSupported() {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

/**
 * Low-level call to navigator.geolocation.getCurrentPosition
 * Always fetches a FRESH position directly from the browser without using cached coordinates.
 */
export function getCurrentLocation(options = {}) {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      const err = new Error("Geolocation is not supported by this browser.");
      err.code = "UNSUPPORTED";
      reject(err);
      return;
    }

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
      ...options,
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const result = {
          latitude: Number(latitude.toFixed(7)),
          longitude: Number(longitude.toFixed(7)),
          accuracy: Math.round(accuracy),
          timestamp: new Date(pos.timestamp || Date.now()).toISOString(),
        };
        console.log("[Attendance Location] Fresh browser location fetched:", result);
        resolve(result);
      },
      (err) => {
        let errorMsg = "Unable to determine your current location. Please try again.";
        switch (err.code) {
          case 1: // PERMISSION_DENIED
            errorMsg =
              "Location permission was denied. Please allow location access for this website and try again.";
            break;
          case 2: // POSITION_UNAVAILABLE
            errorMsg =
              "Your device could not determine your current location. Please enable Windows Location Services and try again.";
            break;
          case 3: // TIMEOUT
            errorMsg = "Location request timed out. Please try again.";
            break;
          default:
            errorMsg = err.message || errorMsg;
        }
        console.warn("[Attendance Location] Geolocation error:", err.code, errorMsg);
        const customErr = new Error(errorMsg);
        customErr.code = err.code;
        reject(customErr);
      },
      geoOptions
    );
  });
}

/**
 * Fetches fresh location and validates that accuracy <= maxAccuracy (default 500m).
 * Rejects if accuracy exceeds the threshold.
 */
export async function getVerifiedLocation(maxAccuracy = DEFAULT_MAX_ACCURACY_METERS) {
  const loc = await getCurrentLocation();

  if (loc.accuracy > maxAccuracy) {
    const poorAccuracyMsg =
      "Your current location accuracy is poor. Please enable Windows Location Services, allow browser location permission, and try again.";
    console.warn(
      `[Attendance Location] Rejected reading: accuracy ${loc.accuracy}m exceeds max allowed ${maxAccuracy}m`
    );
    const err = new Error(poorAccuracyMsg);
    err.accuracy = loc.accuracy;
    err.threshold = maxAccuracy;
    throw err;
  }

  return loc;
}

/**
 * Reverse geocodes coordinates into Area, City, District, State, Pincode.
 * Queries the backend /reverse-geocode endpoint, with fallback to direct service if unreachable.
 */
export async function reverseGeocodeLocation(lat, lng) {
  if (lat == null || lng == null) {
    return {
      area: "",
      city: "",
      district: "",
      state: "",
      pincode: "",
      displayAddress: "",
    };
  }

  // 1. Try Backend reverse geocode endpoint
  try {
    const res = await fetch(`${API_BASE}/reverse-geocode?lat=${lat}&lng=${lng}`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        area: data.area || "",
        city: data.city || "",
        district: data.district || "",
        state: data.state || "",
        pincode: data.pincode || "",
        country: data.country || "India",
        displayAddress: data.display_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        formattedAddress: data.formatted_address || data.display_address || "",
      };
    }
  } catch (err) {
    console.warn("[Location] Backend reverse geocode fetch failed, trying direct provider:", err);
  }

  // 2. Direct Fallback: BigDataCloud Client API
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    if (res.ok) {
      const data = await res.json();
      const area = data.locality || "";
      const city = data.city || area || "";
      const state = data.principalSubdivision || "";
      const pincode = data.postcode || "";
      const parts = [area, city, state].filter(Boolean);
      const displayAddress = parts.length > 0 ? parts.join(", ") : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      return {
        area,
        city,
        district: "",
        state,
        pincode,
        country: data.countryName || "India",
        displayAddress,
        formattedAddress: displayAddress,
      };
    }
  } catch (err) {
    console.warn("[Location] Direct fallback reverse geocode failed:", err);
  }

  const fallbackStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  return {
    area: "",
    city: "",
    district: "",
    state: "",
    pincode: "",
    displayAddress: fallbackStr,
    formattedAddress: fallbackStr,
  };
}

/**
 * High-level attendance location workflow with progressive loading states:
 * 1. "Fetching current location..." -> getCurrentLocation
 * 2. "Verifying location..." -> accuracy check & reverseGeocode
 * Returns complete verified location payload.
 */
export async function getAttendanceLocation(onProgress = null, maxAccuracy = DEFAULT_MAX_ACCURACY_METERS) {
  if (onProgress) onProgress("Fetching current location...");

  const pos = await getVerifiedLocation(maxAccuracy);

  if (onProgress) onProgress("Verifying location...");

  const geo = await reverseGeocodeLocation(pos.latitude, pos.longitude);

  return {
    ...pos,
    ...geo,
  };
}
