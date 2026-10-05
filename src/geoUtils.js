
import { API_BASE } from "./api.js";

// Non-place words to filter out noise from geographic databases
const NOT_A_PLACE =
  /(river|basin|watershed|catchment|drainage|lake|reservoir|ocean|\bsea\b|\bbay\b|time ?zone|continent|country region|biosphere|plateau|desert|\bunknown\b|\bnull\b|\bundefined\b)/i;

export const clean = (v) => {
  if (typeof v !== "string") return "";
  const t = v.trim();
  if (!t || t.toLowerCase() === "undefined" || t.toLowerCase() === "null") return "";
  return t;
};

export const isPlace = (v) => {
  const c = clean(v);
  return Boolean(c && !NOT_A_PLACE.test(c));
};

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Reverse Geocoding Provider 1: OpenStreetMap Nominatim
 * Highest granularity for Indian addresses (suburb, neighbourhood, quarter, village, pincode).
 */
async function lookupNominatim(lat, lng) {
  try {
    const data = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&zoom=18&addressdetails=1&accept-language=en`,
      {
        headers: {
          "Accept-Language": "en",
        },
      },
      7000
    );

    if (!data || !data.address) return null;
    const a = data.address;

    // Area fallback priority: neighbourhood → suburb → locality → village
    const areaCandidates = [
      a.neighbourhood,
      a.suburb,
      a.locality,
      a.village,
      a.quarter,
      a.hamlet,
      a.residential,
      a.road,
    ];
    const area = areaCandidates.find(isPlace) || "";

    // City fallback priority: city → town → municipality → city_district
    const cityCandidates = [
      a.city,
      a.town,
      a.municipality,
      a.city_district,
    ];
    const city = cityCandidates.find(isPlace) || "";

    // District fallback: district → state_district → county
    const districtCandidates = [
      a.district,
      a.state_district,
      a.county,
    ];
    const district = districtCandidates.find(isPlace) || "";

    const state = clean(a.state);
    const pincode = clean(a.postcode || a.postalCode);
    const country = clean(a.country);

    let cleanArea = area;
    if (cleanArea && city && cleanArea.toLowerCase() === city.toLowerCase()) {
      cleanArea = "";
    }

    return { area: cleanArea, city, district, state, pincode, country, raw: data };
  } catch {
    return null;
  }
}

/**
 * Reverse Geocoding Provider 2: BigDataCloud Client API
 * Fast, free, CORS-safe, highly reliable for administrative subdivisions and postal codes.
 */
async function lookupBigDataCloud(lat, lng) {
  try {
    const data = await fetchWithTimeout(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      {},
      6000
    );
    if (!data) return null;

    let area = isPlace(data.locality) ? clean(data.locality) : "";
    if (!area && data.localityInfo?.informative) {
      const wantedRegex = /(neighbo|suburb|quarter|ward|locality|village|sub-?district|taluk|tehsil|mandal)/i;
      const hit = (data.localityInfo.informative || [])
        .slice()
        .reverse()
        .find((i) => wantedRegex.test(i.description || "") && isPlace(i.name));
      if (hit) area = clean(hit.name);
    }

    const city = isPlace(data.city) ? clean(data.city) : "";
    let district = "";
    if (data.localityInfo?.administrative) {
      // Find district level in administrative array
      const distHit = (data.localityInfo.administrative || []).find(
        (adm) => /district|county/i.test(adm.description || "") && isPlace(adm.name)
      );
      if (distHit) district = clean(distHit.name);
    }

    const state = clean(data.principalSubdivision);
    const pincode = clean(data.postcode);
    const country = clean(data.countryName);

    let cleanArea = area;
    if (cleanArea && city && cleanArea.toLowerCase() === city.toLowerCase()) {
      cleanArea = "";
    }

    return { area: cleanArea, city, district, state, pincode, country, raw: data };
  } catch {
    return null;
  }
}

export const VERIFIED_FIELD_LOCATION = {
  address: "",
  area: "",
  accurateArea: "",
  building: "",
  landmark: "",
  street: "",
  suburb: "",
  locality: "",
  city: "",
  district: "",
  state: "",
  region: "",
  pincode: "",
  country: "India",
  latitude: null,
  longitude: null,
  lat: null,
  lng: null,
  accuracy: null,
  location_accuracy: null,
  accuracyText: "",
  displayAddress: "",
  formattedAddress: "",
  full_address: "",
};

/**
 * Reverse Geocoding Provider 0: Google Maps Geocoder (if loaded in browser)
 * Adheres strictly to the requested address hierarchy:
 *   - sublocality_level_1 / sublocality / neighborhood -> area
 *   - locality -> city
 *   - administrative_area_level_2 -> district
 *   - administrative_area_level_1 -> state
 *   - country -> country
 *   - postal_code -> pincode
 */
async function lookupGoogleGeocoder(lat, lng) {
  if (
    typeof window === "undefined" ||
    !window.google ||
    !window.google.maps ||
    !window.google.maps.Geocoder
  ) {
    return null;
  }
  return new Promise((resolve) => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const res = results[0];
          const components = res.address_components || [];

          const getComponent = (types) => {
            const hit = components.find((c) =>
              types.some((t) => c.types && c.types.includes(t))
            );
            return hit ? clean(hit.long_name || hit.short_name) : "";
          };

          const taluk =
            getComponent(["administrative_area_level_3", "subdistrict", "tehsil"]) || "";
          const sublocality =
            getComponent(["sublocality_level_1", "sublocality", "neighborhood"]) || "";
          const locality =
            getComponent(["locality"]) || "";
          const district =
            (getComponent(["administrative_area_level_2"]) || "").replace(/\s+District$/i, "").trim();
          const state =
            getComponent(["administrative_area_level_1"]) || "";
          const country =
            getComponent(["country"]) || "India";
          const pincode =
            getComponent(["postal_code"]) || "";
          const formatted_address = clean(res.formatted_address) || "";

          let village = "";
          let area = "";
          let city = "";

          if (sublocality) {
            area = sublocality;
            city = locality || district;
          } else if (locality) {
            if (taluk && taluk.toLowerCase() !== locality.toLowerCase()) {
              village = locality;
              area = locality;
            } else {
              city = locality;
              area = locality;
            }
          } else {
            area = taluk || district;
            city = district;
          }

          resolve({
            village,
            taluk,
            area: area || city,
            city: city || district,
            district,
            state,
            pincode,
            country,
            full_address: formatted_address,
            formattedAddress: formatted_address,
            displayAddress: formatted_address,
          });
        } else {
          resolve(null);
        }
      });
    } catch {
      resolve(null);
    }
  });
}

/**
 * Reverse Geocoding Provider 3: Backend Server Proxy (/reverse-geocode)
 * Serves as an additional high-availability fallback with server-side Nominatim and BDC.
 */
async function lookupBackendProxy(lat, lng) {
  try {
    const data = await fetchWithTimeout(
      `${API_BASE}/reverse-geocode?lat=${lat}&lng=${lng}`,
      {},
      6000
    );
    if (data && (data.area || data.city || data.state)) {
      return {
        area: clean(data.area),
        city: clean(data.city),
        district: clean(data.district),
        state: clean(data.state),
        region: clean(data.region || data.state),
        pincode: clean(data.pincode),
        country: clean(data.country || "India"),
        full_address: clean(data.full_address),
        formattedAddress: clean(data.formatted_address),
        displayAddress: clean(data.display_address),
      };
    }
  } catch { }
  return null;
}

/**
 * Resolves GPS coordinates (lat, lng) into detailed address fields:
 * { area, city, district, state, pincode, country, full_address, formattedAddress, displayAddress }
 */
export async function reverseGeocodeCoordinates(lat, lng, exec = null) {
  if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) {
    return {
      area: "",
      accurateArea: "",
      city: "",
      district: "",
      state: "",
      region: "",
      pincode: "",
      country: "India",
      full_address: "",
      formattedAddress: "",
      displayAddress: "",
    };
  }

  // Query providers in parallel with Google Geocoder priority
  const [google, server, osm, bdc] = await Promise.all([
    lookupGoogleGeocoder(lat, lng),
    lookupBackendProxy(lat, lng),
    lookupNominatim(lat, lng),
    lookupBigDataCloud(lat, lng),
  ]);

  // Area hierarchy: Google → Server → OSM → BDC
  let rawArea = google?.area || server?.area || osm?.area || bdc?.area || "";
  let rawCity = google?.city || server?.city || osm?.city || bdc?.city || "";
  let rawDistrict = google?.district || server?.district || osm?.district || bdc?.district || "";
  let rawState = google?.state || server?.state || osm?.state || bdc?.state || "";
  let rawPincode = google?.pincode || server?.pincode || osm?.pincode || bdc?.pincode || "";
  const rawCountry = google?.country || server?.country || osm?.country || bdc?.country || "India";

  // If area is empty or identical to city, search osm raw address for more granular locality
  if ((!rawArea || rawArea.toLowerCase() === rawCity.toLowerCase()) && osm?.raw?.address) {
    const a = osm.raw.address;
    const moreSpecific =
      a.neighbourhood ||
      a.suburb ||
      a.locality ||
      a.village ||
      a.hamlet ||
      a.quarter ||
      a.residential ||
      a.subdistrict ||
      a.road;
    if (moreSpecific && isPlace(moreSpecific)) {
      rawArea = clean(moreSpecific);
    }
  }

  // If city is empty, fall back to district
  if (!rawCity && rawDistrict) {
    rawCity = rawDistrict;
  }

  // If area is still empty, fall back to city
  if (!rawArea && rawCity) {
    rawArea = rawCity;
  }

  const finalArea = rawArea;
  const finalCity = rawCity;
  const finalDistrict = rawDistrict;
  const finalState = rawState;
  const finalPincode = rawPincode ? rawPincode.replace(/\D/g, "").slice(0, 6) : "";

  // Standard clean format: Area, City, State
  const cleanParts = [];
  if (finalArea) cleanParts.push(finalArea);
  if (finalCity && !cleanParts.some((p) => p.toLowerCase() === finalCity.toLowerCase())) {
    cleanParts.push(finalCity);
  }
  if (finalState && !cleanParts.some((p) => p.toLowerCase() === finalState.toLowerCase())) {
    cleanParts.push(finalState);
  }

  const formattedAddress = cleanParts.join(", ");
  // If reverse geocoding fails, keep coordinates and provide clean fallback message
  if (!finalArea && !finalCity && !finalState) {
    const fallbackText = "Address details temporarily unavailable";
    return {
      area: fallbackText,
      accurateArea: fallbackText,
      city: "",
      district: "",
      state: "",
      region: "",
      pincode: "",
      country: rawCountry || "India",
      full_address: fallbackText,
      formattedAddress: fallbackText,
      displayAddress: fallbackText,
    };
  }

  return {
    area: finalArea,
    accurateArea: finalArea,
    city: finalCity,
    district: finalDistrict,
    state: finalState,
    region: finalState,
    pincode: finalPincode,
    country: rawCountry,
    full_address,
    formattedAddress,
    displayAddress,
  };
}

/**
 * Configurable Attendance Accuracy Thresholds (meters)
 * TARGET_LOCATION_ACCURACY_METERS = 100
 * MAX_LOCATION_ACCURACY_METERS = 500
 *
 * Behavior:
 * - If accuracy <= 100m: Excellent / Verified (Green)
 * - If accuracy > 100m and <= 500m: Acceptable / Verified with warning (Amber)
 * - If accuracy > 500m: Invalid / Retry (Red)
 */
export const TARGET_LOCATION_ACCURACY_METERS = 500;
export const MAX_LOCATION_ACCURACY_METERS = 1000;
export const EXTREME_LOCATION_ACCURACY_METERS = 2000;

export const ACCURACY_CONFIG = {
  GOOD_THRESHOLD: TARGET_LOCATION_ACCURACY_METERS, // 500m
  ACCEPTABLE_THRESHOLD: MAX_LOCATION_ACCURACY_METERS, // 1000m
  DEFAULT_MAX_ALLOWED: MAX_LOCATION_ACCURACY_METERS, // 1000m
  EXTREME_THRESHOLD: EXTREME_LOCATION_ACCURACY_METERS, // 2000m
};

export function getMaxAllowedAccuracy() {
  try {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem("ZIPPY_ATTENDANCE_MAX_ACCURACY");
      if (stored && !isNaN(Number(stored)) && Number(stored) > 0) {
        return Number(stored);
      }
    }
  } catch { }
  return MAX_LOCATION_ACCURACY_METERS;
}

export function setMaxAllowedAccuracy(meters) {
  try {
    if (typeof localStorage !== "undefined" && meters > 0) {
      localStorage.setItem("ZIPPY_ATTENDANCE_MAX_ACCURACY", String(meters));
    }
  } catch { }
}

/**
 * Calculates Haversine distance between two coordinates in meters.
 * Returns null if either coordinate is invalid.
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (
    lat1 == null || lon1 == null || lat2 == null || lon2 == null ||
    isNaN(Number(lat1)) || isNaN(Number(lon1)) || isNaN(Number(lat2)) || isNaN(Number(lon2))
  ) {
    return null;
  }
  const toRad = (x) => (Number(x) * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(Number(lat2) - Number(lat1));
  const dLon = toRad(Number(lon2) - Number(lon1));
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(Number(lat1))) *
    Math.cos(toRad(Number(lat2))) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Diagnostic helper: Checks browser geolocation support and permission state.
 */
export async function getGeolocationDiagnostics() {
  const isSupported = typeof navigator !== "undefined" && "geolocation" in navigator;
  let permissionState = "unknown";
  try {
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      const p = await navigator.permissions.query({ name: "geolocation" });
      permissionState = p.state; // 'granted' | 'denied' | 'prompt'
    }
  } catch { }
  return {
    isSupported,
    permissionState,
    isSecureContext: typeof window !== "undefined" ? Boolean(window.isSecureContext) : true,
    protocol: typeof window !== "undefined" ? window.location.protocol : "",
    isWindows: typeof navigator !== "undefined" ? /windows/i.test(navigator.userAgent) : false,
  };
}

/**
 * Maps native GeolocationPositionError to informative user and developer diagnostics.
 * Distinguishes Windows desktop nuances clearly.
 */
export function mapGeolocationError(err) {
  if (!err) {
    return {
      code: "UNKNOWN",
      nativeCode: null,
      message: "An unknown location error occurred.",
      detailedGuidance: "Please check your browser location settings.",
    };
  }

  const nativeCode = err.code ?? err.nativeCode;

  if (nativeCode === 1) {
    return {
      code: "PERMISSION_DENIED",
      nativeCode: 1,
      message: "Location permission is blocked. Allow location access for this website in Chrome/Edge.",
      detailedGuidance:
        "In Chrome/Edge: Click the lock/tune icon at the left of the address bar → Site settings → Location → select 'Allow'. Then click 'Retry Location Detection'.",
    };
  }

  if (nativeCode === 2) {
    return {
      code: "POSITION_UNAVAILABLE",
      nativeCode: 2,
      message: "Windows could not provide a current location. Check Windows Location Services and try again.",
      detailedGuidance:
        "On Windows: Open Windows Settings (Win+I) → Privacy & security → Location. Turn ON 'Location services' and 'Let apps access your location'. Also ensure Wi-Fi is enabled on your laptop/PC (even if using Ethernet/LAN) so Windows can scan nearby Wi-Fi beacons for triangulation.",
    };
  }

  if (nativeCode === 3) {
    return {
      code: "TIMEOUT",
      nativeCode: 3,
      message: "Location request timed out. Click Retry Location Detection.",
      detailedGuidance:
        "Windows location scanning took longer than expected. Ensure Wi-Fi is switched ON and click 'Retry Location Detection'.",
    };
  }

  return {
    code: err.code || "LOCATION_ERROR",
    nativeCode: nativeCode || null,
    message: err.message || "Unable to determine location. Please check browser and Windows location settings.",
    detailedGuidance: "Ensure Windows Location Services and browser permissions are granted.",
  };
}

/**
 * Obtains device heading/compass orientation if supported by browser/device hardware.
 * Gracefully returns null if unsupported (e.g. Windows desktop without compass sensors).
 */
export function getDeviceHeadingAsync(maxWaitMs = 1200) {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null);
      return;
    }

    let resolved = false;
    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      try {
        window.removeEventListener("deviceorientationabsolute", handleOrientation, true);
        window.removeEventListener("deviceorientation", handleOrientation, true);
      } catch { }
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, maxWaitMs);

    function handleOrientation(e) {
      if (resolved) return;
      let heading = null;
      if (typeof e.webkitCompassHeading === "number" && !isNaN(e.webkitCompassHeading)) {
        heading = e.webkitCompassHeading;
      } else if (e.absolute === true && typeof e.alpha === "number" && !isNaN(e.alpha)) {
        heading = (360 - e.alpha) % 360;
      } else if (typeof e.alpha === "number" && !isNaN(e.alpha)) {
        heading = (360 - e.alpha) % 360;
      }

      if (heading != null && !isNaN(heading)) {
        cleanup();
        clearTimeout(timer);
        resolve(Math.round(heading));
      }
    }

    try {
      window.addEventListener("deviceorientationabsolute", handleOrientation, true);
      window.addEventListener("deviceorientation", handleOrientation, true);
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

/**
 * Obtains current GPS coordinates directly from device Geolocation API.
 *
 * Implements a robust multi-phase location acquisition flow:
 *   Phase 1: navigator.geolocation.getCurrentPosition with high accuracy (retry once on failure)
 *   Phase 2: navigator.geolocation.watchPosition for accuracy refinement or as fallback
 *
 * Progressive accuracy acceptance:
 *   - Immediately accepts readings with accuracy <= GOOD_THRESHOLD (30m)
 *   - Collects multiple readings and keeps the best one
 *   - After refinement window, accepts the best available reading regardless of accuracy
 *   - Never immediately fails just because a reading has poor accuracy
 *
 * Windows-specific error handling:
 *   - Code 1 (PERMISSION_DENIED): Clear browser permission instructions
 *   - Code 2 (POSITION_UNAVAILABLE): Windows Location Services guidance
 *   - Code 3 (TIMEOUT): Retry suggestion with settings guidance
 *   - Insecure context detection
 *   - Browser API availability check
 */
export function getDeviceGpsPosition({
  timeout = 45000,
  maxRefineMs = 15000,
  enableHighAccuracy = true,
  maximumAge = 0,
  onProgress = null,
} = {}) {
  return new Promise((resolve, reject) => {
    // Check secure context
    if (
      typeof window !== "undefined" &&
      window.isSecureContext === false &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      reject({
        code: "INSECURE_CONNECTION",
        message:
          "Location access requires a secure connection (HTTPS) or localhost. Your current connection is not secure.",
      });
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject({
        code: "UNSUPPORTED",
        message: "Geolocation is not supported by your browser or device.",
      });
      return;
    }

    let bestReading = null;
    let watchId = null;
    let finished = false;
    let readingCount = 0;
    const allTimers = [];

    const addTimer = (fn, ms) => {
      const id = setTimeout(fn, ms);
      allTimers.push(id);
      return id;
    };

    const cleanupAll = () => {
      if (watchId !== null) {
        try {
          navigator.geolocation.clearWatch(watchId);
        } catch { }
        watchId = null;
      }
      allTimers.forEach((id) => {
        try {
          clearTimeout(id);
        } catch { }
      });
      allTimers.length = 0;
    };

    const finishSuccess = (reading) => {
      if (finished) return;
      finished = true;
      cleanupAll();
      resolve(reading);
    };

    const finishError = (err) => {
      if (finished) return;
      finished = true;
      cleanupAll();
      const formatted = mapGeolocationError(err);
      reject({
        code: formatted.code,
        nativeCode: formatted.nativeCode,
        message: formatted.message,
        detailedGuidance: formatted.detailedGuidance,
        rawError: err,
      });
    };

    const processPosition = (pos) => {
      if (finished) return;
      readingCount++;
      const { latitude, longitude, accuracy, heading } = pos.coords;
      const latVal = parseFloat(latitude.toFixed(6));
      const lngVal = parseFloat(longitude.toFixed(6));
      const accVal = Math.round(accuracy);
      const headingVal =
        typeof heading === "number" && !isNaN(heading) && heading >= 0
          ? Math.round(heading)
          : null;

      const currentReading = {
        latitude: latVal,
        longitude: lngVal,
        accuracy: accVal,
        location_accuracy: accVal,
        accuracyText: "±" + accVal + " m",
        heading: headingVal,
        readingNumber: readingCount,
        timestamp: pos.timestamp || Date.now(),
        coords: pos.coords,
      };

      // Keep best (lowest accuracy value = highest precision)
      if (!bestReading || accVal < bestReading.accuracy) {
        bestReading = currentReading;
      }

      // 1. High precision (<= 25m): accept immediately!
      if (accVal <= 25) {
        if (onProgress) onProgress(`High accuracy achieved (±${accVal}m). Location locked.`);
        finishSuccess(currentReading);
        return;
      }

      // 2. Good precision (<= 50m):
      if (accVal <= 50) {
        if (onProgress) onProgress(`Acceptable accuracy detected (±${accVal}m). Checking for higher precision…`);
        // Allow up to 3.5 seconds to see if an even tighter fix arrives, then accept
        addTimer(() => {
          if (!finished && bestReading) {
            finishSuccess(bestReading);
          }
        }, 3500);
        return;
      }

      // 3. Moderate or coarse reading (e.g. 70m, 85m, 120m):
      // Do NOT immediately fail! Keep listening and inform user.
      if (onProgress) {
        onProgress(`Location detected, but accuracy is currently ${accVal}m. Waiting for a more accurate reading…`);
      }
    };

    // Hard overall safety timeout
    addTimer(() => {
      if (finished) return;
      if (bestReading) {
        finishSuccess(bestReading);
      } else {
        finishError({ code: 3, message: "Location request timed out. Click Retry Location Detection." });
      }
    }, timeout);

    // Phase 3 / Fallback: watchPosition refinement
    const startWatch = (fallbackError) => {
      if (finished || watchId !== null) return;

      if (onProgress) onProgress("Refining location via continuous positioning watch…");

      // Refinement window timer
      addTimer(() => {
        if (finished) return;
        if (bestReading) {
          finishSuccess(bestReading);
        } else if (fallbackError) {
          finishError(fallbackError);
        }
      }, maxRefineMs);

      try {
        watchId = navigator.geolocation.watchPosition(
          (pos) => processPosition(pos),
          (err) => {
            if (finished) return;
            if (bestReading) {
              finishSuccess(bestReading);
            } else if (err?.code === 1) {
              // Permission denied is permanent
              finishError(err);
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0,
          }
        );
      } catch (err) {
        if (!finished) {
          if (bestReading) {
            finishSuccess(bestReading);
          } else {
            finishError(fallbackError || err);
          }
        }
      }
    };

    // Phase 1: getCurrentPosition with retry
    const attemptGetCurrent = (attempt) => {
      if (finished) return;

      if (onProgress) {
        onProgress(
          attempt > 1
            ? `Retrying location request with fresh request (attempt ${attempt})…`
            : "Requesting location from browser…"
        );
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          processPosition(pos);
          if (!finished) {
            // If not yet finished (accuracy needs refinement), run watcher
            startWatch(null);
          }
        },
        (err) => {
          if (finished) return;

          // If permission is denied, fail immediately - retrying won't help
          if (err?.code === 1) {
            finishError(err);
            return;
          }

          if (attempt < 2) {
            // Retry once with a fresh request after a brief 1-second pause
            if (onProgress) onProgress("First location request failed. Retrying with a fresh request…");
            addTimer(() => attemptGetCurrent(attempt + 1), 1000);
          } else {
            // Both getCurrentPosition attempts failed - fall back to watchPosition
            if (onProgress) onProgress("Trying continuous location watch fallback…");
            startWatch(err);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0,
        }
      );
    };

    // Begin Phase 1
    attemptGetCurrent(1);
  });
}

/**
 * Strict Configurable Accuracy Evaluator
 * Evaluates accuracy according to configurable threshold:
 *   GOOD:       0–30 meters (Green, Location Verified)
 *   ACCEPTABLE: 31–50 meters (Amber, Acceptable Accuracy)
 *   POOR:       Above 50 meters (Red, Location accuracy is too low. Please wait a few seconds and try again.)
 *   REJECTED:   Above 5000m (Red, Coarse IP location rejected)
 */
export function evaluateLocationAccuracy(accuracyMeters) {
  if (accuracyMeters == null) {
    return {
      level: "unknown",
      isAcceptable: false,
      isPrecise: false,
      badgeText: "Waiting for Location",
      badgeClass: "waiting",
      statusMessage: "Waiting for location coordinates.",
      userGuidance: "Please allow browser location access and enable Windows Location Services.",
      canPunch: false,
    };
  }

  const acc = Number(accuracyMeters);
  const maxAllowed = getMaxAllowedAccuracy();
  const target = TARGET_LOCATION_ACCURACY_METERS;

  if (isNaN(acc) || acc <= 0) {
    return {
      level: "unknown",
      isAcceptable: false,
      isPrecise: false,
      badgeText: "Location Status: WAITING FOR LOCATION",
      badgeClass: "rejected",
      statusMessage: "Unable to determine device accuracy.",
      userGuidance: "Please enable Windows Location Services and grant browser location access.",
      canPunch: false,
    };
  }

  // 1. If accuracy <= 500m: Excellent / Verified
  if (acc <= target) {
    return {
      level: "good",
      isAcceptable: true,
      isPrecise: true,
      badgeText: "✓ VERIFIED",
      badgeClass: "verified",
      statusMessage: `Location verified (±${Math.round(acc)}m)`,
      userGuidance: null,
      canPunch: true,
    };
  }

  // 2. If accuracy > 500m and <= 2000m: Acceptable / Verified with warning
  if (acc <= EXTREME_LOCATION_ACCURACY_METERS) {
    return {
      level: "warning",
      isAcceptable: true,
      isPrecise: false,
      badgeText: "Location detected with limited accuracy",
      badgeClass: "warning",
      statusMessage: `Location detected with limited accuracy (±${Math.round(acc)}m)`,
      userGuidance: "Wi-Fi triangulation provides acceptable desktop positioning.",
      canPunch: true,
    };
  }

  // 3. If accuracy > 2000m: Invalid / Extremely poor
  return {
    level: "invalid",
    isAcceptable: false,
    isPrecise: false,
    badgeText: "Location accuracy is too low",
    badgeClass: "rejected",
    statusMessage: `Location accuracy is extremely poor (${Math.round(acc)}m). Please enable Windows Location Services and try again.`,
    userGuidance: `Location accuracy is too low (${Math.round(acc)}m). Please enable Windows Location Services and try again.`,
    canPunch: false,
  };
}

/**
 * Main function: Obtains fresh real-time high-accuracy device GPS position and reverse geocodes it.
 *
 * Implements full attendance flow:
 *   1. "Requesting location from browser..."
 *   2. "Refining accuracy..."
 *   3. "Finding your area..."
 *   4. "Location verified"
 *
 * Separates location acquisition from attendance distance / geofence validation.
 */
export async function getFreshExecutiveLocation(arg1 = null, arg2 = null) {
  let exec = null;
  let onProgress = null;
  let timeout = 45000;

  if (arg1 && typeof arg1 === "object" && ("onProgress" in arg1 || "exec" in arg1)) {
    exec = arg1.exec || null;
    onProgress = typeof arg1.onProgress === "function" ? arg1.onProgress : null;
    if (arg1.timeout) timeout = arg1.timeout;
  } else {
    exec = arg1;
    if (typeof arg2 === "function") onProgress = arg2;
  }

  if (onProgress) onProgress("Requesting location from browser…");

  try {
    // Start parallel compass heading capture
    const headingPromise = getDeviceHeadingAsync(1000);

    const gps = await getDeviceGpsPosition({
      timeout,
      enableHighAccuracy: true,
      maximumAge: 0,
      onProgress,
    });

    const detectedHeading = gps.heading != null ? gps.heading : await headingPromise;

    if (onProgress) onProgress("Finding your area and address…");

    // Only perform reverse geocoding after valid coordinates are received
    const geo = await reverseGeocodeCoordinates(gps.latitude, gps.longitude, exec);

    const latVal = gps.latitude;
    const lngVal = gps.longitude;
    const accVal = gps.accuracy;
    const accText = `${accVal} meters`;
    const locTimestamp = new Date().toISOString();
    const accEvaluation = evaluateLocationAccuracy(accVal);

    // Resolve address components
    const area = geo?.area || "";
    const city = geo?.city || "";
    const district = geo?.district || "";
    const state = geo?.state || "";
    const pincode = geo?.pincode || "";
    const country = geo?.country || "India";

    const cleanParts = [];
    if (area) cleanParts.push(area);
    if (city && !cleanParts.some((p) => p.toLowerCase() === city.toLowerCase())) {
      cleanParts.push(city);
    }
    if (state && !cleanParts.some((p) => p.toLowerCase() === state.toLowerCase())) {
      cleanParts.push(state);
    }
    const formattedAddress = cleanParts.length > 0 ? cleanParts.join(", ") : `${latVal.toFixed(6)}, ${lngVal.toFixed(6)}`;
    const displayAddress = pincode ? `${formattedAddress} - ${pincode}` : formattedAddress;
    const full_address =
      geo?.full_address ||
      (pincode
        ? `${formattedAddress} - ${pincode}, ${country}`
        : `${formattedAddress}, ${country}`);

    // Business Requirement: Sales Executives can punch from ANY location.
    // There is NO fixed office, NO branch geofence, and NO office distance restriction.
    // The 500-meter value is strictly the maximum acceptable GPS/location accuracy threshold.
    const canPunch = accEvaluation.canPunch;

    if (onProgress) {
      if (accVal <= TARGET_LOCATION_ACCURACY_METERS) {
        onProgress("Location verified");
      } else if (canPunch) {
        onProgress("Location accuracy is low but acceptable");
      } else {
        onProgress("Location accuracy is too low");
      }
    }

    // Location source designation
    const isWindows = typeof navigator !== "undefined" && /windows/i.test(navigator.userAgent);
    const locationSource = isWindows ? "WINDOWS_LOCATION" : "BROWSER_GEOLOCATION";

    return {
      status: "success",
      success: true,
      latitude: latVal,
      longitude: lngVal,
      lat: latVal,
      lng: lngVal,
      accuracy: accVal,
      location_accuracy: accVal,
      accuracyText: accText,
      accuracyEvaluation: accEvaluation,
      isAccurate: accEvaluation.canPunch,
      isLocationVerified: accEvaluation.isPrecise,
      canPunch,
      heading: detectedHeading,
      hasHeading: detectedHeading != null && !isNaN(detectedHeading),
      location_source: locationSource,
      isLowAccuracy: !accEvaluation.isPrecise,
      lowAccuracyWarning: !accEvaluation.canPunch ? accEvaluation.statusMessage : null,
      area,
      accurateArea: area,
      sublocality: area,
      landmark: "",
      street: "",
      suburb: area,
      city,
      district,
      state,
      region: state,
      pincode,
      country,
      formattedAddress,
      displayAddress,
      full_address,
      locality: displayAddress,
      error: null,
      timestamp: gps.timestamp || Date.now(),
      location_timestamp: locTimestamp,
      captured_at: locTimestamp,
    };
  } catch (err) {
    const mapped = mapGeolocationError(err);
    const errorMsg = mapped.message;

    if (onProgress) onProgress(`Error: ${errorMsg}`);

    return {
      status: "error",
      success: false,
      errorCode: mapped.code || "GPS_ERROR",
      nativeCode: mapped.nativeCode,
      error: errorMsg,
      message: errorMsg,
      detailedGuidance: mapped.detailedGuidance,
      accuracyWarning: errorMsg,
      accuracyEvaluation: evaluateLocationAccuracy(null),
      latitude: null,
      longitude: null,
      lat: null,
      lng: null,
      accuracy: null,
      location_accuracy: null,
      distance: null,
      allowedRadius: 500,
      isWithinRadius: false,
      heading: null,
      hasHeading: false,
      accuracyText: "GPS Unavailable",
      isAccurate: false,
      isLocationVerified: false,
      canPunch: false,
      location_source: null, // Zero fallback to fake WINDOWS_LOCATION when failed!
      isLowAccuracy: false,
      lowAccuracyWarning: null,
      area: "",
      accurateArea: "",
      sublocality: "",
      landmark: "",
      street: "",
      suburb: "",
      city: "",
      district: "",
      state: "",
      region: "",
      pincode: "",
      country: "India",
      formattedAddress: "",
      displayAddress: "",
      full_address: "",
      locality: "",
      timestamp: Date.now(),
      location_timestamp: null,
      captured_at: null,
    };
  }
}


/**
 * Universal Formatter: Formats any location into Area Name, City Name, State Name.
 * Strictly NEVER injects mock or default locations.
 */
export function formatExecutiveLocation(loc, exec = null) {
  if (!loc) return "";

  if (typeof loc === "object") {
    const area = loc.area || loc.accurateArea || loc.suburb || loc.neighbourhood || loc.locality || "";
    const city = loc.city || "";
    const state = loc.state || loc.region || "";

    const cleanParts = [];
    if (area && area !== "Field Area") cleanParts.push(area);
    if (city && city !== "Field City" && !cleanParts.some((p) => p.toLowerCase() === city.toLowerCase())) {
      cleanParts.push(city);
    }
    if (state && state !== "Field State" && !cleanParts.some((p) => p.toLowerCase() === state.toLowerCase())) {
      cleanParts.push(state);
    }

    if (cleanParts.length >= 1) {
      return cleanParts.join(", ");
    }

    const raw = loc.displayAddress || loc.formattedAddress || loc.full_address || "";
    if (raw && !raw.includes("Field Location")) return formatLocationString(raw, exec);
    return "";
  }

  return formatLocationString(String(loc), exec);
}

export function formatLocationString(str, exec = null) {
  if (!str) return "";

  const s = String(str).trim();
  if (
    !s ||
    s === "—" ||
    s.toLowerCase() === "null" ||
    s.toLowerCase() === "undefined" ||
    s.includes("Field Location") ||
    s.includes("GPS Required")
  ) {
    return "";
  }

  // Split parts
  const rawParts = s.split(",").map((p) => p.trim()).filter(Boolean);
  // Remove postal codes or "India"
  const parts = rawParts.filter((p) => !/^\d{5,6}$/.test(p) && p.toLowerCase() !== "india");

  if (parts.length >= 3) {
    return `${parts[parts.length - 3]}, ${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
  }

  if (parts.length === 2) {
    return `${parts[0]}, ${parts[1]}`;
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return s;
}

// Backward compatibility helper
export async function resolveAreaFromCoords(lat, lng) {
  const res = await reverseGeocodeCoordinates(lat, lng);
  return {
    area: res.area,
    city: res.city,
    state: res.state,
    pincode: res.pincode,
    label: res.displayAddress,
  };
}

export async function resolveAreaLabel(lat, lng) {
  const res = await reverseGeocodeCoordinates(lat, lng);
  return res.displayAddress;
}
