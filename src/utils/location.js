/**
 * src/utils/location.js
 * Real-time Browser Geolocation and Reverse Geocoding utility for Sales Executive Attendance.
 *
 * Requirements:
 * - Fresh location on every attendance action (Punch In, Lunch Out, Lunch In, Punch Out)
 * - Uses navigator.geolocation.getCurrentPosition with { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
 * - Specific error messages for PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT, and UNSUPPORTED
 * - Multi-attempt retry strategy (up to 3 attempts) if accuracy is poor, selecting the result with lowest accuracy value
 * - Configurable accuracy thresholds:
 *     Optimal: <= 500m (Green / Verified)
 *     Acceptable / Limited: 501m – 2000m (Amber / Allowed with limited accuracy warning)
 *     Extremely poor: > 2000m (Red / Blocked, asks user to enable Windows Location Services & retry)
 * - Reverse geocoding of coordinates into Area, City, District, State, Pincode
 * - Strictly NO IP fallback, NO hardcoded coordinates, NO cached positions
 */

import { API_BASE } from "../api.js";

// Configurable Accuracy Thresholds (in meters)
export const LOCATION_OPTIMAL_ACCURACY = 500;  // High accuracy (mobile GPS / good Wi-Fi)
export const LOCATION_MAX_ACCURACY = 1000;     // Standard desktop/laptop threshold (configurable)
export const LOCATION_EXTREME_LIMIT = 2000;    // Rejection threshold for extremely poor accuracy
export const MAX_LOCATION_RETRIES = 3;         // Up to 3 attempts to refine accuracy

export function getMaxAccuracyThreshold() {
  try {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem("ZIPPY_ATTENDANCE_MAX_ACCURACY");
      if (stored && !isNaN(Number(stored)) && Number(stored) > 0) {
        return Number(stored);
      }
    }
  } catch {}
  return LOCATION_MAX_ACCURACY;
}

export function setMaxAccuracyThreshold(meters) {
  try {
    if (typeof localStorage !== "undefined" && meters > 0) {
      localStorage.setItem("ZIPPY_ATTENDANCE_MAX_ACCURACY", String(meters));
    }
  } catch {}
}

export function isGeolocationSupported() {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

/**
 * Low-level single call to navigator.geolocation.getCurrentPosition
 * Always fetches a FRESH position directly from the browser without using cached coordinates.
 */
export function getSingleBrowserPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      const err = new Error("Geolocation is not supported by this browser.");
      err.code = "UNSUPPORTED";
      reject(err);
      return;
    }

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 30000,
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

        // Required diagnostics log
        console.log({
          latitude: result.latitude,
          longitude: result.longitude,
          accuracy: result.accuracy,
          timestamp: result.timestamp,
        });

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

let pendingLocationPromise = null;

/**
 * High-reliability location acquisition with multi-attempt accuracy refinement.
 * - Attempt 1: get location
 * - If accuracy is poor (> LOCATION_OPTIMAL_ACCURACY), retries up to 3 times
 * - Compares accuracy values and returns the result with the LOWEST accuracy value (best precision)
 * - Deduplicates in-flight calls so multiple components don't spam browser GPS hardware concurrently.
 */
export function getCurrentLocation(options = {}, onProgress = null) {
  const hasCustomOptions = options && Object.keys(options).length > 0;
  if (!hasCustomOptions && pendingLocationPromise) {
    return pendingLocationPromise;
  }

  const runAcquisition = async () => {
    const attempts = [];
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_LOCATION_RETRIES; attempt++) {
      console.log(`Location attempt ${attempt}`);
      if (onProgress) {
        onProgress(
          attempt === 1
            ? "Fetching current location (Attempt 1 of 3)..."
            : `Refining location accuracy (Attempt ${attempt} of 3)...`
        );
      }

      try {
        const result = await getSingleBrowserPosition(options);
        attempts.push(result);

        // If accuracy is already optimal (<= 500m), we have an excellent reading - no need to delay user
        if (result.accuracy <= LOCATION_OPTIMAL_ACCURACY) {
          break;
        }
      } catch (err) {
        lastError = err;
        // If permission is denied, retrying will never succeed
        if (err?.code === 1 || err?.code === "UNSUPPORTED") {
          throw err;
        }
      }

      // Brief delay between retries to let device sensors adjust
      if (attempt < MAX_LOCATION_RETRIES) {
        await new Promise((res) => setTimeout(res, 400));
      }
    }

    if (attempts.length === 0) {
      throw lastError || new Error("Failed to acquire device location.");
    }

    // Select the attempt with the lowest accuracy value (best precision)
    attempts.sort((a, b) => a.accuracy - b.accuracy);
    const bestResult = attempts[0];

    if (attempts.length > 1) {
      console.log(
        `[Attendance Location] Evaluated ${attempts.length} attempts. Selected best reading: ±${bestResult.accuracy}m (lowest accuracy value)`
      );
    }

    return bestResult;
  };

  const promise = runAcquisition();

  if (!hasCustomOptions) {
    pendingLocationPromise = promise;
    promise.finally(() => {
      if (pendingLocationPromise === promise) {
        pendingLocationPromise = null;
      }
    });
  }

  return promise;
}

/**
 * Fetches fresh location and validates accuracy against configurable thresholds.
 * - accuracy <= 500m: Optimal / High precision
 * - 500m < accuracy <= 2000m: Acceptable desktop/laptop accuracy with warning
 * - accuracy > 2000m: Rejected as extremely poor
 */
export async function getVerifiedLocation(maxAccuracy = null, onProgress = null) {
  const loc = await getCurrentLocation({}, onProgress);

  const threshold = maxAccuracy || getMaxAccuracyThreshold();
  const extremeThreshold = LOCATION_EXTREME_LIMIT;

  // Extremely poor accuracy (> 2000m): block attendance
  if (loc.accuracy > extremeThreshold) {
    const poorAccuracyMsg =
      `Your current location accuracy is extremely poor (${Math.round(loc.accuracy)} meters). Please enable Windows Location Services, allow browser location permission, and try again.`;
    console.warn(
      `[Attendance Location] Rejected reading: accuracy ${loc.accuracy}m exceeds extreme limit ${extremeThreshold}m`
    );
    const err = new Error(poorAccuracyMsg);
    err.accuracy = loc.accuracy;
    err.threshold = extremeThreshold;
    err.isExtreme = true;
    throw err;
  }

  // Reasonable but limited accuracy (e.g. laptop Wi-Fi positioning)
  let accuracyWarning = null;
  if (loc.accuracy > LOCATION_OPTIMAL_ACCURACY) {
    accuracyWarning = `Location detected with limited accuracy (${Math.round(loc.accuracy)} meters).`;
    console.warn(`[Attendance Location] Notice: ${accuracyWarning}`);
  }

  return {
    ...loc,
    accuracyWarning,
    isLimitedAccuracy: Boolean(accuracyWarning),
    canPunch: true,
  };
}

/**
 * Reverse geocodes coordinates into Area, City, District, State, Pincode.
 * Queries the backend /reverse-geocode endpoint, with fallback to direct service if unreachable.
 * Never uses hardcoded or employee profile addresses.
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
      const area = data.area || "";
      const village = data.village || "";
      const street = data.street || data.route || "";
      const city = data.city || "";
      const taluk = data.taluk || "";
      const district = data.district || "";
      const state = data.state || "";
      const pincode = data.pincode || data.pin || "";
      const country = data.country || "India";
      const areaStreet = data.area_street || (area && street ? `${area}, ${street}` : area || street || village || "");
      const formattedAddress = data.formatted_address || data.display_address || "";
      return {
        street,
        route: data.route || street,
        area,
        areaStreet,
        area_street: areaStreet,
        village,
        taluk,
        city,
        district,
        state,
        pincode,
        pin: pincode,
        country,
        displayAddress: data.display_address || formattedAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        formattedAddress,
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
      const city = (data.city || "").trim();
      const locality = (data.locality || "").trim();
      let area = "";
      if (locality && city && locality.toLowerCase() !== city.toLowerCase()) {
        area = locality;
      }
      const state = data.principalSubdivision || "";
      const pincode = data.postcode || "";
      const parts = [area, city, state].filter(Boolean);
      const displayAddress = parts.length > 0 ? parts.join(", ") : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      return {
        street: "",
        route: "",
        area,
        areaStreet: area,
        area_street: area,
        village: "",
        taluk: "",
        city: city || locality || "",
        district: "",
        state,
        pincode,
        pin: pincode,
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
    street: "",
    route: "",
    area: "",
    areaStreet: "",
    area_street: "",
    village: "",
    taluk: "",
    city: "",
    district: "",
    state: "",
    pincode: "",
    pin: "",
    country: "India",
    displayAddress: fallbackStr,
    formattedAddress: fallbackStr,
  };
}

/**
 * High-level attendance location workflow with progressive loading states:
 * 1. "Fetching current location..." -> getCurrentLocation (with up to 3 retries & best accuracy)
 * 2. "Verifying location address..." -> reverseGeocode
 * Returns complete verified location payload with actual accuracy.
 */
export async function getAttendanceLocation(onProgress = null, maxAccuracy = null) {
  if (onProgress) onProgress("Fetching current location...");

  const pos = await getVerifiedLocation(maxAccuracy, onProgress);

  if (onProgress) onProgress("Verifying location address...");

  const geo = await reverseGeocodeLocation(pos.latitude, pos.longitude);

  return {
    ...pos,
    ...geo,
    canPunch: true,
  };
}

/**
 * Search places by free text (village, town, taluk, landmark, PIN code).
 * Queries the backend /reverse-geocode/search endpoint first, with fallback to direct Nominatim OSM query.
 */
export async function searchLocationPlaces(query) {
  if (!query || typeof query !== "string" || query.trim().length < 2) {
    return [];
  }

  const cleanQuery = query.trim();

  // 1. Try Backend search endpoint
  try {
    const res = await fetch(
      `${API_BASE}/reverse-geocode/search?q=${encodeURIComponent(cleanQuery)}`,
      {
        headers: { Accept: "application/json" },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn("[Location] Backend place search failed, falling back to direct provider:", err);
  }

  // 2. Direct Fallback: OpenStreetMap Nominatim Search API
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      cleanQuery
    )}&format=jsonv2&addressdetails=1&limit=6&countrycodes=in`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
      },
    });

    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items)) {
        return items.map((it) => {
          const latVal = parseFloat(it.lat);
          const lngVal = parseFloat(it.lon);
          const addr = it.address || {};
          const village =
            addr.village || addr.hamlet || addr.suburb || addr.locality || "";
          const taluk =
            addr.subdistrict || addr.tehsil || addr.taluk || addr.mandal || "";
          const city = addr.city || addr.town || addr.municipality || "";
          const district = (
            addr.state_district ||
            addr.district ||
            addr.county ||
            ""
          )
            .replace(/\s+District$/i, "")
            .trim();
          const state = addr.state || "";
          const pincode = addr.postcode || "";

          const parts = [village, taluk, city, district, state].filter(Boolean);
          let disp = parts.length > 0 ? parts.join(", ") : it.display_name || "";
          if (pincode && !disp.includes(pincode)) {
            disp += ` - ${pincode}`;
          }

          return {
            display_name: disp,
            latitude: latVal,
            longitude: lngVal,
            village,
            taluk,
            area: village || city,
            city,
            district,
            state,
            pincode,
            country: addr.country || "India",
          };
        });
      }
    }
  } catch (err) {
    console.warn("[Location] Direct place search fallback failed:", err);
  }

  return [];
}

