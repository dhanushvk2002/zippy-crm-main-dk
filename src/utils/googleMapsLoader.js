/**
 * src/utils/googleMapsLoader.js
 * Asynchronous, secure loader for Google Maps JavaScript SDK.
 *
 * Requirements:
 * - Reads VITE_GOOGLE_MAPS_API_KEY from frontend environment.
 * - NEVER hardcodes any API key in source code.
 * - Loads Maps JavaScript API with 'places' and 'geometry' libraries.
 * - Handles script load failures and Google Maps authentication errors (gm_authFailure).
 * - Graceful fallback when API key is missing or invalid.
 */

let googleMapsPromise = null;
let googleMapsAuthError = false;

// Global auth failure handler for Google Maps (e.g. invalid key, quota, or billing issue)
if (typeof window !== "undefined") {
  window.gm_authFailure = () => {
    console.warn(
      "[Google Maps] Authentication failure: The provided Google Maps API key is invalid, lacks billing, or is restricted."
    );
    googleMapsAuthError = true;
    window.dispatchEvent(new CustomEvent("google_maps_auth_failure"));
  };
}

/**
 * Returns true if Google Maps has encountered an authentication error.
 */
export function hasGoogleMapsAuthError() {
  return googleMapsAuthError;
}

/**
 * Retrieves the configured Google Maps API Key from Vite environment variables.
 */
export function getGoogleMapsApiKey() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key || key === "YOUR_GOOGLE_MAPS_API_KEY" || key === "YOUR_API_KEY_HERE") {
    return "";
  }
  return key.trim();
}

/**
 * Loads the Google Maps JavaScript API dynamically.
 * Resolves with `window.google.maps` once ready.
 */
export function loadGoogleMaps() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only be loaded in a browser environment."));
  }

  // If already loaded and operational
  if (window.google && window.google.maps && window.google.maps.Map) {
    return Promise.resolve(window.google.maps);
  }

  // Return existing in-flight promise if any
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return Promise.reject(
      new Error(
        "VITE_GOOGLE_MAPS_API_KEY is not configured in frontend .env file. Please configure your Google Maps API key."
      )
    );
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById("google-maps-js-sdk");
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.google?.maps) resolve(window.google.maps);
        else reject(new Error("Google Maps SDK loaded but window.google.maps is undefined."));
      });
      existingScript.addEventListener("error", () => {
        reject(new Error("Failed to load Google Maps script from Google servers."));
      });
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-js-sdk";
    script.type = "text/javascript";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places,geometry&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      // Check if google.maps is defined
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error("Google Maps object not found after script execution."));
      }
    };

    script.onerror = () => {
      googleMapsPromise = null;
      reject(new Error("Failed to load Google Maps script. Please check network connection and API key."));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}
