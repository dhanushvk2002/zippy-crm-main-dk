# Zenve Zippy CRM — Sales Executive Attendance System with Google Maps Integration

Zippy CRM Sales Executive Attendance tracking system with Google Maps integration for accurate location confirmation, reverse geocoding, and biometric shift recording.

---

## 1. Google Maps Setup & Configuration

### Required Google Cloud APIs
Ensure the following APIs are enabled in your [Google Cloud Console](https://console.cloud.google.com/):
1. **Maps JavaScript API** — Required for interactive map rendering, markers, and controls.
2. **Geocoding API** — Required for reverse geocoding coordinates into structured addresses.
3. **Places API** — Required for location search and autocomplete.

### Frontend Environment Variable
Copy `.env.example` to `.env` in the root folder:

```bash
VITE_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
```

> **Security Note**: Never commit your real `.env` file to Git. `.env` is already configured in `.gitignore`. For security in production, restrict the API key to your application's domain/HTTP referrer.

---

## 2. Attendance & Location Flow

When a Sales Executive clicks:
- **Morning Punch In**
- **Lunch Out**
- **Lunch In**
- **Evening Punch Out**

The **"Confirm Your Location"** Google Maps modal opens:
1. **Browser Geolocation**: Fetches fresh GPS coordinates from the device browser with `enableHighAccuracy: true`, `maximumAge: 0`, and `timeout: 15000`.
2. **Accuracy Validation**:
   - **0–100 meters**: Good accuracy (Green badge). Sets `location_source = "BROWSER_GPS"`.
   - **101–1000 meters**: Moderate accuracy (Amber badge). Allows confirmation per business rules.
   - **> 1000 meters**: Low accuracy warning (e.g. `approximately 50 km`). Prompts the executive to enable Windows Location Services and browser permission, or use **[Select Location on Map]**.
3. **Google Map Display**:
   - Centered on coordinates.
   - Draggable red location marker 📍.
   - Overlaid **"My Location"** button (◎) to re-acquire fresh device GPS at any time.
   - Zoom controls & smooth map panning.
4. **Interactive Map Fallback**:
   - Executive can drag the marker or search places (village, town, landmark, PIN code).
   - Dragging or searching dynamically reverse-geocodes the new position and sets `location_source = "MAP_CONFIRMED"`.
5. **Reverse Geocoding**:
   - Dynamically resolves:
     - **Rural hierarchy**: `Village` → `Taluk` → `District` → `State`
     - **Urban hierarchy**: `Area` → `City` → `District` → `State`
     - `Country` & `PIN Code`
   - Zero hardcoding of any geographic name.
6. **Confirmation & Persistence**:
   - Executive reviews structured location HUD below map and clicks **[Confirm Location]**.
   - Saves attendance action to MySQL database (`attendance` table) preserving all structured fields.

---

## 3. Running Locally

### Backend (FastAPI + MySQL)
```bash
cd backend
python -m uvicorn pets:app --reload
```
Runs at: `http://127.0.0.1:8000`

### Frontend (React + Vite)
```bash
npm run dev
```
Runs at: `http://localhost:5173`

### Production Build
```bash
npm run build
```
