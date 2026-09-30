// Shared reverse-geocoding helper used by the punch-in modal and the
// attendance view.
//
// Why this exists: BigDataCloud's `localityInfo.informative` list mixes
// administrative areas with geographic features (river basins, lakes,
// time zones...). The old code took the LAST entry of that list, which is how
// "Kaveri River Basin" ended up as the executive's "area". This helper only
// uses real place fields (suburb / neighbourhood / locality / city / state).

const NOT_A_PLACE =
  /(river|basin|watershed|catchment|drainage|lake|reservoir|ocean|\bsea\b|\bbay\b|time ?zone|continent|country|biosphere|plateau|desert|postcode|postal|\bzip\b)/i;

const clean = (v) => (typeof v === "string" ? v.trim() : "");
const isPlace = (v) => !!clean(v) && !NOT_A_PLACE.test(v);

async function fetchJson(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// OpenStreetMap Nominatim: best source for neighbourhood / suburb names.
async function lookupNominatim(lat, lng) {
  const data = await fetchJson(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&zoom=18&addressdetails=1&accept-language=en`
  );
  const a = data?.address;
  if (!a) return null;

  const area = [
    a.suburb,
    a.neighbourhood,
    a.quarter,
    a.city_district,
    a.residential,
    a.hamlet,
    a.village,
    a.road,
  ].find(isPlace);

  const city = [a.city, a.town, a.municipality, a.county, a.state_district].find(isPlace);

  return { area: clean(area), city: clean(city), state: clean(a.state) };
}

// BigDataCloud: fast, CORS-friendly. We use ONLY its real place fields and
// an allow-list of the `informative` entries (never geographic features).
async function lookupBigDataCloud(lat, lng) {
  const data = await fetchJson(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
  );
  if (!data) return null;

  let area = isPlace(data.locality) ? clean(data.locality) : "";
  if (!area) {
    const wanted = /(neighbo|suburb|quarter|ward|locality|village|sub-?district|taluk|tehsil|mandal)/i;
    const hit = (data.localityInfo?.informative || [])
      .slice()
      .reverse()
      .find((i) => wanted.test(i.description || "") && isPlace(i.name));
    area = hit ? clean(hit.name) : "";
  }

  return {
    area,
    city: isPlace(data.city) ? clean(data.city) : "",
    state: clean(data.principalSubdivision),
  };
}

// Very coarse last resort (city only) when both web lookups fail.
function coarseCity(lat, lng) {
  if (lat >= 12.8 && lat <= 13.2 && lng >= 77.4 && lng <= 77.8) return { city: "Bengaluru", state: "Karnataka" };
  if (lat >= 12.9 && lat <= 13.25 && lng >= 80.1 && lng <= 80.35) return { city: "Chennai", state: "Tamil Nadu" };
  if (lat >= 17.3 && lat <= 17.55 && lng >= 78.3 && lng <= 78.6) return { city: "Hyderabad", state: "Telangana" };
  if (lat >= 18.9 && lat <= 19.3 && lng >= 72.75 && lng <= 73.0) return { city: "Mumbai", state: "Maharashtra" };
  return null;
}

/**
 * Resolve GPS coordinates to { area, city, state, label }.
 * label = "Area, City, State" (duplicates removed), or "" if nothing found.
 */
export async function resolveAreaFromCoords(lat, lng) {
  const [osm, bdc] = await Promise.all([lookupNominatim(lat, lng), lookupBigDataCloud(lat, lng)]);

  let city = osm?.city || bdc?.city || "";
  let state = osm?.state || bdc?.state || "";
  let area = osm?.area || bdc?.area || "";

  if (!city && !area) {
    const coarse = coarseCity(lat, lng);
    if (coarse) {
      city = coarse.city;
      state = state || coarse.state;
    }
  }

  const same = (x, y) => x.toLowerCase() === y.toLowerCase();
  if (area && (same(area, city) || same(area, state))) area = "";
  if (city && same(city, state)) city = "";

  const label = [area, city, state].filter(Boolean).join(", ");
  return { area, city, state, label };
}

// Convenience wrapper that returns only the display string.
export async function resolveAreaLabel(lat, lng) {
  return (await resolveAreaFromCoords(lat, lng)).label;
}
