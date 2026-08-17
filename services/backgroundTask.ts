import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { alarmSoundService } from './alarmSoundService';

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
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
}

/**
 * Global background task definition required at top-level bundle scope
 */
TaskManager.defineTask(WAKEPOINT_PROXIMITY_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[WAKEPOINT_PROXIMITY_TASK] Geofencing task error:', error.message);
    return;
  }

  if (data) {
    const { eventType, region } = data as ProximityTaskData;

    if (eventType === Location.GeofencingEventType.Enter) {
      console.log(`[WAKEPOINT_PROXIMITY_TASK] Entered geofence region: ${region.identifier}`);

      // Start loud audio and vibration alarm
      await alarmSoundService.startAlarm('radar', 'pulse');

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🚨 WAKE UP! You Have Arrived!',
            body: 'You have entered your target destination perimeter.',
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 500, 200, 500, 200, 1000],
            data: {
              regionIdentifier: region.identifier,
              enteredAt: new Date().toISOString(),
            },
          },
          trigger: null, // Instant local notification trigger
        });
      } catch (err) {
        console.log('[WakePoint] Notification trigger notice:', err);
      }
    }
  }
});
