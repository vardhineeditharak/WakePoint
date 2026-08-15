import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { WAYPOINT_PROXIMITY_TASK, setupNotificationChannel } from '../services/backgroundTask';
import { photonSearch, calculateRoutePath, GeoCoordinate } from '../services/apiService';

export interface Destination {
  latitude: number;
  longitude: number;
  title: string;
  address: string;
}

export interface AlarmOptions {
  soundTone: 'radar' | 'chime' | 'siren' | 'bell';
  vibrationStyle: 'pulse' | 'heavy' | 'gentle';
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

interface WaypointContextType {
  destination: Destination | null;
  radius: number; // in meters (100 to 5000)
  isAlarmActive: boolean;
  permissions: PermissionStatus;
  userLocation: Location.LocationObject | null;
  alarmOptions: AlarmOptions;
  searchQuery: string;
  searchResults: Destination[];
  isSearching: boolean;
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
  toggleAlarm: () => Promise<void>;
  requestAllPermissions: () => Promise<boolean>;
  searchDestinations: (query: string) => Promise<void>;
  selectPresetDestination: (preset: PresetLocation) => void;
  setDestinationFromCoordinates: (latitude: number, longitude: number) => Promise<void>;
  getCurrentLocation: () => Promise<void>;
  testTriggerNotification: () => Promise<void>;
  dismissPermissionModal: () => void;
  dismissAlarmAlertModal: () => void;
  triggerSimultaneousAlarm: () => Promise<void>;
}

const DEFAULT_ALARM_OPTIONS: AlarmOptions = {
  soundTone: 'radar',
  vibrationStyle: 'pulse',
  repeatAlert: false,
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

const WaypointContext = createContext<WaypointContextType | undefined>(undefined);

export const WaypointProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [destination, setDestinationState] = useState<Destination | null>({
    latitude: 12.9756,
    longitude: 77.6066,
    title: 'MG Road Central Metro Station',
    address: 'Bengaluru, Karnataka - 560001',
  });
  const [radius, setRadiusState] = useState<number>(1000); // Default 1000m (1km)
  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [alarmOptions, setAlarmOptionsState] = useState<AlarmOptions>(DEFAULT_ALARM_OPTIONS);
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Destination[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

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

  useEffect(() => {
    setupNotificationChannel();
    checkPermissionsSilently();
    fetchUserCurrentLocation();
  }, []);

  useEffect(() => {
    Location.hasStartedGeofencingAsync(WAYPOINT_PROXIMITY_TASK)
      .then((active) => setIsAlarmActive(active))
      .catch((err) => console.log('Geofence status check:', err.message));
  }, []);

  const updateRoute = useCallback(async () => {
    if (!destination || !userLocation) {
      setRouteCoordinates([]);
      setRouteDistanceMeters(0);
      setRouteDurationSeconds(0);
      return;
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
      } else {
        setRouteCoordinates([]);
      }
    } catch (error) {
      console.error('Route calculation error:', error);
      setRouteCoordinates([]);
    } finally {
      setIsCalculatingRoute(false);
    }
  }, [destination, userLocation]);

  useEffect(() => {
    updateRoute();
  }, [updateRoute]);

  const checkPermissionsSilently = async () => {
    try {
      const fg = await Location.getForegroundPermissionsAsync();
      const bg = await Location.getBackgroundPermissionsAsync();
      const notif = await Notifications.getPermissionsAsync();

      setPermissions({
        foregroundGranted: fg.granted,
        backgroundGranted: bg.granted,
        notificationsGranted: notif.granted,
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
          'Foreground location permission is required so WayPoint can track distance to your target destination.'
        );
        setShowPermissionModal(true);
        setPermissions((p) => ({ ...p, foregroundGranted: false }));
        return false;
      }

      const bgStatus = await Location.requestBackgroundPermissionsAsync();
      if (!bgStatus.granted) {
        setPermissionErrorMessage(
          'Background location permission ("Allow all the time") is required for WayPoint to trigger arrival alerts when your app is closed.'
        );
        setShowPermissionModal(true);
        setPermissions((p) => ({ ...p, foregroundGranted: true, backgroundGranted: false }));
        return false;
      }

      const notifStatus = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowSound: true, allowBadge: true },
      });
      if (!notifStatus.granted) {
        setPermissionErrorMessage(
          'Notification permission is required to sound proximity alerts when you enter your target radius.'
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
      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  };

  const fetchUserCurrentLocation = async () => {
    try {
      const fg = await Location.getForegroundPermissionsAsync();
      if (fg.granted) {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation(loc);
      }
    } catch (e) {
      console.log('Error fetching user position:', e);
    }
  };

  const setDestination = (dest: Destination | null) => {
    setDestinationState(dest);
    if (Haptics.impactAsync) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (isAlarmActive && dest) {
      startGeofencing(dest, radius);
    }
  };

  const setRadius = (newRadius: number) => {
    setRadiusState(newRadius);
    if (isAlarmActive && destination) {
      startGeofencing(destination, newRadius);
    }
  };

  const setAlarmOptions = (options: Partial<AlarmOptions>) => {
    setAlarmOptionsState((prev) => ({ ...prev, ...options }));
  };

  const startGeofencing = async (dest: Destination, r: number) => {
    try {
      const isAlreadyRunning = await Location.hasStartedGeofencingAsync(WAYPOINT_PROXIMITY_TASK);
      if (isAlreadyRunning) {
        await Location.stopGeofencingAsync(WAYPOINT_PROXIMITY_TASK);
      }

      await Location.startGeofencingAsync(WAYPOINT_PROXIMITY_TASK, [
        {
          identifier: `WAYPOINT_PIN_${Date.now()}`,
          latitude: dest.latitude,
          longitude: dest.longitude,
          radius: r,
          notifyOnEnter: true,
          notifyOnExit: false,
        },
      ]);
      console.log(`[WayPoint] Geofence active for ${dest.title} with radius ${r}m`);
    } catch (error: any) {
      console.error('[WayPoint] Failed to start geofence:', error.message);
    }
  };

  const stopGeofencing = async () => {
    try {
      const isRunning = await Location.hasStartedGeofencingAsync(WAYPOINT_PROXIMITY_TASK);
      if (isRunning) {
        await Location.stopGeofencingAsync(WAYPOINT_PROXIMITY_TASK);
      }
      console.log('[WayPoint] Geofence stopped.');
    } catch (error: any) {
      console.error('[WayPoint] Failed to stop geofence:', error.message);
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
      await stopGeofencing();
      setIsAlarmActive(false);
    } else {
      if (!destination) {
        Alert.alert('No Target Selected', 'Please select or search a location on the map before activating the alarm.');
        return;
      }

      const permOK = await requestAllPermissions();
      if (!permOK) {
        return;
      }

      await startGeofencing(destination, radius);
      setIsAlarmActive(true);
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
      console.error('Search destinations error:', err);
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

  const getCurrentLocation = async () => {
    try {
      const fg = await Location.requestForegroundPermissionsAsync();
      if (fg.granted) {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setUserLocation(loc);
      }
    } catch (e) {
      console.log('Location fetch error:', e);
    }
  };

  /**
   * Triggers simultaneous haptic sound vibration, active in-app modal, and local push notification
   */
  const triggerSimultaneousAlarm = async () => {
    // 1. Haptic Sound Vibration
    if (Haptics.notificationAsync) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // 2. Show In-App Alarm Alert Modal
    setShowAlarmAlertModal(true);

    // 3. Schedule High Priority Local Push Notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📍 Waypoint Reached!',
        body: `You have entered your target location radius: ${destination?.title || 'Target Destination'}`,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 250, 250, 250, 500, 250],
      },
      trigger: null,
    });
  };

  const testTriggerNotification = async () => {
    await triggerSimultaneousAlarm();
  };

  const dismissPermissionModal = () => {
    setShowPermissionModal(false);
  };

  const dismissAlarmAlertModal = () => {
    setShowAlarmAlertModal(false);
  };

  return (
    <WaypointContext.Provider
      value={{
        destination,
        radius,
        isAlarmActive,
        permissions,
        userLocation,
        alarmOptions,
        searchQuery,
        searchResults,
        isSearching,
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
        toggleAlarm,
        requestAllPermissions,
        searchDestinations,
        selectPresetDestination,
        setDestinationFromCoordinates,
        getCurrentLocation,
        testTriggerNotification,
        dismissPermissionModal,
        dismissAlarmAlertModal,
        triggerSimultaneousAlarm,
      }}
    >
      {children}
    </WaypointContext.Provider>
  );
};

export const useWaypoint = () => {
  const context = useContext(WaypointContext);
  if (!context) {
    throw new Error('useWaypoint must be used within a WaypointProvider');
  }
  return context;
};
