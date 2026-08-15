import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const WAYPOINT_PROXIMITY_TASK = 'WAYPOINT_PROXIMITY_TASK';

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
    await Notifications.setNotificationChannelAsync('waypoint-proximity-channel', {
      name: 'WayPoint Proximity Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250, 500, 250],
      lightColor: '#6366F1',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
  }
}

export interface ProximityTaskData {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
}

/**
 * Global background task definition required at top-level bundle scope
 */
TaskManager.defineTask(WAYPOINT_PROXIMITY_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[WAYPOINT_PROXIMITY_TASK] Geofencing task error:', error.message);
    return;
  }

  if (data) {
    const { eventType, region } = data as ProximityTaskData;

    if (eventType === Location.GeofencingEventType.Enter) {
      console.log(`[WAYPOINT_PROXIMITY_TASK] Entered geofence region: ${region.identifier}`);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📍 Waypoint Reached!',
          body: 'You have entered your target location radius.',
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250, 500, 250],
          data: {
            regionIdentifier: region.identifier,
            enteredAt: new Date().toISOString(),
          },
        },
        trigger: null, // Instant local notification trigger
      });
    }
  }
});
