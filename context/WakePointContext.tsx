import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import {
  WAKEPOINT_PROXIMITY_TASK,
  WAKEPOINT_NOTIFICATION_CHANNEL,
  WAKEPOINT_ACTIVE_CATEGORY,
  ACTION_TURN_OFF_ALARM,
  setupNotificationChannel,
  setSharedBackgroundTarget,
  encodeGeofenceIdentifier,
  postOrUpdateActiveNotification,
  dismissActiveNotification,
} from '../services/backgroundTask';
import {
  saveAlarmSession,
  loadAlarmSession,
  clearAlarmSession,
} from '../services/sessionStorage';
import { photonSearch, calculateRoutePath, GeoCoordinate } from '../services/apiService';
import { alarmSoundService, AlarmTone, VibrationStyle } from '../services/alarmSoundService';

export interface Destination {
  latitude: number;
  longitude: number;
  title: string;
  address: string;
}

export interface AlarmOptions {
  soundTone: AlarmTone;
  vibrationStyle: VibrationStyle;
  repeatAlert: boolean;
}

export interface PermissionStatus {
  foregroundGranted: boolean;
  backgroundGranted: boolean;
  notificationsGranted: boolean;
  isChecking: boolean;
}

export interface PresetLocation {
  id: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  iconName: string;
}

export interface WakePointContextType {
  destination: Destination | null;
  radius: number; // in meters (100 to 5000)
  isAlarmActive: boolean;
  isAlarmRinging: boolean;
  permissions: PermissionStatus;
  userLocation: Location.LocationObject | null;
  currentDistanceMeters: number | null;
  alarmOptions: AlarmOptions;
  searchQuery: string;
  searchResults: Destination[];
  isSearching: boolean;
  isSearchFocused: boolean;
  routeCoordinates: GeoCoordinate[];
  routeDistanceMeters: number;
  routeDurationSeconds: number;
  isCalculatingRoute: boolean;
  showPermissionModal: boolean;
  permissionErrorMessage: string;
  showAlarmAlertModal: boolean;

  // Actions
  setDestination: (dest: Destination | null) => void;
  setRadius: (radius: number) => void;
  setAlarmOptions: (options: Partial<AlarmOptions>) => void;
  setIsSearchFocused: (focused: boolean) => void;
  toggleAlarm: () => Promise<void>;
  requestAllPermissions: () => Promise<boolean>;
  searchDestinations: (query: string) => Promise<void>;
  selectPresetDestination: (preset: PresetLocation) => void;
  setDestinationFromCoordinates: (latitude: number, longitude: number) => Promise<void>;
  getCurrentLocation: () => Promise<Location.LocationObject | null>;
  testTriggerNotification: () => Promise<void>;
  dismissPermissionModal: () => void;
  dismissAlarmAlertModal: () => void;
  stopAlarmRinging: () => Promise<void>;
  snoozeAlarm: (minutes?: number) => Promise<void>;
  previewAlarmTone: (tone: AlarmTone) => Promise<void>;
  triggerSimultaneousAlarm: () => Promise<void>;
}

const DEFAULT_ALARM_OPTIONS: AlarmOptions = {
  soundTone: 'radar',
  vibrationStyle: 'pulse',
  repeatAlert: true,
};

export const PRESET_DESTINATIONS: PresetLocation[] = [
  {
    id: 'ind_1',
    title: 'MG Road Central Metro Station',
    address: 'Bengaluru, Karnataka - 560001',
    latitude: 12.9756,
    longitude: 77.6066,
    iconName: 'subway-sharp',
  },
  {
    id: 'ind_2',
    title: 'Kempegowda International Airport (BLR)',
    address: 'Devanahalli, Bengaluru - 560300',
    latitude: 13.1986,
    longitude: 77.7066,
    iconName: 'airplane-sharp',
  },
  {
    id: 'ind_3',
    title: 'CSMT Railway Terminus',
    address: 'Fort, Mumbai, Maharashtra - 400001',
    latitude: 18.9400,
    longitude: 72.8353,
    iconName: 'train-sharp',
  },
  {
    id: 'ind_4',
    title: 'Hitec City Cyber Towers',
    address: 'Madhapur, Hyderabad, Telangana - 500081',
    latitude: 17.4504,
    longitude: 78.3808,
    iconName: 'business-sharp',
  },
  {
    id: 'ind_5',
    title: 'Connaught Place Central Hub',
    address: 'New Delhi, Delhi - 110001',
    latitude: 28.6315,
    longitude: 77.2167,
    iconName: 'compass-sharp',
  },
  {
    id: 'ind_6',
    title: 'Marina Beach Promenade',
    address: 'Triplicane, Chennai, Tamil Nadu - 600005',
    latitude: 13.0499,
    longitude: 80.2824,
    iconName: 'water-sharp',
  },
  {
    id: 'ind_7',
    title: 'Salt Lake Sector V Tech Hub',
    address: 'Bidhannagar, Kolkata, West Bengal - 700091',
    latitude: 22.5726,
    longitude: 88.4319,
    iconName: 'hardware-chip-sharp',
  },
  {
    id: 'ind_8',
    title: 'Magarpatta Cybercity',
    address: 'Hadapsar, Pune, Maharashtra - 411028',
    latitude: 18.5158,
    longitude: 73.9272,
    iconName: 'laptop-sharp',
  },
];

// Helper: Haversine distance in meters
function computeHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

const WakePointContext = createContext<WakePointContextType | undefined>(undefined);

export const WakePointProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [destination, setDestinationState] = useState<Destination | null>(null);
  const [radius, setRadiusState] = useState<number>(1000); // Default 1000m (1km)
  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);
  const [isAlarmRinging, setIsAlarmRinging] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [currentDistanceMeters, setCurrentDistanceMeters] = useState<number | null>(null);
  const [alarmOptions, setAlarmOptionsState] = useState<AlarmOptions>(DEFAULT_ALARM_OPTIONS);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Destination[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);

  // Routing State
  const [routeCoordinates, setRouteCoordinates] = useState<GeoCoordinate[]>([]);
  const [routeDistanceMeters, setRouteDistanceMeters] = useState<number>(0);
  const [routeDurationSeconds, setRouteDurationSeconds] = useState<number>(0);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);

  const [showPermissionModal, setShowPermissionModal] = useState<boolean>(false);
  const [permissionErrorMessage, setPermissionErrorMessage] = useState<string>('');
  const [showAlarmAlertModal, setShowAlarmAlertModal] = useState<boolean>(false);

  const [permissions, setPermissions] = useState<PermissionStatus>({
    foregroundGranted: false,
    backgroundGranted: false,
    notificationsGranted: false,
    isChecking: true,
  });

  const locationWatchSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const snoozeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTriggeredArrivalRef = useRef<boolean>(false);
  const isAlarmActiveRef = useRef<boolean>(false);
  const lastNotifDistanceMetersRef = useRef<number | null>(null);

  useEffect(() => {
    isAlarmActiveRef.current = isAlarmActive;
  }, [isAlarmActive]);

  const handleTurnOffAlarmFromNotification = useCallback(async () => {
    if (Haptics.notificationAsync) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    if (snoozeTimerRef.current) {
      clearTimeout(snoozeTimerRef.current);
      snoozeTimerRef.current = null;
    }
    await stopBackgroundTracking();
    await stopAlarmRinging();
    await dismissActiveNotification();
    setIsAlarmActive(false);
    isAlarmActiveRef.current = false;
    hasTriggeredArrivalRef.current = false;
    lastNotifDistanceMetersRef.current = null;
    await clearAlarmSession();
  }, []);

  const restoreActiveSession = useCallback(async () => {
    try {
      const session = await loadAlarmSession();
      if (session && session.isAlarmActive && session.destination) {
        console.log('[WakePoint] Restoring active alarm session across process lifecycle:', session.destination.title);
        setDestinationState(session.destination);
        setRadiusState(session.radius);
        setAlarmOptionsState(session.alarmOptions);
        setIsAlarmActive(true);
        isAlarmActiveRef.current = true;

        // Resume background foreground service & geofencing
        await startBackgroundTracking(session.destination, session.radius);

        // Keep persistent notification active in the shade
        await postOrUpdateActiveNotification(session.destination.title, session.radius, null);

        // Evaluate live position immediately
        try {
          const fg = await Location.getForegroundPermissionsAsync();
          if (fg.granted) {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setUserLocation(loc);
            const dist = computeHaversineDistance(
              loc.coords.latitude,
              loc.coords.longitude,
              session.destination.latitude,
              session.destination.longitude
            );
            setCurrentDistanceMeters(dist);
            await postOrUpdateActiveNotification(session.destination.title, session.radius, dist);

            if (dist <= session.radius) {
              hasTriggeredArrivalRef.current = true;
              await triggerSimultaneousAlarm();
            }
          }
        } catch (_) {}
      }
    } catch (err) {
      console.warn('[WakePoint] Error restoring active session:', err);
    }
  }, []);

  useEffect(() => {
    setupNotificationChannel();
    checkPermissionsSilently();
    fetchUserCurrentLocation();
    restoreActiveSession();

    // Listen for notification action taps (e.g. Turn Off Alarm button)
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.actionIdentifier === ACTION_TURN_OFF_ALARM) {
        handleTurnOffAlarmFromNotification();
      }
    });

    return () => {
      sub.remove();
      if (snoozeTimerRef.current) {
        clearTimeout(snoozeTimerRef.current);
        snoozeTimerRef.current = null;
      }
    };
  }, [handleTurnOffAlarmFromNotification, restoreActiveSession]);

  const lastRouteCalculatedPointRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastRouteDestinationRef = useRef<{ lat: number; lng: number } | null>(null);

  // Power-efficient foreground GPS watcher (prevents battery drain & heating)
  useEffect(() => {
    let isMounted = true;

    async function startLocationWatch() {
      try {
        const fg = await Location.getForegroundPermissionsAsync();
        if (!fg.granted) return;

        if (locationWatchSubscriptionRef.current) {
          locationWatchSubscriptionRef.current.remove();
        }

        locationWatchSubscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced, // Saves up to 80% battery & stops CPU/GPS heating
            distanceInterval: 12,                // Updates every 12 meters
            timeInterval: 5000,                  // Every 5 seconds
          },
          (loc) => {
            if (!isMounted) return;
            setUserLocation(loc);

            if (destination) {
              const dist = computeHaversineDistance(
                loc.coords.latitude,
                loc.coords.longitude,
                destination.latitude,
                destination.longitude
              );
              setCurrentDistanceMeters(dist);

              // Update persistent ongoing notification with live distance (throttled every 50m)
              if (isAlarmActive) {
                const shouldUpdateNotif =
                  lastNotifDistanceMetersRef.current == null ||
                  Math.abs(dist - lastNotifDistanceMetersRef.current) >= 50;
                if (shouldUpdateNotif) {
                  lastNotifDistanceMetersRef.current = dist;
                  postOrUpdateActiveNotification(destination.title, radius, dist).catch(() => {});
                }
              }

              // Check if entered proximity circle and alarm is active
              if (isAlarmActive && dist <= radius && !hasTriggeredArrivalRef.current) {
                hasTriggeredArrivalRef.current = true;
                triggerSimultaneousAlarm();
              } else if (dist > radius * 1.15 && hasTriggeredArrivalRef.current) {
                // Hysteresis: reset trigger when moving outside perimeter
                hasTriggeredArrivalRef.current = false;
              }
            }
          }
        );
      } catch (err) {
        console.warn('[WakePoint] watchPosition error:', err);
      }
    }

    startLocationWatch();

    return () => {
      isMounted = false;
      if (locationWatchSubscriptionRef.current) {
        locationWatchSubscriptionRef.current.remove();
        locationWatchSubscriptionRef.current = null;
      }
    };
  }, [destination, isAlarmActive, radius]);

  // Throttled route path calculation (prevents continuous HTTP requests & CPU heating)
  const updateRoute = useCallback(async () => {
    if (!destination || !userLocation) {
      setRouteCoordinates([]);
      setRouteDistanceMeters(0);
      setRouteDurationSeconds(0);
      lastRouteCalculatedPointRef.current = null;
      lastRouteDestinationRef.current = null;
      return;
    }

    // Check if user has moved significantly (> 100m) or destination changed before hitting OSRM API
    if (lastRouteCalculatedPointRef.current && lastRouteDestinationRef.current) {
      const movedMeters = computeHaversineDistance(
        userLocation.coords.latitude,
        userLocation.coords.longitude,
        lastRouteCalculatedPointRef.current.lat,
        lastRouteCalculatedPointRef.current.lng
      );
      const destMovedMeters = computeHaversineDistance(
        destination.latitude,
        destination.longitude,
        lastRouteDestinationRef.current.lat,
        lastRouteDestinationRef.current.lng
      );

      if (movedMeters < 100 && destMovedMeters < 10) {
        return; // Skip redundant API calculation
      }
    }

    setIsCalculatingRoute(true);
    try {
      const routeData = await calculateRoutePath(
        {
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
        },
        {
          latitude: destination.latitude,
          longitude: destination.longitude,
        }
      );

      if (routeData && routeData.coordinates.length > 0) {
        setRouteCoordinates(routeData.coordinates);
        setRouteDistanceMeters(routeData.distanceMeters);
        setRouteDurationSeconds(routeData.durationSeconds);
        lastRouteCalculatedPointRef.current = {
          lat: userLocation.coords.latitude,
          lng: userLocation.coords.longitude,
        };
        lastRouteDestinationRef.current = {
          lat: destination.latitude,
          lng: destination.longitude,
        };
      } else {
        setRouteCoordinates([]);
        // Fallback transit duration estimation (~30 km/h) if routing polyline is unavailable
        if (currentDistanceMeters) {
          const fallbackSeconds = Math.round(((currentDistanceMeters / 1000) / 30) * 3600);
          setRouteDurationSeconds(Math.max(60, fallbackSeconds));
        }
      }
    } catch (error) {
      console.error('[WakePoint] Route calculation error:', error);
      setRouteCoordinates([]);
      if (currentDistanceMeters) {
        const fallbackSeconds = Math.round(((currentDistanceMeters / 1000) / 30) * 3600);
        setRouteDurationSeconds(Math.max(60, fallbackSeconds));
      }
    } finally {
      setIsCalculatingRoute(false);
    }
  }, [destination, userLocation]);

  useEffect(() => {
    updateRoute();
  }, [updateRoute]);

  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  const checkPermissionsSilently = async () => {
    try {
      const fg = await Location.getForegroundPermissionsAsync();
      const bg = await Location.getBackgroundPermissionsAsync();
      let notifGranted = true;

      if (!isExpoGo || Platform.OS !== 'android') {
        try {
          const notif = await Notifications.getPermissionsAsync();
          notifGranted = notif.granted;
        } catch (e) {
          notifGranted = true;
        }
      }

      setPermissions({
        foregroundGranted: fg.granted,
        backgroundGranted: bg.granted,
        notificationsGranted: notifGranted,
        isChecking: false,
      });
    } catch (e) {
      setPermissions((prev) => ({ ...prev, isChecking: false }));
    }
  };

  const requestAllPermissions = async (): Promise<boolean> => {
    try {
      const fgStatus = await Location.requestForegroundPermissionsAsync();
      if (!fgStatus.granted) {
        setPermissionErrorMessage(
          'Foreground location permission is required so WakePoint can monitor your distance to your target destination.'
        );
        setShowPermissionModal(true);
        setPermissions((p) => ({ ...p, foregroundGranted: false }));
        return false;
      }

      const bgStatus = await Location.requestBackgroundPermissionsAsync();
      if (!bgStatus.granted) {
        setPermissionErrorMessage(
          'Background location permission ("Allow all the time") is required for WakePoint to ring alarms when the app is minimized.'
        );
        setShowPermissionModal(true);
        setPermissions((p) => ({ ...p, foregroundGranted: true, backgroundGranted: false }));
        return false;
      }

      let notifGranted = true;
      if (!isExpoGo || Platform.OS !== 'android') {
        try {
          const notifStatus = await Notifications.requestPermissionsAsync({
            ios: { allowAlert: true, allowSound: true, allowBadge: true },
          });
          notifGranted = notifStatus.granted;
        } catch (e) {
          notifGranted = true;
        }
      }

      if (!notifGranted) {
        setPermissionErrorMessage(
          'Notification permission is required so WakePoint can send arrival alerts.'
        );
        setShowPermissionModal(true);
        setPermissions({
          foregroundGranted: true,
          backgroundGranted: true,
          notificationsGranted: false,
          isChecking: false,
        });
        return false;
      }

      setPermissions({
        foregroundGranted: true,
        backgroundGranted: true,
        notificationsGranted: true,
        isChecking: false,
      });

      // Immediately fetch user location once permissions are granted
      await fetchUserCurrentLocation();
      return true;
    } catch (error) {
      console.error('[WakePoint] Error requesting permissions:', error);
      return false;
    }
  };

  const fetchUserCurrentLocation = async () => {
    try {
      let fg = await Location.getForegroundPermissionsAsync();
      if (!fg.granted) {
        fg = await Location.requestForegroundPermissionsAsync();
      }
      if (fg.granted) {
        // 1. Instant cached fix for zero-delay blue beacon
        try {
          const cachedLoc = await Location.getLastKnownPositionAsync({});
          if (cachedLoc) {
            setUserLocation(cachedLoc);
          }
        } catch (_) {}

        // 2. High-accuracy live fix
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation(loc);
        if (destination) {
          const dist = computeHaversineDistance(
            loc.coords.latitude,
            loc.coords.longitude,
            destination.latitude,
            destination.longitude
          );
          setCurrentDistanceMeters(dist);
        }
      }
    } catch (e) {
      console.log('[WakePoint] Error fetching user position:', e);
    }
  };

  const setDestination = (dest: Destination | null) => {
    setDestinationState(dest);
    hasTriggeredArrivalRef.current = false;
    if (snoozeTimerRef.current) {
      clearTimeout(snoozeTimerRef.current);
      snoozeTimerRef.current = null;
    }
    if (Haptics.impactAsync) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (isAlarmActive && dest) {
      startBackgroundTracking(dest, radius);
      postOrUpdateActiveNotification(dest.title, radius, currentDistanceMeters);
      saveAlarmSession({
        destination: dest,
        radius,
        isAlarmActive: true,
        alarmOptions,
        savedAt: Date.now(),
      });
    }
  };

  const setRadius = (newRadius: number) => {
    setRadiusState(newRadius);
    if (isAlarmActive && destination) {
      startBackgroundTracking(destination, newRadius);
      postOrUpdateActiveNotification(destination.title, newRadius, currentDistanceMeters);
      saveAlarmSession({
        destination,
        radius: newRadius,
        isAlarmActive: true,
        alarmOptions,
        savedAt: Date.now(),
      });
    }
  };

  const setAlarmOptions = (options: Partial<AlarmOptions>) => {
    setAlarmOptionsState((prev) => {
      const next = { ...prev, ...options };
      if (isAlarmActive && destination) {
        saveAlarmSession({
          destination,
          radius,
          isAlarmActive: true,
          alarmOptions: next,
          savedAt: Date.now(),
        });
      }
      return next;
    });
  };

  async function startBackgroundTracking(dest: Destination, r: number) {
    try {
      // 1. Sync target with background task memory
      setSharedBackgroundTarget({
        latitude: dest.latitude,
        longitude: dest.longitude,
        radius: r,
        title: dest.title,
        soundTone: alarmOptions.soundTone,
        vibrationStyle: alarmOptions.vibrationStyle,
      });

      // 2. Start robust Foreground Service background location updates (for Android background execution immunity)
      const isLocationUpdatesStarted = await Location.hasStartedLocationUpdatesAsync(WAKEPOINT_PROXIMITY_TASK);
      if (isLocationUpdatesStarted) {
        await Location.stopLocationUpdatesAsync(WAKEPOINT_PROXIMITY_TASK);
      }

      await Location.startLocationUpdatesAsync(WAKEPOINT_PROXIMITY_TASK, {
        accuracy: Location.Accuracy.Balanced, // Power-efficient GPS & cell triangulation
        timeInterval: 8000,                  // 8 seconds between ticks in background
        distanceInterval: 15,                // 15 meters
        deferredUpdatesInterval: 5000,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: `WakePoint Active: ${dest.title}`,
          notificationBody: `Monitoring arrival perimeter (${r >= 1000 ? `${(r / 1000).toFixed(1)}km` : `${r}m`}). Tap to view.`,
          notificationColor: '#6366F1',
        },
        pausesUpdatesAutomatically: false,
      });

      // 3. Start Geofencing as secondary hardware trigger
      const isGeofenceStarted = await Location.hasStartedGeofencingAsync(WAKEPOINT_PROXIMITY_TASK);
      if (isGeofenceStarted) {
        await Location.stopGeofencingAsync(WAKEPOINT_PROXIMITY_TASK);
      }

      const geofenceIdentifier = encodeGeofenceIdentifier({
        latitude: dest.latitude,
        longitude: dest.longitude,
        radius: r,
        title: dest.title,
        soundTone: alarmOptions.soundTone,
        vibrationStyle: alarmOptions.vibrationStyle,
      });

      await Location.startGeofencingAsync(WAKEPOINT_PROXIMITY_TASK, [
        {
          identifier: geofenceIdentifier,
          latitude: dest.latitude,
          longitude: dest.longitude,
          radius: r,
          notifyOnEnter: true,
          notifyOnExit: false,
        },
      ]);

      console.log(`[WakePoint] Background service & geofence active for ${dest.title} (Radius: ${r}m)`);
    } catch (error: any) {
      console.error('[WakePoint] Failed to start background tracking:', error.message || error);
    }
  };

  async function stopBackgroundTracking() {
    try {
      setSharedBackgroundTarget(null);

      const isLocationUpdatesStarted = await Location.hasStartedLocationUpdatesAsync(WAKEPOINT_PROXIMITY_TASK);
      if (isLocationUpdatesStarted) {
        await Location.stopLocationUpdatesAsync(WAKEPOINT_PROXIMITY_TASK);
      }

      const isGeofenceStarted = await Location.hasStartedGeofencingAsync(WAKEPOINT_PROXIMITY_TASK);
      if (isGeofenceStarted) {
        await Location.stopGeofencingAsync(WAKEPOINT_PROXIMITY_TASK);
      }

      console.log('[WakePoint] Background tracking stopped.');
    } catch (error: any) {
      console.error('[WakePoint] Failed to stop background tracking:', error.message || error);
    }
  };

  const toggleAlarm = async () => {
    if (Haptics.notificationAsync) {
      Haptics.notificationAsync(
        isAlarmActive
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success
      );
    }

    if (isAlarmActive) {
      if (snoozeTimerRef.current) {
        clearTimeout(snoozeTimerRef.current);
        snoozeTimerRef.current = null;
      }
      await stopBackgroundTracking();
      await stopAlarmRinging();
      await dismissActiveNotification();
      setIsAlarmActive(false);
      isAlarmActiveRef.current = false;
      hasTriggeredArrivalRef.current = false;
      lastNotifDistanceMetersRef.current = null;
      await clearAlarmSession();
    } else {
      if (!destination) {
        Alert.alert('No Target Selected', 'Please select or search a location on the map before activating the alarm.');
        return;
      }

      const permOK = await requestAllPermissions();
      if (!permOK) {
        return;
      }

      hasTriggeredArrivalRef.current = false;
      await startBackgroundTracking(destination, radius);
      await postOrUpdateActiveNotification(destination.title, radius, currentDistanceMeters);
      setIsAlarmActive(true);
      isAlarmActiveRef.current = true;

      await saveAlarmSession({
        destination,
        radius,
        isAlarmActive: true,
        alarmOptions,
        savedAt: Date.now(),
      });
    }
  };

  const setDestinationFromCoordinates = async (latitude: number, longitude: number) => {
    try {
      if (Haptics.impactAsync) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      let title = 'Pinned Waypoint';
      let address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

      if (geocode && geocode.length > 0) {
        const item = geocode[0];
        title = item.name || item.street || item.district || 'Selected Waypoint';
        address = [item.street, item.subregion || item.city, item.region, item.country]
          .filter(Boolean)
          .join(', ');
      }

      setDestination({
        latitude,
        longitude,
        title,
        address,
      });
    } catch (err) {
      setDestination({
        latitude,
        longitude,
        title: 'Custom Map Location',
        address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      });
    }
  };

  const searchDestinations = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const userCoords = userLocation
        ? { latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude }
        : null;

      const photonResults = await photonSearch(query, userCoords, 8);

      if (photonResults && photonResults.length > 0) {
        const mapped: Destination[] = photonResults.map((item) => ({
          latitude: item.latitude,
          longitude: item.longitude,
          title: item.title,
          address: item.address,
        }));
        setSearchResults(mapped);
      } else {
        const filteredPresets = PRESET_DESTINATIONS.filter(
          (p) =>
            p.title.toLowerCase().includes(query.toLowerCase()) ||
            p.address.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filteredPresets);
      }
    } catch (err) {
      console.error('[WakePoint] Search destinations error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const selectPresetDestination = (preset: PresetLocation) => {
    setDestination({
      latitude: preset.latitude,
      longitude: preset.longitude,
      title: preset.title,
      address: preset.address,
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const getCurrentLocation = async (): Promise<Location.LocationObject | null> => {
    try {
      let fg = await Location.getForegroundPermissionsAsync();
      if (!fg.granted) {
        fg = await Location.requestForegroundPermissionsAsync();
      }
      if (fg.granted) {
        // Fast-path: if state has no location yet, grab cached fix instantly
        if (!userLocation) {
          try {
            const cachedLoc = await Location.getLastKnownPositionAsync({});
            if (cachedLoc) {
              setUserLocation(cachedLoc);
            }
          } catch (_) {}
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setUserLocation(loc);
        if (destination) {
          const dist = computeHaversineDistance(
            loc.coords.latitude,
            loc.coords.longitude,
            destination.latitude,
            destination.longitude
          );
          setCurrentDistanceMeters(dist);
        }
        return loc;
      }
    } catch (e) {
      console.log('[WakePoint] Location fetch error:', e);
    }
    return userLocation || null;
  };

  /**
   * Triggers the full ringing alarm: loud looping audio, repeating vibration, and full-screen modal
   */
  async function triggerSimultaneousAlarm() {
    setIsAlarmRinging(true);
    setShowAlarmAlertModal(true);

    // 1. Play continuous loud alarm audio + continuous rhythmic vibration
    await alarmSoundService.startAlarm(alarmOptions.soundTone, alarmOptions.vibrationStyle);

    // 2. High priority persistent notification with Turn Off Alarm action
    await Notifications.scheduleNotificationAsync({
      identifier: 'wakepoint_arrival_alarm_notification',
      content: {
        title: '🚨 WAKE UP! Arrival Alarm!',
        body: `You are inside the perimeter of: ${destination?.title || 'Your Destination'}`,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 500, 200, 500, 200, 1000],
        sticky: true,
        autoDismiss: false,
        data: {
          channelId: WAKEPOINT_NOTIFICATION_CHANNEL,
        },
        categoryIdentifier: WAKEPOINT_ACTIVE_CATEGORY,
      },
      trigger: {
        channelId: WAKEPOINT_NOTIFICATION_CHANNEL,
      } as any,
    });
  };

  async function stopAlarmRinging() {
    setIsAlarmRinging(false);
    setShowAlarmAlertModal(false);
    await alarmSoundService.stopAlarm();
  };

  const snoozeAlarm = async (minutes = 5) => {
    await stopAlarmRinging();
    if (snoozeTimerRef.current) {
      clearTimeout(snoozeTimerRef.current);
      snoozeTimerRef.current = null;
    }
    snoozeTimerRef.current = setTimeout(() => {
      if (isAlarmActiveRef.current) {
        hasTriggeredArrivalRef.current = false;
        triggerSimultaneousAlarm();
      }
    }, minutes * 60 * 1000);
  };

  const previewAlarmTone = async (tone: AlarmTone) => {
    await alarmSoundService.previewTone(tone);
  };

  const testTriggerNotification = async () => {
    await triggerSimultaneousAlarm();
  };

  const dismissPermissionModal = () => {
    setShowPermissionModal(false);
  };

  const dismissAlarmAlertModal = () => {
    stopAlarmRinging();
  };

  return (
    <WakePointContext.Provider
      value={{
        destination,
        radius,
        isAlarmActive,
        isAlarmRinging,
        permissions,
        userLocation,
        currentDistanceMeters,
        alarmOptions,
        searchQuery,
        searchResults,
        isSearching,
        isSearchFocused,
        routeCoordinates,
        routeDistanceMeters,
        routeDurationSeconds,
        isCalculatingRoute,
        showPermissionModal,
        permissionErrorMessage,
        showAlarmAlertModal,
        setDestination,
        setRadius,
        setAlarmOptions,
        setIsSearchFocused,
        toggleAlarm,
        requestAllPermissions,
        searchDestinations,
        selectPresetDestination,
        setDestinationFromCoordinates,
        getCurrentLocation,
        testTriggerNotification,
        dismissPermissionModal,
        dismissAlarmAlertModal,
        stopAlarmRinging,
        snoozeAlarm,
        previewAlarmTone,
        triggerSimultaneousAlarm,
      }}
    >
      {children}
    </WakePointContext.Provider>
  );
};

export const useWakePoint = () => {
  const context = useContext(WakePointContext);
  if (!context) {
    throw new Error('useWakePoint must be used within a WakePointProvider');
  }
  return context;
};

// Aliases for seamless backward compatibility
export const WaypointProvider = WakePointProvider;
export const useWaypoint = useWakePoint;
