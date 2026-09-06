import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { alarmSoundService, AlarmTone, VibrationStyle } from './alarmSoundService';
import { loadAlarmSession } from './sessionStorage';

export const WAKEPOINT_PROXIMITY_TASK = 'WAKEPOINT_PROXIMITY_TASK';
export const WAYPOINT_PROXIMITY_TASK = WAKEPOINT_PROXIMITY_TASK; // Alias for backward compatibility
export const WAKEPOINT_ACTIVE_CATEGORY = 'WAKEPOINT_ACTIVE_CATEGORY';
export const ACTION_TURN_OFF_ALARM = 'ACTION_TURN_OFF_ALARM';
export const WAKEPOINT_ACTIVE_NOTIFICATION_ID = 'wakepoint_active_monitoring_notification';
export const WAKEPOINT_ARRIVAL_NOTIFICATION_ID = 'wakepoint_arrival_alarm_notification';

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

export const WAKEPOINT_NOTIFICATION_CHANNEL = 'wakepoint-proximity-channel';

/**
 * Configure high importance notification channel & persistent interactive categories
 */
export async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(WAKEPOINT_NOTIFICATION_CHANNEL, {
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

  // Register interactive notification category with 'Turn Off Alarm' action button
  try {
    await Notifications.setNotificationCategoryAsync(WAKEPOINT_ACTIVE_CATEGORY, [
      {
        identifier: ACTION_TURN_OFF_ALARM,
        buttonTitle: 'Turn Off Alarm',
        options: {
          isDestructive: true,
          opensAppToForeground: true,
        },
      },
    ]);
  } catch (e) {
    console.log('[WakePoint] Notification category setup note:', e);
  }
}

/**
 * Posts or updates the ongoing sticky notification in the notification panel.
 * Stays pinned and cannot be swiped away on Android while alarm is active.
 */
export async function postOrUpdateActiveNotification(
  title: string,
  radius: number,
  distanceMeters?: number | null
) {
  try {
    const perimeterText = radius >= 1000 ? `${(radius / 1000).toFixed(1)}km` : `${radius}m`;
    const distanceText =
      distanceMeters != null
        ? distanceMeters >= 1000
          ? `${(distanceMeters / 1000).toFixed(1)}km away`
          : `${Math.round(distanceMeters)}m away`
        : 'Calculating distance...';

    await Notifications.scheduleNotificationAsync({
      identifier: WAKEPOINT_ACTIVE_NOTIFICATION_ID,
      content: {
        title: `WakePoint Active: ${title}`,
        body: `${distanceText} • Arrival Perimeter: ${perimeterText}`,
        sound: false,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        sticky: true,
        autoDismiss: false,
        categoryIdentifier: WAKEPOINT_ACTIVE_CATEGORY,
        data: {
          channelId: WAKEPOINT_NOTIFICATION_CHANNEL,
          action: 'ACTIVE_TRACKING',
        },
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('[WakePoint] Error updating active notification:', err);
  }
}

/**
 * Dismisses ongoing monitoring and arrival notifications from the shade.
 */
export async function dismissActiveNotification() {
  try {
    await Notifications.dismissNotificationAsync(WAKEPOINT_ACTIVE_NOTIFICATION_ID);
    await Notifications.dismissNotificationAsync(WAKEPOINT_ARRIVAL_NOTIFICATION_ID);
  } catch (err) {
    console.warn('[WakePoint] Error dismissing active notification:', err);
  }
}

/**
 * Encodes target metadata into a compact string for OS-level geofence persistence
 */
export function encodeGeofenceIdentifier(target: BackgroundTarget): string {
  const safeTitle = encodeURIComponent(target.title || 'Pinned Waypoint');
  return `WP_GEO|${target.latitude}|${target.longitude}|${target.radius}|${target.soundTone}|${target.vibrationStyle}|${safeTitle}`;
}

/**
 * Decodes target metadata from OS geofence region identifier on headless wakeup
 */
export function parseGeofenceIdentifier(identifier?: string): BackgroundTarget | null {
  if (!identifier || !identifier.startsWith('WP_GEO|')) {
    return null;
  }
  try {
    const parts = identifier.split('|');
    if (parts.length >= 7) {
      return {
        latitude: parseFloat(parts[1]),
        longitude: parseFloat(parts[2]),
        radius: parseFloat(parts[3]),
        soundTone: parts[4] as AlarmTone,
        vibrationStyle: parts[5] as VibrationStyle,
        title: decodeURIComponent(parts[6]),
      };
    }
  } catch (e) {
    console.warn('[WakePoint] Error decoding geofence identifier:', e);
  }
  return null;
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
      let target = getSharedBackgroundTarget();

      // If in-memory target was cleared by OS process cycle, restore from geofence region identifier or session storage
      if (!target && taskData.region?.identifier) {
        target = parseGeofenceIdentifier(taskData.region.identifier);
      }
      if (!target) {
        try {
          const session = await loadAlarmSession();
          if (session?.isAlarmActive && session.destination) {
            target = {
              latitude: session.destination.latitude,
              longitude: session.destination.longitude,
              radius: session.radius,
              title: session.destination.title,
              soundTone: session.alarmOptions.soundTone,
              vibrationStyle: session.alarmOptions.vibrationStyle,
            };
            setSharedBackgroundTarget(target);
          }
        } catch (_) {}
      }

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
    let target = getSharedBackgroundTarget();
    if (!target) {
      try {
        const session = await loadAlarmSession();
        if (session?.isAlarmActive && session.destination) {
          target = {
            latitude: session.destination.latitude,
            longitude: session.destination.longitude,
            radius: session.radius,
            title: session.destination.title,
            soundTone: session.alarmOptions.soundTone,
            vibrationStyle: session.alarmOptions.vibrationStyle,
          };
          setSharedBackgroundTarget(target);
        }
      } catch (_) {}
    }

    if (!target || hasTriggeredAlarmInMemory) return;

    for (const loc of taskData.locations) {
      const distance = calculateHaversineMeters(
        loc.coords.latitude,
        loc.coords.longitude,
        target.latitude,
        target.longitude
      );

      console.log(`[WAKEPOINT_PROXIMITY_TASK] BG Distance: ${distance}m (Radius: ${target.radius}m)`);

      // Update sticky notification with fresh distance periodically
      postOrUpdateActiveNotification(target.title, target.radius, distance).catch(() => {});

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
      identifier: WAKEPOINT_ARRIVAL_NOTIFICATION_ID,
      content: {
        title: '🚨 WAKE UP! You Have Arrived!',
        body: destinationTitle
          ? `You have entered the arrival perimeter of ${destinationTitle}!`
          : 'You have entered your target destination perimeter.',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 500, 200, 500, 200, 1000],
        sticky: true,
        autoDismiss: false,
        data: {
          enteredAt: new Date().toISOString(),
          channelId: WAKEPOINT_NOTIFICATION_CHANNEL,
        },
        categoryIdentifier: WAKEPOINT_ACTIVE_CATEGORY,
      },
      trigger: {
        channelId: WAKEPOINT_NOTIFICATION_CHANNEL,
      } as any,
    });
  } catch (err) {
    console.log('[WakePoint] Notification trigger notice:', err);
  }
}
