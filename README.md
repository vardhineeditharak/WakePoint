# 📍 WayPoint - Background Proximity Alarm & Navigation App

**WayPoint** is a React Native mobile application built on Expo SDK 54. The app provides persistent background geofence perimeter monitoring, sending immediate high-priority push notifications, audio alarm tones, and vibration alerts when a user enters a custom target radius (100m to 5km). 

It features a **100% free, token-less open-source geospatial architecture** powered by Komoot Photon, OSRM Routing, and OpenStreetMap tiles, with dedicated **location search optimizations for India**.

---

## ✨ Features

- 🔔 **Background Proximity Geofencing**: Operates in the background using `expo-location` and `expo-task-manager` (`WAYPOINT_PROXIMITY_TASK`). Triggers sound, vibration, and push notification alerts even when the phone screen is locked or the app process is terminated.
- 🌐 **Decoupled 100% Free Geospatial API Layer**:
  - **Map Graphic Tiles**: Rendered via OpenStreetMap / OpenFreeMap raster tile mirror (`UrlTile` with `maximumZ={19}`).
  - **Komoot Photon Autocomplete**: Keystroke search with 300ms debouncing and spatial coordinate biasing (`lat`/`lon`).
  - **OSRM Route Calculation Engine**: Real-time driving directions polyline drawing (`Polyline`) connecting your current location to the target destination.
- 🇮🇳 **India Region Optimizations**: Native geocoding tuned for Indian cities, localities, stations, and PIN codes (`countrycodes=in`), pre-populated with popular Indian metro waypoints (Bengaluru, Mumbai, Delhi-NCR, Hyderabad, Chennai, Kolkata, Pune).
- 📍 **Draggable Target Marker Pin**: Touch, hold, and drag the marker pin anywhere on the map to manually set or refine destination coordinates.
- 🎚️ **Interactive Perimeter Radius Slider**: Adjust alarm radius from **100 meters up to 5.0 kilometers** in real time, with instant visual circle scaling.
- 🎯 **Floating Re-Center GPS Button**: One-tap floating action button (FAB) that smoothly animates the map camera back to your live GPS coordinates.
- 📱 **Collapsible Bottom Control Panel**: Minimizes the bottom control card into a sleek compact bar for an unobstructed view of the map.
- ⚙️ **Customizable Alarm Options**: Selectable notification sound tones (*Urgent Radar*, *Gentle Chime*, *Emergency Siren*, *Classic Bell*), vibration patterns, and in-app alert popups.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Expo Go app on your iOS / Android phone, or an Android Emulator / iOS Simulator.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/WayPoint.git
   cd WayPoint
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the Expo development server:**
   ```bash
   npx expo start
   ```

4. **Run on your device:**
   - **Android / iOS Physical Phone**: Scan the QR code in your terminal using **Expo Go**.
   - **Android Emulator**: Press `a` in your terminal.
   - **iOS Simulator**: Press `i` in your terminal.
   - **Web Browser**: Press `w` in your terminal.

---

## 📦 Building an Android APK for Free on GitHub

This repository includes a pre-configured **GitHub Actions Workflow** ([`.github/workflows/build-apk.yml`](.github/workflows/build-apk.yml)) to compile a standalone, installable `.apk` file for free directly on GitHub without requiring local Android Studio tools.

### How to Trigger the APK Build on GitHub:
1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Update WayPoint app"
   git push origin main
   ```
2. Navigate to your GitHub Repository $\rightarrow$ **Actions** tab.
3. Select **Build WayPoint Android APK** $\rightarrow$ Click **Run workflow**.
4. Once completed (~3-5 minutes), scroll down to **Artifacts** and download your `WayPoint-v1.0.0-build-X-APK` file.

---

## 📁 Project Architecture

```
WayPoint/
├── app/
│   ├── _layout.tsx         # Root layout, WaypointProvider & background task entry
│   └── index.tsx           # Main Map Screen (MapView, Marker, Circle, Polyline, UrlTile)
├── components/
│   ├── SearchBar.tsx       # Floating header search bar with 300ms Photon debouncing
│   ├── RadiusSliderWidget.tsx # Collapsible bottom card widget with perimeter slider
│   ├── AlarmOptionsModal.tsx # Alarm tone sound & vibration selector modal
│   ├── AlarmAlertModal.tsx   # Simultaneous in-app arrival alert popup
│   └── PermissionModal.tsx   # Pre-flight location & notification permission handler
├── context/
│   └── WaypointContext.tsx # React Context managing geofence state, routes & permissions
├── services/
│   ├── apiService.ts       # Decoupled network APIs (Komoot Photon & OSRM Routing)
│   └── backgroundTask.ts   # Global TaskManager definition ('WAYPOINT_PROXIMITY_TASK')
├── .github/
│   └── workflows/
│       └── build-apk.yml   # GitHub Actions workflow for building Android release APKs
├── app.json                # Expo configuration with location background modes & Android versionCode
└── package.json
```

---

## 🔒 Permissions Required

WayPoint uses a pre-flight permission flow:
1. **Foreground Location**: To display your current position and calculate distance/route.
2. **Background Location ("Allow all the time")**: Required by iOS/Android to trigger proximity notifications when your phone screen is locked or app is closed.
3. **Local Push Notifications**: To deliver high-priority sound and vibration alert popups upon arrival.

---

## 📄 License

This project is open-source under the MIT License.
