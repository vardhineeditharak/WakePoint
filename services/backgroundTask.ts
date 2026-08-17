import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { alarmSoundService, AlarmTone, VibrationStyle } from './alarmSoundService';

export const WAKEPOINT_PROXIMITY_TASK = 'WAKEPOINT_PROXIMITY_TASK';
export const WAYPOINT_PROXIMITY_TASK = WAKEPOINT_PROXIMITY_TASK; // Alias for backward compatibility

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Shared in-memory target state for background execution
 */
export interface BackgroundTarget {
  latitude: number;
  longitude: number;
  radius: number;
  title: string;
  soundTone: AlarmTone;
  vibrationStyle: VibrationStyle;
}

let sharedTarget: BackgroundTarget | null = null;
let hasTriggeredAlarmInMemory = false;

export function setSharedBackgroundTarget(target: BackgroundTarget | null) {
  sharedTarget = target;
  hasTriggeredAlarmInMemory = false;
}

export function getSharedBackgroundTarget(): BackgroundTarget | null {
  return sharedTarget;
}

/**
 * Fast offline Haversine distance calculator
 */
function calculateHaversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Configure high importance notification channel for Android device compatibility
 */
export async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('wakepoint-proximity-channel', {
        name: 'WakePoint Arrival Alarms',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500, 200, 1000],
        lightColor: '#10B981',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    } catch (e) {
      console.log('[WakePoint] Notification channel setup note:', e);
    }
  }
}

export interface ProximityTaskData {
  eventType?: Location.GeofencingEventType;
  region?: Location.LocationRegion;
  locations?: Location.LocationObject[];
}

/**
 * Global background task definition required at top-level bundle scope
 * Handles BOTH Location.startLocationUpdatesAsync (Foreground Service) AND Location.startGeofencingAsync
 */
TaskManager.defineTask(WAKEPOINT_PROXIMITY_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[WAKEPOINT_PROXIMITY_TASK] Background task error:', error.message);
    return;
  }

  if (!data) return;

  const taskData = data as ProximityTaskData;

  // Case 1: Triggered by native geofencing enter event
  if (taskData.eventType === Location.GeofencingEventType.Enter) {
    console.log('[WAKEPOINT_PROXIMITY_TASK] Entered native geofence region');
    if (!hasTriggeredAlarmInMemory) {
      hasTriggeredAlarmInMemory = true;
      const target = getSharedBackgroundTarget();
      await alarmSoundService.startAlarm(
        target?.soundTone || 'radar',
        target?.vibrationStyle || 'pulse'
      );
      await triggerArrivalNotification(target?.title);
    }
    return;
  }

  // Case 2: Triggered by background location updates (Location.startLocationUpdatesAsync)
  if (Array.isArray(taskData.locations) && taskData.locations.length > 0) {
    const target = getSharedBackgroundTarget();
    if (!target || hasTriggeredAlarmInMemory) return;

    for (const loc of taskData.locations) {
      const distance = calculateHaversineMeters(
        loc.coords.latitude,
        loc.coords.longitude,
        target.latitude,
        target.longitude
      );

      console.log(`[WAKEPOINT_PROXIMITY_TASK] BG Distance: ${distance}m (Radius: ${target.radius}m)`);

      if (distance <= target.radius) {
        hasTriggeredAlarmInMemory = true;
        console.log('[WAKEPOINT_PROXIMITY_TASK] Target reached in background! Ringing alarm...');

        await alarmSoundService.startAlarm(target.soundTone, target.vibrationStyle);
        await triggerArrivalNotification(target.title);
        break;
      }
    }
  }
});

async function triggerArrivalNotification(destinationTitle?: string) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 WAKE UP! You Have Arrived!',
        body: destinationTitle
          ? `You have entered the arrival perimeter of ${destinationTitle}!`
          : 'You have entered your target destination perimeter.',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 500, 200, 500, 200, 1000],
        data: {
          enteredAt: new Date().toISOString(),
        },
      },
      trigger: null,
    });
  } catch (err) {
    console.log('[WakePoint] Notification trigger notice:', err);
  }
}
