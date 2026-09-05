# 📍 WakePoint

> **GPS Proximity Arrival Alarm & Dark Map Navigation App**  
> Never miss your bus, train, or metro stop again. WakePoint wakes you up with continuous loud alarms and rhythmic vibrations the moment you enter your target destination perimeter.

[![Expo SDK 54](https://img.shields.io/badge/Expo-SDK%2054-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![React Native 0.81](https://img.shields.io/badge/React%20Native-0.81.5-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev)
[![TypeScript 5.9](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

---

## 💡 Why WakePoint?

Public transit commuters, late-night travelers, and daily passengers often take naps on trains, buses, and cabs, constantly worried about missing their stop. Traditional alarms are bound to fixed times (which fail when transit is delayed). 

**WakePoint is bound to location.** Set a destination, dial in your wake-up radius (from 100m to 5km), and rest easy. When your GPS enters the geofence perimeter, WakePoint rings loudly and vibrates until you dismiss or snooze it.

---

## ✨ Key Features

- 🗺️ **Zero API-Key Dark Map Engine**: Powered by an embedded Leaflet.js runtime using CartoDB Dark, Satellite, and OpenStreetMap tiles. Renders reliably on Android & iOS without Google Maps billing or blank grey tile bugs.
- 🔊 **Continuous Offline Audio Synthesis**: Plays loud, looping alarms using dynamically synthesized 16-bit PCM WAV base64 audio. Zero external audio file dependencies, fully offline.
  - *Tones available:* **Urgent Radar**, **Emergency Siren**, **Classic Bell**, and **Upbeat Chime**.
- 📳 **Rhythmic Vibration System**: Multi-frequency continuous haptic pulse patterns (*Pulse*, *Heavy*, *Gentle*) that cut through deep sleep.
- 🔍 **Free Keystroke Autocomplete**: Integrated with the **Komoot Photon Geocoding API** with 300ms debouncing and live GPS coordinate biasing.
- 🚗 **Real-Time OSRM Route Navigation**: Computes live driving route polylines and estimated trip duration connecting your position to the destination.
- 🎚️ **Interactive Perimeter Radius Slider**: Adjust proximity boundary from **100 meters to 5.0 kilometers** in real time with instant visual circle scaling.
- 📍 **Draggable Marker Pin**: Long-press and drag the destination marker anywhere on the map with automatic reverse-geocoding.
- 🔋 **Battery-Conscious Design**: Uses balanced-accuracy GPS polling and throttled route recalculation (>100m movement threshold) to prevent CPU heating and battery drain.
- 🇮🇳 **Pre-Configured Metro Hubs**: Quick-select presets for major transit hubs (Bengaluru, Mumbai, Delhi-NCR, Hyderabad, Chennai, Kolkata, Pune).
- 📦 **Free GitHub Actions APK Build**: Pre-configured CI/CD workflow that builds and signs a standalone Android `.apk` directly on GitHub without requiring local Android Studio.

---

## 📱 Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | [Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/) | React Native 0.81.5 with New Architecture enabled |
| **Routing** | [Expo Router v6](https://docs.expo.dev/router/introduction/) | File-based navigation structure |
| **Map Engine** | `react-native-webview` + Leaflet | Hardware-accelerated dark raster tile engine |
| **Audio Engine** | `expo-av` + PCM Synthesis | Pure mathematical WAV waveform synthesis & looping |
| **Location & Geofencing** | `expo-location` + `expo-task-manager` | Foreground service tracking & background geofences |
| **Notifications** | `expo-notifications` | High-priority Android notification channels & banners |
| **Geocoding & Routing** | Komoot Photon & Project OSRM | Decoupled, free, open geospatial web APIs |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version **20.x** or newer recommended)
- `npm` (bundled with Node) or `yarn` / `bun`
- **Expo Go** mobile app on your physical phone ([Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) or [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)), or an Android Emulator / iOS Simulator.

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/WakePoint.git
cd WakePoint
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Development Server

```bash
npx expo start
```

### 4. Launch on Your Target Platform

- **Physical Phone (Expo Go)**: Scan the QR code shown in your terminal using the **Expo Go** app (Android) or the native **Camera** app (iOS).
- **Android Emulator**: Press <kbd>a</kbd> in your terminal (requires Android Studio).
- **iOS Simulator**: Press <kbd>i</kbd> in your terminal (requires macOS & Xcode).
- **Web Browser**: Press <kbd>w</kbd> in your terminal to preview in your desktop browser.

---

## 🛠️ Testing Background Location & Alarms

> [!NOTE]
> On Android, background location tasks and foreground notification services work best on an **Android Development Build** (`npx expo run:android`) or the standalone compiled **APK**. Standard Expo Go enforces restrictions on persistent background tasks.

To run a native local development build on Android:

```bash
# 1. Generate the native android project folder
npx expo prebuild --platform android

# 2. Compile and launch directly on your connected device or emulator
npx expo run:android
```

---

## 📦 Building a Standalone Android APK (Free via GitHub Actions)

You don't need Android Studio or a high-end machine to compile the installable `.apk`. This repository includes a complete GitHub Actions workflow ([`.github/workflows/build-apk.yml`](.github/workflows/build-apk.yml)).

1. Push this repository to your GitHub account:
   ```bash
   git add .
   git commit -m "Configure WakePoint"
   git push origin main
   ```
2. In your GitHub repository, navigate to the **Actions** tab.
3. In the sidebar, select **Build WakePoint Android APK**.
4. Click **Run workflow** $\rightarrow$ select branch `main` $\rightarrow$ click **Run workflow**.
5. After ~3 to 5 minutes, open the completed workflow run, scroll down to **Artifacts**, and download your installable `WakePoint-v1.1.0-build-X-APK` file!

---

## 📁 Project Structure

```
WakePoint/
├── app/
│   ├── _layout.tsx              # Root app layout, SafeAreaProvider & WakePointProvider
│   └── index.tsx                # Main Screen (WakeMapView, SearchBar, RadiusSlider, Dock)
├── components/
│   ├── index.ts                 # Component exports barrel
│   ├── WakeMapView.tsx          # Leaflet WebView dark tile map engine
│   ├── SearchBar.tsx            # Floating search bar with Photon API debounced autocomplete
│   ├── RadiusSliderWidget.tsx   # Collapsible bottom sheet with arrival radius slider
│   ├── AlarmOptionsModal.tsx    # Sound tone & vibration selector modal
│   ├── AlarmAlertModal.tsx      # Full-screen ringing arrival alarm alert modal
│   └── PermissionModal.tsx      # Pre-flight location & notification permission handler
├── context/
│   └── WakePointContext.tsx     # Global context for GPS tracking, distance, routes & alarms
├── services/
│   ├── index.ts                 # Services exports barrel
│   ├── alarmSoundService.ts     # In-memory PCM WAV audio synthesizer & expo-av alarm engine
│   ├── apiService.ts            # Komoot Photon autocomplete & OSRM driving route APIs
│   └── backgroundTask.ts        # Expo TaskManager proximity & location update task
├── .github/
│   └── workflows/
│       └── build-apk.yml        # Automated GitHub Actions workflow for building Android APKs
├── app.json                     # Expo configuration, permissions, and background modes
├── package.json
└── tsconfig.json
```

---

## 🔒 Permissions Used

WakePoint prompts users gracefully using an in-app pre-flight permission modal:

1. **Foreground Location (`ACCESS_FINE_LOCATION`)**: Displays your position on the map, calculates real-time distance to the destination, and draws routing polylines.
2. **Background Location (`ACCESS_BACKGROUND_LOCATION`)**: Required by iOS and Android so the proximity watcher can trigger the alarm even if your phone screen is off or the app is minimized.
3. **Notifications (`POST_NOTIFICATIONS`)**: Displays high-priority arrival notifications with custom channel alarms.
4. **Wake Lock & Audio Background Mode**: Keeps the alarm sound ringing without being silenced by OS battery optimization.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to open an issue or submit a pull request.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
