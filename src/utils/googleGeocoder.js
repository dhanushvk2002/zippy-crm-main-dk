/**
 * src/utils/googleGeocoder.js
 * Reverse geocoding and location place searching using Google Maps Geocoding & Places API,
 * with multi-tiered fallback to backend reverse geocode service.
 *
 * Rules:
 * - Dynamically resolves Village, Taluk, Area, City, District, State, Country, PIN Code.
 * - Rural hierarchy: Village → Taluk → District → State
 * - Urban hierarchy: Area → City → District → State
 * - Never hardcodes any real location (e.g. Kalathiyur, Tirupattur, Bengaluru, etc.).
 * - Resolves all fields dynamically from geocoder response components.
 */

import { reverseGeocodeLocation, searchLocationPlaces } from "./location.js";

/**
 * Parses Google Maps Geocoder result array into clean, structured address fields.
 */
export function parseGoogleGeocodeResult(results) {
  if (!results || !Array.isArray(results) || results.length === 0) {
    return null;
  }

  // Aggregate address components from results, preserving most specific to general
  const allComponents = [];
  const seenKeys = new Set();

  for (const res of results) {
    if (Array.isArray(res.address_components)) {
      for (const comp of res.address_components) {
        const types = Array.isArray(comp.types) ? comp.types : [];
        const key = types.join("|") + ":" + (comp.long_name || comp.short_name);
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          allComponents.push(comp);
        }
      }
    }
  }

  const getComponent = (types, useShort = false) => {
    for (const t of types) {
      const match = allComponents.find(
        (c) => Array.isArray(c.types) && c.types.includes(t)
      );
      if (match) {
        const val = useShort ? match.short_name || match.long_name : match.long_name || match.short_name;
        return val ? String(val).trim() : "";
      }
    }
    return "";
  };

  const pincode = getComponent(["postal_code"]);
  const country = getComponent(["country"]) || "India";
  const state = getComponent(["administrative_area_level_1"]);
  let district = getComponent(["administrative_area_level_2"]);
  const taluk = getComponent(["administrative_area_level_3"]);
  const locality = getComponent(["locality"]);
  const postalTown = getComponent(["postal_town"]);
  const sublocality1 = getComponent(["sublocality_level_1"]);
  const sublocality2 = getComponent(["sublocality_level_2"]);
  const sublocality3 = getComponent(["sublocality_level_3"]);
  const sublocality = getComponent(["sublocality"]) || sublocality1 || sublocality2 || sublocality3;
  const neighborhood = getComponent(["neighborhood"]);
  const route = getComponent(["route"]); // Street / road name
  const streetNumber = getComponent(["street_number"]);
  const premise = getComponent(["premise", "subpremise"]);

  // Clean district name (e.g. "Tirupattur District" -> "Tirupattur")
  if (district) {
    district = district.replace(/\s+District$/i, "").trim();
  }

  // 1. Street Name from street_number + route
  const street = [streetNumber, route].filter(Boolean).join(" ") || route || "";

  // 2. Area Name from neighborhood / sublocality / premise (NEVER city!)
  let areaOnly = sublocality1 || neighborhood || sublocality2 || sublocality3 || sublocality || premise || "";

  // 3. City from locality or postal_town
  let city = locality || postalTown || "";
  let village = "";

  // Dynamic Rural vs. Urban Address Hierarchy Resolution
  if (taluk && locality && taluk.toLowerCase() !== locality.toLowerCase() && !city) {
    village = locality;
  }

  // STRICT RULE: NEVER use city as area or village
  if (city) {
    if (areaOnly && areaOnly.toLowerCase() === city.toLowerCase()) {
      areaOnly = "";
    }
    if (village && village.toLowerCase() === city.toLowerCase()) {
      village = "";
    }
  }

  let areaStreet = "";
  if (areaOnly && street && areaOnly.toLowerCase() !== street.toLowerCase()) {
    areaStreet = `${areaOnly}, ${street}`;
  } else {
    areaStreet = areaOnly || street || village || "";
  }

  // Format a clean, human-readable display address in strict hierarchy order without duplicates:
  // AREA -> STREET -> TALUK -> CITY -> DISTRICT -> STATE - PIN CODE -> COUNTRY
  const parts = [];
  const seen = new Set();
  const addPart = (val) => {
    if (!val) return;
    const cleaned = String(val).trim().replace(/^,+|,+$/g, "");
    if (!cleaned) return;
    const norm = cleaned.toLowerCase();
    if (!seen.has(norm)) {
      seen.add(norm);
      parts.push(cleaned);
    }
  };

  addPart(areaOnly || village);
  addPart(street);
  addPart(taluk);
  addPart(city);
  addPart(district);
  if (state && pincode) {
    parts.push(`${state.trim()} - ${pincode.trim()}`);
    seen.add(state.trim().toLowerCase());
    seen.add(pincode.trim().toLowerCase());
  } else if (state) {
    addPart(state);
  } else if (pincode) {
    addPart(pincode);
  }
  if (country) {
    addPart(country);
  }

  const displayAddress = parts.join(", ");
  const rawFormatted = results[0]?.formatted_address || displayAddress;

  return {
    street: street.trim(),
    route: route.trim(),
    area: areaOnly.trim(),
    areaStreet: areaStreet.trim(),
    area_street: areaStreet.trim(),
    village: village.trim(),
    taluk: taluk.trim(),
    city: city.trim(),
    district: district.trim(),
    state: state.trim(),
    country: country.trim() || "India",
    pincode: pincode.trim(),
    pin: pincode.trim(),
    formattedAddress: displayAddress || rawFormatted,
    displayAddress: displayAddress || rawFormatted,
    fullAddress: rawFormatted || displayAddress,
  };
}

/**
 * Reverse geocodes coordinates (latitude, longitude) into structured address fields.
 * Tries backend reverse-geocode service first (which combines BigDataCloud + Nominatim);
 * then Google Maps Geocoder if available; with safe coordinate fallback.
 */
export async function reverseGeocodeCoordinates(lat, lng) {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
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
      country: "India",
      pincode: "",
      pin: "",
      formattedAddress: "",
      displayAddress: "",
      fullAddress: "",
    };
  }

  const numericLat = Number(lat);
  const numericLng = Number(lng);

  // 1. Primary: Backend reverse geocoding service (BDC + Nominatim fallback & strict hierarchy)
  try {
    const backendRes = await reverseGeocodeLocation(numericLat, numericLng);
    if (backendRes && (backendRes.area || backendRes.city || backendRes.district)) {
      return backendRes;
    }
  } catch (backendErr) {
    console.warn("[Reverse Geocode] Backend fetch error, trying client geocoder:", backendErr?.message);
  }

  // 2. Fallback: Google Maps Geocoder if Google Maps SDK is loaded in window
  if (window.google?.maps?.Geocoder) {
    try {
      const parsed = await new Promise((resolve, reject) => {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode(
          { location: { lat: numericLat, lng: numericLng } },
          (results, status) => {
            if (status === "OK" && results && results.length > 0) {
              const res = parseGoogleGeocodeResult(results);
              resolve(res);
            } else {
              reject(new Error(`Google Geocoder status: ${status}`));
            }
          }
        );
      });

      if (parsed) {
        return parsed;
      }
    } catch (googleErr) {
      console.warn("[Reverse Geocode] Google Geocoder notice:", googleErr?.message);
    }
  }

  const coordStr = `${numericLat.toFixed(6)}, ${numericLng.toFixed(6)}`;
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
    country: "India",
    pincode: "",
    pin: "",
    formattedAddress: coordStr,
    displayAddress: coordStr,
    fullAddress: coordStr,
  };
}

/**
 * Searches locations matching a query string using Google Places / Geocoder with fallback.
 */
export async function searchLocationsWithGoogle(query) {
  if (!query || typeof query !== "string" || query.trim().length < 2) {
    return [];
  }

  const cleanQuery = query.trim();

  // 1. Google Maps Geocoder lookup
  if (window.google?.maps?.Geocoder) {
    try {
      const results = await new Promise((resolve, reject) => {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode(
          {
            address: cleanQuery,
            componentRestrictions: { country: "IN" },
          },
          (resList, status) => {
            if (status === "OK" && resList && resList.length > 0) {
              resolve(resList);
            } else {
              reject(new Error(`Google Geocoder status: ${status}`));
            }
          }
        );
      });

      if (Array.isArray(results) && results.length > 0) {
        return results.map((item) => {
          const latVal = item.geometry.location.lat();
          const lngVal = item.geometry.location.lng();
          const parsed = parseGoogleGeocodeResult([item]);
          return {
            display_name: parsed?.displayAddress || item.formatted_address,
            formatted_address: item.formatted_address,
            latitude: latVal,
            longitude: lngVal,
            village: parsed?.village || "",
            taluk: parsed?.taluk || "",
            area: parsed?.area || parsed?.village || "",
            city: parsed?.city || "",
            district: parsed?.district || "",
            state: parsed?.state || "",
            country: parsed?.country || "India",
            pincode: parsed?.pincode || "",
          };
        });
      }
    } catch (googleSearchErr) {
      console.warn("[Place Search] Google Maps Geocoder search notice:", googleSearchErr?.message);
    }
  }

  // 2. Fallback to existing searchLocationPlaces
  return searchLocationPlaces(cleanQuery);
}
