/**
 * geoUtils.js — Ultra-Accurate GPS Geolocation & Reverse Geocoding Utility
 *
 * Implements high-accuracy device GPS tracking and multi-source reverse geocoding
 * according to enterprise field tracking requirements:
 *   - Device GPS via navigator.geolocation with enableHighAccuracy: true, timeout: 15000, maximumAge: 0
 *   - Field normalization:
 *       Area:     neighbourhood → suburb → locality → village → quarter → hamlet → residential → road
 *       City:     city → town → municipality → city_district
 *       District: district → state_district → county
 *       State:    state → principalSubdivision
 *       Pincode:  postcode → postalCode
 *       Country:  country → countryName
 *   - Clean UI formatting: Area, City, State, Pincode (e.g. BTM Layout, Bengaluru, Karnataka, 560076)
 *   - Strict accuracy checking (coords.accuracy threshold and display: ±X meters)
 *   - No hardcoded cities, no IP address overrides as primary.
 */

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

    return { area, city, district, state, pincode, country, raw: data };
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

    return { area, city, district, state, pincode, country, raw: data };
  } catch {
    return null;
  }
}

/**
 * Reverse Geocoding Provider 3: Backend Server Proxy (/reverse-geocode)
 * Serves as an additional high-availability fallback if third-party APIs are blocked by client firewall.
 */
async function lookupBackendProxy(lat, lng) {
  try {
    const data = await fetchWithTimeout(
      `${API_BASE}/reverse-geocode?lat=${lat}&lng=${lng}`,
      {},
      5000
    );
    if (data && (data.area || data.city || data.state)) {
      return {
        area: clean(data.area),
        city: clean(data.city),
        district: clean(data.district),
        state: clean(data.state),
        pincode: clean(data.pincode),
        country: clean(data.country),
      };
    }
  } catch {}
  return null;
}

/**
 * Resolves GPS coordinates (lat, lng) into detailed address fields:
 * { area, city, district, state, pincode, country, formattedAddress, displayAddress }
 */
export async function reverseGeocodeCoordinates(lat, lng) {
  if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) {
    return {
      area: "",
      city: "",
      district: "",
      state: "",
      pincode: "",
      country: "",
      formattedAddress: "",
      displayAddress: "",
    };
  }

  // Query providers in parallel
  const [osm, bdc, server] = await Promise.all([
    lookupNominatim(lat, lng),
    lookupBigDataCloud(lat, lng),
    lookupBackendProxy(lat, lng),
  ]);

  // Merge with priority: OSM -> BDC -> Server
  const area = osm?.area || bdc?.area || server?.area || "";
  const city = osm?.city || bdc?.city || server?.city || "";
  const district = osm?.district || bdc?.district || server?.district || "";
  const state = osm?.state || bdc?.state || server?.state || "";
  const pincode = osm?.pincode || bdc?.pincode || server?.pincode || "";
  const country = osm?.country || bdc?.country || server?.country || "India";

  // Prevent duplicate components in display string (e.g., area == city)
  const same = (a, b) => clean(a).toLowerCase() === clean(b).toLowerCase();

  const finalArea = area && !same(area, city) && !same(area, state) ? area : "";
  const finalCity = city && !same(city, state) ? city : (same(area, city) ? area : city);
  const finalDistrict = district && !same(district, finalCity) && !same(district, state) ? district : "";
  const finalState = state;
  const finalPincode = pincode ? pincode.replace(/\D/g, "").slice(0, 6) : "";

  // Standard clean format: Area, City, State, Pincode
  // Example: BTM Layout, Bengaluru, Karnataka, 560076
  const parts = [];
  if (finalArea) parts.push(finalArea);
  if (finalCity && !parts.includes(finalCity)) parts.push(finalCity);
  if (finalState && !parts.includes(finalState)) parts.push(finalState);
  if (finalPincode) parts.push(finalPincode);

  const formattedAddress = parts.join(", ");

  // Alternative hyphen display: Area, City, State - Pincode
  let displayAddress = formattedAddress;
  if (finalPincode) {
    const withoutPin = [finalArea, finalCity, finalState].filter(Boolean).join(", ");
    displayAddress = withoutPin ? `${withoutPin} - ${finalPincode}` : finalPincode;
  }

  return {
    area: finalArea || finalCity || "Field Location",
    city: finalCity,
    district: finalDistrict,
    state: finalState,
    pincode: finalPincode,
    country,
    formattedAddress: formattedAddress || "Field Location",
    displayAddress: displayAddress || "Field Location",
  };
}

/**
 * Obtains current GPS coordinates directly from device Geolocation API.
 * Uses strict options: { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
 *
 * Rejects or warns if accuracy is unacceptably poor.
 */
export function getDeviceGpsPosition({
  timeout = 15000,
  enableHighAccuracy = true,
  maximumAge = 0,
} = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({
        code: "UNSUPPORTED",
        message: "Geolocation is not supported by your browser or device.",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const latVal = parseFloat(latitude.toFixed(6));
        const lngVal = parseFloat(longitude.toFixed(6));
        const accVal = Math.round(accuracy);

        // Check if accuracy is very poor (> 2500 meters)
        const isPoorAccuracy = accVal > 2500;
        const accuracyWarning = isPoorAccuracy
          ? "Unable to get an accurate location. Please enable GPS/location services and try again."
          : null;

        resolve({
          latitude: latVal,
          longitude: lngVal,
          accuracy: accVal,
          accuracyText: `±${accVal} meters`,
          isPoorAccuracy,
          accuracyWarning,
          timestamp: pos.timestamp || Date.now(),
        });
      },
      (err) => {
        let msg = "Unable to acquire GPS location.";
        let errCode = "ERROR";

        if (err.code === 1) {
          errCode = "PERMISSION_DENIED";
          msg = "Location permission was denied. Please allow location access in your browser to check in.";
        } else if (err.code === 2) {
          errCode = "POSITION_UNAVAILABLE";
          msg = "GPS signal is currently unavailable. Please enable device location services and try again.";
        } else if (err.code === 3) {
          errCode = "TIMEOUT";
          msg = "Location request timed out. Please check your GPS signal and retry.";
        }

        reject({
          code: errCode,
          message: msg,
          rawError: err,
        });
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );
  });
}

/**
 * Main function: Obtains fresh high-accuracy device GPS position and reverse geocodes it.
 *
 * Returns a complete location object with:
 *   - latitude, longitude
 *   - area, city, district, state, pincode, country
 *   - formattedAddress, displayAddress
 *   - accuracy, accuracyText, isAccurate
 */
export async function getFreshExecutiveLocation() {
  try {
    const gps = await getDeviceGpsPosition({ timeout: 15000, enableHighAccuracy: true, maximumAge: 0 });
    const geo = await reverseGeocodeCoordinates(gps.latitude, gps.longitude);

    const fullResult = {
      latitude: gps.latitude,
      longitude: gps.longitude,
      lat: gps.latitude,
      lng: gps.longitude,
      accuracy: gps.accuracy,
      accuracyText: gps.accuracyText,
      isAccurate: !gps.isPoorAccuracy,
      accuracyWarning: gps.accuracyWarning,
      area: geo.area,
      city: geo.city,
      district: geo.district,
      state: geo.state,
      pincode: geo.pincode,
      country: geo.country,
      formattedAddress: geo.formattedAddress,
      displayAddress: geo.displayAddress,
      locality: geo.displayAddress, // for compatibility
      status: "locked",
      error: gps.accuracyWarning || null,
      timestamp: gps.timestamp,
    };

    return fullResult;
  } catch (err) {
    return {
      latitude: null,
      longitude: null,
      lat: null,
      lng: null,
      accuracy: null,
      accuracyText: "Unavailable",
      isAccurate: false,
      area: "",
      city: "",
      district: "",
      state: "",
      pincode: "",
      country: "",
      formattedAddress: "Location Unavailable",
      displayAddress: "Location Unavailable",
      locality: "Location Unavailable",
      status: "error",
      error: err.message || "Failed to obtain GPS location. Please check device permissions.",
    };
  }
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
