import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MapPin,
  Search,
  Crosshair,
  CheckCircle,
  X,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Navigation,
  RotateCw,
  Compass,
  Plus,
  Minus,
} from "lucide-react";
import { loadGoogleMaps, getGoogleMapsApiKey, hasGoogleMapsAuthError } from "../utils/googleMapsLoader.js";
import { reverseGeocodeCoordinates, searchLocationsWithGoogle } from "../utils/googleGeocoder.js";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./LocationMapModal.css";

// SVG Pin Icon for Leaflet Fallback
const createLeafletPinIcon = () =>
  L.divIcon({
    className: "custom-map-marker-pin",
    html: `
      <div class="pin-svg-wrap">
        <svg width="34" height="46" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.37258 0 0 5.37258 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37258 18.6274 0 12 0Z" fill="#dc2626" stroke="#ffffff" stroke-width="2"/>
          <circle cx="12" cy="12" r="4.5" fill="#ffffff"/>
        </svg>
      </div>
    `,
    iconSize: [34, 46],
    iconAnchor: [17, 46],
  });

// SVG Icons matching Google Maps Controls
const TargetGpsIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="2.2" fill="currentColor" />
    <line x1="12" y1="1" x2="12" y2="4" />
    <line x1="12" y1="20" x2="12" y2="23" />
    <line x1="1" y1="12" x2="4" y2="12" />
    <line x1="20" y1="12" x2="23" y2="12" />
  </svg>
);

const PegmanIcon = ({ active = false }) => (
  <svg width="18" height="23" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="6" r="4.2" fill="#F59E0B" stroke="#B45309" strokeWidth="0.8" />
    <path d="M10 10.5 L12 13 L14 10.5 Z" fill="#DC2626" />
    <path d="M7 11.5 C7 11.5, 9 10.5, 12 10.5 C15 10.5, 17 11.5, 17 11.5 L18 20 L15.5 20 L15 15 L14 15 L14.5 28 L12.5 28 L12 21 L11.5 21 L11 28 L9 28 L9.5 15 L8.5 15 L8 20 L5.5 20 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="0.8" />
  </svg>
);

const TerrainLayerIcon = ({ active }) => (
  <svg width="34" height="34" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="gmap-layer-thumb-svg">
    <rect width="40" height="40" rx="8" fill="#758279" />
    <path d="M0 24C10 20 20 28 40 18V40H0V24Z" fill="#5A675E" />
    <path d="M0 32C12 28 24 35 40 28V40H0V32Z" fill="#445048" />
    <path d="M38 12C28 20 20 10 12 20C6 27 0 25 0 25" stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" />
  </svg>
);

const TrafficLayerIcon = ({ active }) => (
  <svg width="34" height="34" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="gmap-layer-thumb-svg">
    <rect width="40" height="40" rx="8" fill="#E5E7EB" />
    <rect x="15" y="0" width="10" height="40" fill="#9CA3AF" />
    <rect x="0" y="15" width="40" height="10" fill="#9CA3AF" />
    <path d="M18 0V15C18 18 18 18 0 18" stroke="#10B981" strokeWidth="3.2" strokeLinecap="round" />
    <path d="M22 40V25C22 22 22 22 40 22" stroke="#EF4444" strokeWidth="3.2" strokeLinecap="round" />
    <path d="M22 0V14" stroke="#10B981" strokeWidth="3.2" />
    <path d="M18 40V26" stroke="#F59E0B" strokeWidth="3.2" />
  </svg>
);

const TransitLayerIcon = ({ active }) => (
  <svg width="34" height="34" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="gmap-layer-thumb-svg">
    <rect width="40" height="40" rx="8" fill="#E2E8F0" />
    <path d="M0 16L40 12" stroke="#3B82F6" strokeWidth="2.8" strokeLinecap="round" />
    <path d="M0 25L40 21" stroke="#8B5CF6" strokeWidth="2.8" strokeLinecap="round" />
    <rect x="23" y="4" width="13" height="12" rx="2.5" fill="#1D4ED8" />
    <text x="29.5" y="13.5" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="sans-serif">M</text>
    <rect x="18" y="22" width="13" height="12" rx="2.5" fill="#2563EB" />
    <rect x="20.5" y="24" width="8" height="6.5" rx="1.2" fill="#FFFFFF" />
    <circle cx="22" cy="32.5" r="1" fill="#FFFFFF" />
    <circle cx="27" cy="32.5" r="1" fill="#FFFFFF" />
  </svg>
);

const BikingLayerIcon = ({ active }) => (
  <svg width="34" height="34" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="gmap-layer-thumb-svg">
    <rect width="40" height="40" rx="8" fill="#E6F4EA" />
    <circle cx="20" cy="20" r="8" stroke="#A7D7B5" strokeWidth="3" />
    <path d="M0 12C12 12 14 18 20 18C26 18 28 12 40 12" stroke="#34A853" strokeWidth="3" strokeLinecap="round" />
    <path d="M12 40C12 28 18 26 18 20" stroke="#34A853" strokeWidth="3" strokeLinecap="round" />
    <path d="M28 40C28 30 24 24 20 20" stroke="#81C995" strokeWidth="2.6" />
  </svg>
);

const MoreLayersIcon = ({ active }) => (
  <svg width="34" height="34" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="gmap-layer-thumb-svg">
    <rect width="40" height="40" rx="8" fill="#F1F3F4" />
    <path d="M20 10L31 16L20 22L9 16L20 10Z" fill="#374151" />
    <path d="M9 20.5L20 26.5L31 20.5" stroke="#374151" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 25.5L20 31.5L31 25.5" stroke="#374151" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MapModeThumbnail = ({ mapType }) => {
  const isSatellite = mapType === "satellite" || mapType === "hybrid";
  return (
    <div className="gmap-type-toggle-thumbnail" title={isSatellite ? "Switch to Map view" : "Switch to Satellite view"}>
      {isSatellite ? (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="8" fill="#F3F4F6" />
          <path d="M0 14H48M0 34H48M14 0V48M34 0V48" stroke="#E5E7EB" strokeWidth="2.5" />
          <path d="M6 24H42M24 6V42" stroke="#FDE047" strokeWidth="3" />
          <rect x="25" y="25" width="15" height="15" rx="2" fill="#BBF7D0" />
        </svg>
      ) : (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="8" fill="#2E4035" />
          <path d="M0 16C16 14 30 24 48 20V48H0V16Z" fill="#1C2D22" />
          <path d="M0 32L48 28" stroke="#E2E8F0" strokeWidth="2.6" />
          <path d="M19 0L25 48" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="3 2" />
          <rect x="6" y="8" width="10" height="12" rx="1.5" fill="#4B6053" />
          <rect x="30" y="10" width="12" height="10" rx="1.5" fill="#3D5044" />
        </svg>
      )}
      <div className="gmap-type-label-pill">
        {isSatellite ? "Map" : "Satellite"}
      </div>
    </div>
  );
};

export default function LocationMapModal({
  isOpen,
  initialCoords = null,
  rawAccuracy = null,
  actionLabel = "Punch In",
  onClose,
  onConfirmLocation,
  title = "Confirm Your Location",
  subtitle = "Verify your attendance location using Google Maps. You can adjust the marker or click 'Use Current Location'.",
}) {
  const mapContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Google Maps Instance References
  const googleMapRef = useRef(null);
  const googleMarkerRef = useRef(null);
  const googleCircleRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Leaflet Fallback References (used only if Google Maps API key is missing or fails)
  const leafletMapRef = useRef(null);
  const leafletMarkerRef = useRef(null);

  // Default coordinate center (fallback: Central India / South India coordinates if none provided)
  const defaultLat = initialCoords?.latitude ?? 12.9716;
  const defaultLng = initialCoords?.longitude ?? 77.5946;

  // Selected Coordinates
  const [coords, setCoords] = useState({
    latitude: defaultLat,
    longitude: defaultLng,
  });

  // Location Accuracy (numeric in meters from navigator.geolocation)
  const [accuracy, setAccuracy] = useState(rawAccuracy ?? null);

  // Location Source: "BROWSER_GPS" | "MAP_CONFIRMED"
  const [locationSource, setLocationSource] = useState(
    rawAccuracy != null && rawAccuracy <= 1000 ? "BROWSER_GPS" : "MAP_CONFIRMED"
  );

  // Structured Address Details (neighborhood/sublocality/route -> AREA+STREET, locality -> CITY, district, state, PIN)
  const [addressDetails, setAddressDetails] = useState({
    street: initialCoords?.street || "",
    area: initialCoords?.area || "",
    areaStreet: initialCoords?.areaStreet || initialCoords?.area_street || initialCoords?.area || initialCoords?.village || "",
    village: initialCoords?.village || "",
    taluk: initialCoords?.taluk || "",
    city: initialCoords?.city || "",
    district: initialCoords?.district || "",
    state: initialCoords?.state || "",
    country: initialCoords?.country || "India",
    pincode: initialCoords?.pincode || initialCoords?.pin || "",
    displayAddress: "Resolving location address...",
    formattedAddress: "",
  });

  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [statusNotice, setStatusNotice] = useState("");
  const [mapEngine, setMapEngine] = useState("loading"); // "google" | "leaflet" | "loading" | "error"
  const [googleKeyNotice, setGoogleKeyNotice] = useState("");
  const [isStreetViewActive, setIsStreetViewActive] = useState(false);

  // Map Layers & Types (Matching User Screenshot)
  const [mapType, setMapType] = useState("roadmap");
  const [isTrafficActive, setIsTrafficActive] = useState(false);
  const [isTransitActive, setIsTransitActive] = useState(false);
  const [isBikingActive, setIsBikingActive] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const trafficLayerRef = useRef(null);
  const transitLayerRef = useRef(null);
  const bikingLayerRef = useRef(null);

  // Clean up references and map instances
  const destroyMaps = useCallback(() => {
    if (googleCircleRef.current) {
      googleCircleRef.current.setMap(null);
      googleCircleRef.current = null;
    }
    if (googleMarkerRef.current) {
      googleMarkerRef.current.setMap(null);
      googleMarkerRef.current = null;
    }
    if (googleMapRef.current) {
      try {
        const sv = googleMapRef.current.getStreetView?.();
        if (sv && sv.getVisible?.()) {
          sv.setVisible(false);
        }
      } catch {}
      googleMapRef.current = null;
    }
    setIsStreetViewActive(false);

    // Clean up layer references
    if (trafficLayerRef.current) {
      try { trafficLayerRef.current.setMap(null); } catch {}
      trafficLayerRef.current = null;
    }
    if (transitLayerRef.current) {
      try { transitLayerRef.current.setMap(null); } catch {}
      transitLayerRef.current = null;
    }
    if (bikingLayerRef.current) {
      try { bikingLayerRef.current.setMap(null); } catch {}
      bikingLayerRef.current = null;
    }
    setIsTrafficActive(false);
    setIsTransitActive(false);
    setIsBikingActive(false);
    setIsMoreMenuOpen(false);
    setMapType("roadmap");

    if (leafletMapRef.current) {
      try {
        leafletMapRef.current.remove();
      } catch {}
      leafletMapRef.current = null;
      leafletMarkerRef.current = null;
    }
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
      destroyMaps();
    };
  }, [isOpen, destroyMaps]);

  // Reverse geocode when coordinates change
  const fetchAddressForCoords = async (lat, lng) => {
    setIsGeocoding(true);
    setStatusNotice("Reverse geocoding selected coordinates...");
    try {
      const geo = await reverseGeocodeCoordinates(lat, lng);
      const cityVal = (geo.city || "").trim();
      let areaVal = (geo.area || "").trim();
      let villageVal = (geo.village || "").trim();

      // STRICT: Never allow city as area or village
      if (cityVal) {
        if (areaVal.toLowerCase() === cityVal.toLowerCase()) areaVal = "";
        if (villageVal.toLowerCase() === cityVal.toLowerCase()) villageVal = "";
      }

      setAddressDetails({
        street: geo.street || geo.route || "",
        route: geo.route || geo.street || "",
        area: areaVal,
        areaStreet: geo.area_street || geo.areaStreet || (areaVal && geo.street ? `${areaVal}, ${geo.street}` : areaVal || geo.street || villageVal || ""),
        village: villageVal,
        taluk: geo.taluk || "",
        city: cityVal,
        district: geo.district || "",
        state: geo.state || "",
        country: geo.country || "India",
        pincode: geo.pincode || geo.pin || "",
        displayAddress: geo.displayAddress || geo.display_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        formattedAddress: geo.formattedAddress || geo.formatted_address || geo.displayAddress || "",
      });
      setStatusNotice("");
    } catch (err) {
      console.warn("[MapModal] Reverse geocode error:", err);
      setStatusNotice("Could not resolve full address details. Coordinates are preserved.");
    } finally {
      setIsGeocoding(false);
    }
  };

  /**
   * Updates map view and marker position for either Google Maps or Leaflet fallback
   */
  const updateMapMarkerPosition = useCallback(
    (lat, lng, acc = null, isBrowserGps = false) => {
      setCoords({ latitude: lat, longitude: lng });

      if (isBrowserGps && acc != null) {
        setAccuracy(Math.round(acc));
        setLocationSource("BROWSER_GPS");
      } else {
        setLocationSource("MAP_CONFIRMED");
      }

      // If Google Maps is active
      if (googleMapRef.current && window.google?.maps) {
        const latLng = new window.google.maps.LatLng(lat, lng);
        googleMapRef.current.panTo(latLng);

        if (googleMarkerRef.current) {
          googleMarkerRef.current.setPosition(latLng);
          googleMarkerRef.current.setDraggable(false);
        } else {
          googleMarkerRef.current = new window.google.maps.Marker({
            position: latLng,
            map: googleMapRef.current,
            draggable: false,
            title: "Current attendance location (Fixed)",
            animation: window.google.maps.Animation.DROP,
          });
        }

        // Draw accuracy circle only for browser GPS with reasonable precision
        if (isBrowserGps && acc && acc <= 1000) {
          if (googleCircleRef.current) {
            googleCircleRef.current.setCenter(latLng);
            googleCircleRef.current.setRadius(acc);
            googleCircleRef.current.setMap(googleMapRef.current);
          } else {
            googleCircleRef.current = new window.google.maps.Circle({
              map: googleMapRef.current,
              center: latLng,
              radius: acc,
              fillColor: acc <= 100 ? "#10b981" : "#f59e0b",
              fillOpacity: 0.15,
              strokeColor: acc <= 100 ? "#059669" : "#d97706",
              strokeOpacity: 0.5,
              strokeWeight: 1.5,
              clickable: false,
            });
          }
        } else if (googleCircleRef.current) {
          googleCircleRef.current.setMap(null);
          googleCircleRef.current = null;
        }
      }

      // If Leaflet fallback is active
      if (leafletMapRef.current) {
        leafletMapRef.current.panTo([lat, lng]);
        if (leafletMarkerRef.current) {
          leafletMarkerRef.current.setLatLng([lat, lng]);
        }
      }
    },
    []
  );

  /**
   * Initializes Leaflet Map as fallback if Google Maps API key is not configured or fails.
   */
  const initLeafletFallback = useCallback(
    (startLat, startLng) => {
      if (!mapContainerRef.current) return;
      destroyMaps();

      try {
        const map = L.map(mapContainerRef.current, {
          center: [startLat, startLng],
          zoom: 16,
          zoomControl: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        const marker = L.marker([startLat, startLng], {
          icon: createLeafletPinIcon(),
          draggable: false,
          title: "Current attendance location (Fixed)",
        }).addTo(map);

        leafletMapRef.current = map;
        leafletMarkerRef.current = marker;
        setMapEngine("leaflet");

        // Leaflet Map Click: update marker, select coordinates, and trigger reverse geocoding
        map.on("click", (e) => {
          if (!e.latlng) return;
          const clickLat = Number(e.latlng.lat.toFixed(7));
          const clickLng = Number(e.latlng.lng.toFixed(7));
          marker.setLatLng([clickLat, clickLng]);
          setCoords({ latitude: clickLat, longitude: clickLng });
          setLocationSource("MAP_CONFIRMED");
          fetchAddressForCoords(clickLat, clickLng);
        });

        setTimeout(() => {
          map.invalidateSize();
        }, 200);
      } catch (err) {
        console.warn("[MapModal] Leaflet initialization error:", err);
        setMapEngine("error");
      }
    },
    [destroyMaps]
  );

  /**
   * Initializes Google Map JavaScript API
   */
  const initGoogleMap = useCallback(
    async (startLat, startLng, initialAcc = null) => {
      if (!mapContainerRef.current) return;

      try {
        setMapEngine("loading");
        const maps = await loadGoogleMaps();
        if (!mapContainerRef.current) return;

        destroyMaps();

        const mapOptions = {
          center: { lat: startLat, lng: startLng },
          zoom: 16,
          zoomControl: false,
          mapTypeControl: false,
          scaleControl: true,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: false,
          mapTypeId: maps.MapTypeId.ROADMAP,
          gestureHandling: "greedy",
        };

        const map = new maps.Map(mapContainerRef.current, mapOptions);
        googleMapRef.current = map;

        // Street View visibility listener
        try {
          const sv = map.getStreetView();
          if (sv) {
            sv.addListener("visible_changed", () => {
              setIsStreetViewActive(Boolean(sv.getVisible()));
            });
          }
        } catch {}

        // Custom marker setup
        const marker = new maps.Marker({
          position: { lat: startLat, lng: startLng },
          map,
          draggable: false,
          title: "Current attendance location (Fixed)",
          animation: maps.Animation.DROP,
        });
        googleMarkerRef.current = marker;

        // Google Maps Map Click: update marker, select coordinates, and trigger reverse geocoding
        map.addListener("click", (e) => {
          if (!e.latLng) return;
          const clickLat = Number(e.latLng.lat().toFixed(7));
          const clickLng = Number(e.latLng.lng().toFixed(7));

          marker.setPosition({ lat: clickLat, lng: clickLng });
          setCoords({ latitude: clickLat, longitude: clickLng });
          setLocationSource("MAP_CONFIRMED");
          if (googleCircleRef.current) {
            googleCircleRef.current.setMap(null);
            googleCircleRef.current = null;
          }
          fetchAddressForCoords(clickLat, clickLng);
        });

        // Accuracy Circle if initial reading was browser GPS
        if (initialAcc && initialAcc <= 1000) {
          googleCircleRef.current = new maps.Circle({
            map,
            center: { lat: startLat, lng: startLng },
            radius: initialAcc,
            fillColor: initialAcc <= 100 ? "#10b981" : "#f59e0b",
            fillOpacity: 0.15,
            strokeColor: initialAcc <= 100 ? "#059669" : "#d97706",
            strokeOpacity: 0.5,
            strokeWeight: 1.5,
            clickable: false,
          });
        }

        // Google Places Autocomplete Search Setup
        if (searchInputRef.current && maps.places) {
          try {
            const autocomplete = new maps.places.Autocomplete(searchInputRef.current, {
              componentRestrictions: { country: "in" },
              fields: ["geometry", "formatted_address", "address_components", "name"],
            });

            autocomplete.addListener("place_changed", () => {
              const place = autocomplete.getPlace();
              if (place?.geometry?.location) {
                const searchLat = Number(place.geometry.location.lat().toFixed(7));
                const searchLng = Number(place.geometry.location.lng().toFixed(7));

                map.panTo({ lat: searchLat, lng: searchLng });
                map.setZoom(16);
                marker.setPosition({ lat: searchLat, lng: searchLng });

                setCoords({ latitude: searchLat, longitude: searchLng });
                setLocationSource("MAP_CONFIRMED");
                if (googleCircleRef.current) {
                  googleCircleRef.current.setMap(null);
                  googleCircleRef.current = null;
                }

                setSearchQuery(place.formatted_address || place.name || "");
                fetchAddressForCoords(searchLat, searchLng);
              }
            });

            autocompleteRef.current = autocomplete;
          } catch (autoErr) {
            console.warn("[MapModal] Places Autocomplete setup notice:", autoErr);
          }
        }

        setMapEngine("google");
        setGoogleKeyNotice("");
      } catch (err) {
        console.warn("[MapModal] Google Maps load failed, switching to fallback:", err?.message);
        setGoogleKeyNotice(
          "Google Maps API key not detected or restricted. Displaying interactive map fallback with active reverse geocoding."
        );
        initLeafletFallback(startLat, startLng);
      }
    },
    [destroyMaps, initLeafletFallback]
  );

  // Handle Zoom In
  const handleZoomIn = useCallback(() => {
    if (googleMapRef.current) {
      const sv = googleMapRef.current.getStreetView?.();
      if (sv && sv.getVisible?.()) {
        sv.setZoom((sv.getZoom() || 1) + 1);
      } else {
        const currentZoom = googleMapRef.current.getZoom() || 16;
        googleMapRef.current.setZoom(Math.min(21, currentZoom + 1));
      }
    } else if (leafletMapRef.current) {
      leafletMapRef.current.zoomIn();
    }
  }, []);

  // Handle Zoom Out
  const handleZoomOut = useCallback(() => {
    if (googleMapRef.current) {
      const sv = googleMapRef.current.getStreetView?.();
      if (sv && sv.getVisible?.()) {
        sv.setZoom(Math.max(0, (sv.getZoom() || 1) - 1));
      } else {
        const currentZoom = googleMapRef.current.getZoom() || 16;
        googleMapRef.current.setZoom(Math.max(1, currentZoom - 1));
      }
    } else if (leafletMapRef.current) {
      leafletMapRef.current.zoomOut();
    }
  }, []);

  // Handle Pegman Street View Toggle
  const handleToggleStreetView = useCallback(() => {
    if (!googleMapRef.current) {
      if (leafletMapRef.current) {
        setStatusNotice("Street View requires Google Maps. Google Maps API is currently loading or unconfigured.");
      }
      return;
    }

    try {
      const sv = googleMapRef.current.getStreetView();
      if (!sv) return;

      if (sv.getVisible()) {
        sv.setVisible(false);
        setIsStreetViewActive(false);
        setStatusNotice("Exited Street View.");
      } else {
        const targetLat = coords.latitude;
        const targetLng = coords.longitude;

        if (window.google?.maps?.StreetViewService) {
          const svService = new window.google.maps.StreetViewService();
          const targetLatLng = new window.google.maps.LatLng(targetLat, targetLng);
          svService.getPanorama(
            {
              location: targetLatLng,
              radius: 200,
              source: window.google.maps.StreetViewSource.DEFAULT,
            },
            (data, status) => {
              if (status === window.google.maps.StreetViewStatus.OK && data?.location?.latLng) {
                sv.setPano(data.location.pano);
                sv.setPov({ heading: 0, pitch: 0 });
                sv.setVisible(true);
                setIsStreetViewActive(true);
                setStatusNotice("Street View activated for this location.");
              } else {
                sv.setPosition(targetLatLng);
                sv.setVisible(true);
                setIsStreetViewActive(true);
                setStatusNotice("Opening Street View near selected location...");
              }
            }
          );
        } else {
          sv.setPosition({ lat: targetLat, lng: targetLng });
          sv.setVisible(true);
          setIsStreetViewActive(true);
        }
      }
    } catch (err) {
      console.warn("Street view toggle error:", err);
    }
  }, [coords.latitude, coords.longitude]);

  // Toggle Map Type between Roadmap and Satellite/Hybrid
  const handleToggleMapType = useCallback(() => {
    const isSat = mapType === "hybrid" || mapType === "satellite";
    const nextType = isSat ? "roadmap" : "hybrid";
    setMapType(nextType);

    if (googleMapRef.current) {
      googleMapRef.current.setMapTypeId(nextType);
      setStatusNotice(nextType === "hybrid" ? "Switched to Satellite view." : "Switched to standard Map view.");
    }
  }, [mapType]);

  // Toggle Terrain Mode
  const handleToggleTerrain = useCallback(() => {
    const nextType = mapType === "terrain" ? "roadmap" : "terrain";
    setMapType(nextType);

    if (googleMapRef.current) {
      googleMapRef.current.setMapTypeId(nextType);
      setStatusNotice(nextType === "terrain" ? "Terrain contours enabled." : "Terrain disabled.");
    }
  }, [mapType]);

  // Toggle Real-Time Traffic Layer
  const handleToggleTraffic = useCallback(() => {
    if (!googleMapRef.current || !window.google?.maps) {
      setStatusNotice("Live traffic requires active Google Maps service.");
      return;
    }

    if (!trafficLayerRef.current) {
      trafficLayerRef.current = new window.google.maps.TrafficLayer();
    }

    if (isTrafficActive) {
      trafficLayerRef.current.setMap(null);
      setIsTrafficActive(false);
      setStatusNotice("Traffic layer disabled.");
    } else {
      trafficLayerRef.current.setMap(googleMapRef.current);
      setIsTrafficActive(true);
      setStatusNotice("Live traffic layer activated (green/yellow/red congestion).");
    }
  }, [isTrafficActive]);

  // Toggle Public Transit Layer
  const handleToggleTransit = useCallback(() => {
    if (!googleMapRef.current || !window.google?.maps) {
      setStatusNotice("Public transit routes require active Google Maps service.");
      return;
    }

    if (!transitLayerRef.current) {
      transitLayerRef.current = new window.google.maps.TransitLayer();
    }

    if (isTransitActive) {
      transitLayerRef.current.setMap(null);
      setIsTransitActive(false);
      setStatusNotice("Transit layer disabled.");
    } else {
      transitLayerRef.current.setMap(googleMapRef.current);
      setIsTransitActive(true);
      setStatusNotice("Public transit lines & stations layer activated.");
    }
  }, [isTransitActive]);

  // Toggle Bicycling Routes Layer
  const handleToggleBiking = useCallback(() => {
    if (!googleMapRef.current || !window.google?.maps) {
      setStatusNotice("Biking routes require active Google Maps service.");
      return;
    }

    if (!bikingLayerRef.current) {
      bikingLayerRef.current = new window.google.maps.BicyclingLayer();
    }

    if (isBikingActive) {
      bikingLayerRef.current.setMap(null);
      setIsBikingActive(false);
      setStatusNotice("Biking routes layer disabled.");
    } else {
      bikingLayerRef.current.setMap(googleMapRef.current);
      setIsBikingActive(true);
      setStatusNotice("Bicycling routes & bike paths layer activated.");
    }
  }, [isBikingActive]);

  // Toggle More Layers Menu
  const handleToggleMoreMenu = useCallback(() => {
    setIsMoreMenuOpen((prev) => !prev);
  }, []);

  // Reset All Layers
  const handleResetAllLayers = useCallback(() => {
    if (trafficLayerRef.current) {
      trafficLayerRef.current.setMap(null);
    }
    if (transitLayerRef.current) {
      transitLayerRef.current.setMap(null);
    }
    if (bikingLayerRef.current) {
      bikingLayerRef.current.setMap(null);
    }
    if (googleMapRef.current) {
      googleMapRef.current.setMapTypeId("roadmap");
    }
    setIsTrafficActive(false);
    setIsTransitActive(false);
    setIsBikingActive(false);
    setMapType("roadmap");
    setIsMoreMenuOpen(false);
    setStatusNotice("All map layers reset to standard view.");
  }, []);

  /**
   * Request fresh browser position using navigator.geolocation.getCurrentPosition
   * Requirements:
   * - enableHighAccuracy: true
   * - maximumAge: 0
   * - timeout: 15000
   *
   * Accuracy Validation Rules:
   * - 0–100m: Good accuracy
   * - 101–1000m: Moderate accuracy
   * - > 1000m: Poor accuracy warning with [Try Again] & [Select Location on Map]
   */
  const requestFreshBrowserLocation = useCallback(async () => {
    // If Street View is open, close it so map is visible
    if (googleMapRef.current) {
      try {
        const sv = googleMapRef.current.getStreetView?.();
        if (sv && sv.getVisible?.()) {
          sv.setVisible(false);
          setIsStreetViewActive(false);
        }
      } catch {}
    }

    setIsDetectingGps(true);
    setLocationError("");
    setStatusNotice("Requesting fresh high-accuracy device coordinates from browser...");

    if (!navigator.geolocation) {
      setIsDetectingGps(false);
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingGps(false);
        const lat = Number(pos.coords.latitude.toFixed(7));
        const lng = Number(pos.coords.longitude.toFixed(7));
        const acc = Math.round(pos.coords.accuracy);

        setAccuracy(acc);
        setCoords({ latitude: lat, longitude: lng });

        // Step 4: Accuracy Validation Rules
        if (acc > 1000) {
          // Poor accuracy: > 1000m (e.g. 50000m)
          const km = (acc / 1000).toFixed(acc >= 10000 ? 0 : 1);
          setLocationError(
            `Your current device location has low accuracy (approximately ${km} km). Please enable Windows Location Services and browser location permission, then try again.`
          );
          setStatusNotice(`Device reported low accuracy (±${acc}m). You can adjust your location on the map.`);
          updateMapMarkerPosition(lat, lng, acc, false);
          fetchAddressForCoords(lat, lng);
        } else {
          // Good (0-100m) or Moderate (101-1000m) accuracy
          setLocationError("");
          setStatusNotice(
            acc <= 100
              ? `High-accuracy GPS acquired (±${acc}m).`
              : `Location acquired with moderate accuracy (±${acc}m).`
          );
          updateMapMarkerPosition(lat, lng, acc, true);
          fetchAddressForCoords(lat, lng);
        }
      },
      (err) => {
        setIsDetectingGps(false);
        let errorMsg = "Unable to determine your current location. Please try again.";
        switch (err.code) {
          case 1: // PERMISSION_DENIED
            errorMsg = "Location permission is disabled. Please allow location access for this website.";
            break;
          case 2: // POSITION_UNAVAILABLE
            errorMsg = "Your device could not determine your current location.";
            break;
          case 3: // TIMEOUT
            errorMsg = "Location request timed out. Please try again.";
            break;
          default:
            errorMsg = err.message || errorMsg;
        }
        console.warn("[MapModal] Browser geolocation error:", err.code, errorMsg);
        setLocationError(errorMsg);
        setStatusNotice(errorMsg);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      }
    );
  }, [updateMapMarkerPosition]);

  // Initialize Map when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const startLat =
      initialCoords?.latitude && !isNaN(initialCoords.latitude)
        ? Number(initialCoords.latitude)
        : defaultLat;
    const startLng =
      initialCoords?.longitude && !isNaN(initialCoords.longitude)
        ? Number(initialCoords.longitude)
        : defaultLng;

    const initialAcc = rawAccuracy != null && !isNaN(rawAccuracy) ? Number(rawAccuracy) : null;
    setCoords({ latitude: startLat, longitude: startLng });
    setAccuracy(initialAcc);

    // Initial address resolution
    fetchAddressForCoords(startLat, startLng);

    const timer = setTimeout(() => {
      // Check if user has Google Maps API key configured
      const key = getGoogleMapsApiKey();
      if (key && !hasGoogleMapsAuthError()) {
        initGoogleMap(startLat, startLng, initialAcc);
      } else {
        if (!key) {
          setGoogleKeyNotice(
            "VITE_GOOGLE_MAPS_API_KEY is not configured in .env. Showing interactive map fallback with active reverse geocoding."
          );
        }
        initLeafletFallback(startLat, startLng);
      }

      // If initial coordinates were not already provided, automatically request fresh browser GPS
      if (!initialCoords?.latitude) {
        requestFreshBrowserLocation();
      }
    }, 80);

    return () => {
      clearTimeout(timer);
      destroyMaps();
    };
  }, [isOpen]);

  // Handle Search Submission
  const handleSearchSubmit = async (e) => {
    e?.preventDefault();
    if (!searchQuery || searchQuery.trim().length < 2) return;

    setIsSearching(true);
    try {
      const results = await searchLocationsWithGoogle(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        setStatusNotice("No locations found for this query. Try a nearby town or village.");
      } else {
        setStatusNotice("");
      }
    } catch (err) {
      console.warn("[MapModal] Search failed:", err);
      setStatusNotice("Search request failed. Please check internet connection.");
    } finally {
      setIsSearching(false);
    }
  };

  // Handle Selecting a Search Result
  const handleSelectSearchResult = (res) => {
    const lat = Number(res.latitude);
    const lng = Number(res.longitude);

    setCoords({ latitude: lat, longitude: lng });
    setSearchResults([]);
    setSearchQuery(res.display_name || "");
    setLocationSource("MAP_CONFIRMED");

    updateMapMarkerPosition(lat, lng, null, false);

    setAddressDetails({
      street: res.street || "",
      area: res.area || res.village || "",
      areaStreet: res.areaStreet || res.area_street || res.area || res.village || "",
      village: res.village || "",
      taluk: res.taluk || "",
      city: res.city || "",
      district: res.district || "",
      state: res.state || "",
      country: res.country || "India",
      pincode: res.pincode || res.pin || "",
      displayAddress: res.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      formattedAddress: res.display_name || "",
    });
  };

  // Switch to Manual Map Selection Mode (clears low accuracy warning)
  const handleSelectOnMap = () => {
    setLocationSource("MAP_CONFIRMED");
    setLocationError("");
    setStatusNotice("You can drag the red marker or click anywhere on the map to pinpoint your location.");
  };

  // Confirm Location Handler
  const handleConfirm = () => {
    const isMapConfirmed = locationSource === "MAP_CONFIRMED";

    const finalPayload = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      lat: coords.latitude,
      lng: coords.longitude,
      accuracy: accuracy, // Preserve physical device accuracy
      location_accuracy: accuracy,
      accuracyText: accuracy ? `±${accuracy}m` : (isMapConfirmed ? "Map Confirmed" : "Verified"),
      location_source: isMapConfirmed ? "MAP_CONFIRMED" : "BROWSER_GPS",
      street: addressDetails.street || "",
      route: addressDetails.route || addressDetails.street || "",
      area: addressDetails.area || "",
      area_street: addressDetails.areaStreet || addressDetails.area || addressDetails.village || "",
      areaStreet: addressDetails.areaStreet || addressDetails.area || addressDetails.village || "",
      village: addressDetails.village || "",
      taluk: addressDetails.taluk || "",
      city: addressDetails.city || "",
      district: addressDetails.district || "",
      state: addressDetails.state || "",
      country: addressDetails.country || "India",
      pincode: addressDetails.pincode || "",
      pin: addressDetails.pincode || "",
      displayAddress:
        addressDetails.displayAddress || `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`,
      formattedAddress:
        addressDetails.formattedAddress || addressDetails.displayAddress || "",
      formatted_address:
        addressDetails.formattedAddress || addressDetails.displayAddress || "",
      full_address:
        addressDetails.formattedAddress || addressDetails.displayAddress || "",
      locality:
        addressDetails.displayAddress || `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`,
      timestamp: new Date().toISOString(),
      canPunch: true,
    };

    console.log("[Attendance Location] Executive confirmed location:", finalPayload);

    if (onConfirmLocation) {
      onConfirmLocation(finalPayload);
    }
    onClose();
  };

  if (!isOpen) return null;

  const isMapConfirmed = locationSource === "MAP_CONFIRMED";
  const isAccuracyGood = !isMapConfirmed && accuracy != null && accuracy <= 100;
  const isAccuracyModerate = !isMapConfirmed && accuracy != null && accuracy > 100 && accuracy <= 1000;
  const isAccuracyPoor = !isMapConfirmed && accuracy != null && accuracy > 1000;

  return (
    <div className="loc-map-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="loc-map-modal" role="dialog" aria-modal="true" aria-labelledby="loc-modal-title">
        {/* Header */}
        <div className="loc-map-header">
          <div className="loc-map-header-info">
            <div className="loc-map-title-row">
              <span className="loc-map-title-icon">
                <MapPin size={20} />
              </span>
              <h3 id="loc-modal-title" className="loc-map-title">
                {title}
              </h3>
              {actionLabel && (
                <span className="loc-action-badge">
                  {actionLabel}
                </span>
              )}
            </div>
            <p className="loc-map-subtitle">{subtitle}</p>
          </div>
          <button
            type="button"
            className="loc-map-close-btn"
            onClick={onClose}
            title="Cancel and Close"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* API Key Notice if Google Maps not configured */}
        {googleKeyNotice && (
          <div className="loc-info-banner">
            <Compass size={15} />
            <span>{googleKeyNotice}</span>
          </div>
        )}

        {/* Accuracy Warning Banner for Low Accuracy (> 1000m) or Geolocation Errors */}
        {(locationError || isAccuracyPoor) && (
          <div className="loc-accuracy-warning-banner">
            <div className="loc-warning-main">
              <AlertCircle size={18} className="loc-warning-icon" />
              <span className="loc-warning-text">
                {locationError ||
                  `Your current device location has low accuracy (approximately ${
                    accuracy ? Math.round(accuracy / 1000) : "50"
                  } km). Please enable Windows Location Services and browser location permission, then try again.`}
              </span>
            </div>
            <div className="loc-warning-actions">
              <button
                type="button"
                className="loc-warning-btn-retry"
                onClick={requestFreshBrowserLocation}
                disabled={isDetectingGps}
              >
                {isDetectingGps ? <Loader2 size={13} className="spin" /> : <RotateCw size={13} />}
                <span>Try Again</span>
              </button>
              <button
                type="button"
                className="loc-warning-btn-select"
                onClick={handleSelectOnMap}
              >
                <MapPin size={13} />
                <span>Select Location on Map</span>
              </button>
            </div>
          </div>
        )}

        {/* Search Toolbar */}
        <div className="loc-map-toolbar">
          <form className="loc-search-form" onSubmit={handleSearchSubmit}>
            <Search size={16} className="loc-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="loc-search-input"
              placeholder="Search village, town, taluk, landmark, or PIN code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="submit"
              className="loc-search-submit-btn"
              disabled={isSearching}
            >
              {isSearching ? <Loader2 size={14} className="spin" /> : "Search"}
            </button>
          </form>

          <button
            type="button"
            className="loc-detect-gps-btn"
            onClick={requestFreshBrowserLocation}
            disabled={isDetectingGps}
            title="Use fresh device GPS coordinates"
          >
            {isDetectingGps ? (
              <Loader2 size={15} className="spin" />
            ) : (
              <Crosshair size={15} />
            )}
            <span>Use Current Location</span>
          </button>
        </div>

        {/* Search Autocomplete Dropdown List */}
        {searchResults.length > 0 && (
          <div className="loc-search-dropdown">
            <div className="loc-search-dropdown-header">
              <span>Matching Locations ({searchResults.length})</span>
              <button
                type="button"
                className="loc-search-clear-btn"
                onClick={() => setSearchResults([])}
              >
                Clear
              </button>
            </div>
            <div className="loc-search-results-list">
              {searchResults.map((res, idx) => (
                <div
                  key={idx}
                  className="loc-search-item"
                  onClick={() => handleSelectSearchResult(res)}
                >
                  <MapPin size={15} className="loc-search-item-pin" />
                  <div className="loc-search-item-text">
                    <div className="loc-search-item-name">
                      {res.village || res.area || res.city || "Location"}
                      {res.taluk ? `, ${res.taluk}` : ""}
                    </div>
                    <div className="loc-search-item-full">{res.display_name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Real-time Status Notice */}
        {statusNotice && !locationError && (
          <div className="loc-status-notice">
            <Navigation size={13} />
            <span>{statusNotice}</span>
          </div>
        )}

        {/* Interactive Google Map Canvas */}
        <div className="loc-map-canvas-wrapper">
          <div ref={mapContainerRef} className="loc-map-canvas" id="google-map-attendance-canvas" />

          {/* Bottom-Left: Google Maps Type & Layers Widget (User Screenshot) */}
          <div className="gmap-layers-bottom-widget" aria-label="Map Layers & Type">
            {/* Main Map / Satellite Thumbnail Button */}
            <button
              type="button"
              className="gmap-layers-main-btn"
              onClick={handleToggleMapType}
              title={mapType === "hybrid" || mapType === "satellite" ? "Switch to Map View" : "Switch to Satellite View"}
            >
              <MapModeThumbnail mapType={mapType} />
            </button>

            {/* Horizontal Layers Pill (Terrain, Traffic, Transit, Biking, More) */}
            <div className="gmap-layers-flyout-card">
              {/* 1. Terrain */}
              <button
                type="button"
                className={`gmap-layer-item-btn ${mapType === "terrain" ? "is-layer-active" : ""}`}
                onClick={handleToggleTerrain}
                title="Toggle Terrain View"
              >
                <TerrainLayerIcon active={mapType === "terrain"} />
                <span className="gmap-layer-item-label">Terrain</span>
              </button>

              {/* 2. Traffic */}
              <button
                type="button"
                className={`gmap-layer-item-btn ${isTrafficActive ? "is-layer-active" : ""}`}
                onClick={handleToggleTraffic}
                title="Toggle Live Traffic Layer"
              >
                <TrafficLayerIcon active={isTrafficActive} />
                <span className="gmap-layer-item-label">Traffic</span>
              </button>

              {/* 3. Transit */}
              <button
                type="button"
                className={`gmap-layer-item-btn ${isTransitActive ? "is-layer-active" : ""}`}
                onClick={handleToggleTransit}
                title="Toggle Public Transit Layer"
              >
                <TransitLayerIcon active={isTransitActive} />
                <span className="gmap-layer-item-label">Transit</span>
              </button>

              {/* 4. Biking */}
              <button
                type="button"
                className={`gmap-layer-item-btn ${isBikingActive ? "is-layer-active" : ""}`}
                onClick={handleToggleBiking}
                title="Toggle Bicycling Routes Layer"
              >
                <BikingLayerIcon active={isBikingActive} />
                <span className="gmap-layer-item-label">Biking</span>
              </button>

              {/* 5. More */}
              <button
                type="button"
                className={`gmap-layer-item-btn ${isMoreMenuOpen ? "is-layer-active" : ""}`}
                onClick={handleToggleMoreMenu}
                title="More map options & layers"
              >
                <MoreLayersIcon active={isMoreMenuOpen} />
                <span className="gmap-layer-item-label">More</span>
              </button>
            </div>

            {/* More Layers Popup Menu */}
            {isMoreMenuOpen && (
              <div className="gmap-more-layers-popup">
                <div className="more-popup-title">Map Options</div>
                <button
                  type="button"
                  className="more-popup-option"
                  onClick={() => {
                    handleToggleMapType();
                    setIsMoreMenuOpen(false);
                  }}
                >
                  <span>Satellite View</span>
                  <span className="more-option-tag">{mapType === "hybrid" || mapType === "satellite" ? "ON" : "OFF"}</span>
                </button>
                <button
                  type="button"
                  className="more-popup-option"
                  onClick={() => {
                    handleToggleTerrain();
                    setIsMoreMenuOpen(false);
                  }}
                >
                  <span>Terrain Contours</span>
                  <span className="more-option-tag">{mapType === "terrain" ? "ON" : "OFF"}</span>
                </button>
                <button
                  type="button"
                  className="more-popup-option"
                  onClick={handleResetAllLayers}
                >
                  <span>Reset All Layers</span>
                </button>
              </div>
            )}
          </div>

          {/* Floating Google Maps Custom Controls (Target GPS, Zoom +/-, Yellow Pegman Street View) */}
          <div className="gmap-floating-controls-stack" aria-label="Map Controls">
            {/* 1. Target / My Location Button */}
            <button
              type="button"
              className={`gmap-ctrl-btn gmap-ctrl-locate-btn ${isDetectingGps ? "is-loading" : ""}`}
              onClick={requestFreshBrowserLocation}
              disabled={isDetectingGps}
              title="Locate Me (High-Accuracy Device GPS)"
              aria-label="Locate Me"
            >
              {isDetectingGps ? (
                <Loader2 size={18} className="spin text-teal" />
              ) : (
                <TargetGpsIcon />
              )}
              <span className="gmap-ctrl-tooltip">Your location</span>
            </button>

            {/* 2. Zoom In / Zoom Out Pill */}
            <div className="gmap-ctrl-zoom-pill">
              <button
                type="button"
                className="gmap-ctrl-zoom-btn"
                onClick={handleZoomIn}
                title="Zoom in"
                aria-label="Zoom in"
              >
                <Plus size={17} strokeWidth={2.8} />
              </button>
              <div className="gmap-ctrl-divider" />
              <button
                type="button"
                className="gmap-ctrl-zoom-btn"
                onClick={handleZoomOut}
                title="Zoom out"
                aria-label="Zoom out"
              >
                <Minus size={17} strokeWidth={2.8} />
              </button>
            </div>

            {/* 3. Pegman Street View Button */}
            <button
              type="button"
              className={`gmap-ctrl-btn gmap-ctrl-pegman-btn ${isStreetViewActive ? "is-active" : ""}`}
              onClick={handleToggleStreetView}
              title={isStreetViewActive ? "Exit Street View" : "Toggle Street View (Pegman)"}
              aria-label="Toggle Street View"
            >
              <PegmanIcon active={isStreetViewActive} />
              <span className="gmap-ctrl-tooltip">
                {isStreetViewActive ? "Exit Street View" : "Street View"}
              </span>
            </button>
          </div>

          <div className="loc-map-floating-tip">
            📍 Current location fixed at GPS coordinates
          </div>
        </div>

        {/* Selected Location Address Details HUD */}
        <div className="loc-details-card">
          <div className="loc-card-header-row">
            <h4 className="loc-card-heading">Selected Location</h4>
            <div className="loc-badges-row">
              <span className="loc-coords-badge">
                Lat: <strong>{coords.latitude.toFixed(6)}°</strong>
              </span>
              <span className="loc-coords-badge">
                Lng: <strong>{coords.longitude.toFixed(6)}°</strong>
              </span>
              <span className={`loc-source-badge ${isMapConfirmed ? "source-map" : "source-gps"}`}>
                Source: <strong>{isMapConfirmed ? "MAP_CONFIRMED" : "BROWSER_GPS"}</strong>
              </span>
            </div>
          </div>

          <div className="loc-address-grid">
            <div className="loc-grid-col">
              <span className="loc-field-label">AREA / VILLAGE:</span>
              <span className="loc-field-val" style={{ color: "#0f766e", fontWeight: 700 }}>
                {addressDetails.area || addressDetails.village || "—"}
              </span>
            </div>
            <div className="loc-grid-col">
              <span className="loc-field-label">STREET / ROAD:</span>
              <span className="loc-field-val">{addressDetails.street || addressDetails.route || "—"}</span>
            </div>
            <div className="loc-grid-col">
              <span className="loc-field-label">TALUK / SUB-DIST:</span>
              <span className="loc-field-val">{addressDetails.taluk || "—"}</span>
            </div>
            <div className="loc-grid-col">
              <span className="loc-field-label">CITY / TOWN:</span>
              <span className="loc-field-val" style={{ fontWeight: 600 }}>{addressDetails.city || "—"}</span>
            </div>
            <div className="loc-grid-col">
              <span className="loc-field-label">DISTRICT:</span>
              <span className="loc-field-val">{addressDetails.district || "—"}</span>
            </div>
            <div className="loc-grid-col">
              <span className="loc-field-label">STATE:</span>
              <span className="loc-field-val">{addressDetails.state || "—"}</span>
            </div>
            <div className="loc-grid-col">
              <span className="loc-field-label">PIN CODE:</span>
              <span className="loc-field-val" style={{ color: "#2563eb", fontWeight: 700 }}>{addressDetails.pincode || "—"}</span>
            </div>
            <div className="loc-grid-col">
              <span className="loc-field-label">COUNTRY:</span>
              <span className="loc-field-val">{addressDetails.country || "India"}</span>
            </div>
            <div className="loc-grid-col">
              <span className="loc-field-label">ACCURACY:</span>
              <span className="loc-field-val font-mono">
                {accuracy != null ? `±${accuracy}m` : (isMapConfirmed ? "Map Confirmed" : "—")}
              </span>
            </div>
            <div className="loc-grid-col">
              <span className="loc-field-label">GPS Lat / Lng:</span>
              <span className="loc-field-val font-mono" style={{ fontSize: "0.72rem" }}>
                {coords.latitude ? `${coords.latitude.toFixed(6)}°, ${coords.longitude.toFixed(6)}°` : "—"}
              </span>
            </div>
          </div>

          <div className="loc-full-address-row">
            <span className="loc-field-label">FORMATTED ADDRESS:</span>
            <p className="loc-full-address-text">
              {isGeocoding ? (
                <span className="loc-resolving-text">
                  <Loader2 size={13} className="spin inline-spin" /> Resolving address from coordinates...
                </span>
              ) : (
                addressDetails.formattedAddress || addressDetails.displayAddress || "—"
              )}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="loc-map-footer">
          <button
            type="button"
            className="loc-use-gps-footer-btn"
            onClick={requestFreshBrowserLocation}
            disabled={isDetectingGps}
          >
            {isDetectingGps ? (
              <Loader2 size={15} className="spin" />
            ) : (
              <Crosshair size={15} />
            )}
            <span>Use Current Location</span>
          </button>

          <div className="loc-footer-right-actions">
            <button
              type="button"
              className="loc-cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="loc-confirm-btn"
              onClick={handleConfirm}
              disabled={isGeocoding}
            >
              {isGeocoding ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <CheckCircle size={16} />
              )}
              <span>Confirm Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
