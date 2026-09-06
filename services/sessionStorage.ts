import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlarmTone, VibrationStyle } from './alarmSoundService';

export const WAKEPOINT_SESSION_KEY = '@wakepoint_active_session';

export interface StoredDestination {
  latitude: number;
  longitude: number;
  title: string;
  address: string;
}

export interface StoredAlarmOptions {
  soundTone: AlarmTone;
  vibrationStyle: VibrationStyle;
  repeatAlert: boolean;
}

export interface ActiveAlarmSession {
  destination: StoredDestination | null;
  radius: number;
  isAlarmActive: boolean;
  alarmOptions: StoredAlarmOptions;
  savedAt: number;
}

/**
 * Saves active alarm session to persistent device storage.
 * Ensures state survives process kills and app removal from recent tasks.
 */
export async function saveAlarmSession(session: ActiveAlarmSession): Promise<void> {
  try {
    const jsonValue = JSON.stringify(session);
    await AsyncStorage.setItem(WAKEPOINT_SESSION_KEY, jsonValue);
  } catch (e) {
    console.warn('[WakePoint] Failed to persist alarm session:', e);
  }
}

/**
 * Retrieves the stored alarm session from persistent device storage.
 */
export async function loadAlarmSession(): Promise<ActiveAlarmSession | null> {
  try {
    const jsonValue = await AsyncStorage.getItem(WAKEPOINT_SESSION_KEY);
    if (jsonValue != null) {
      return JSON.parse(jsonValue) as ActiveAlarmSession;
    }
  } catch (e) {
    console.warn('[WakePoint] Failed to load alarm session:', e);
  }
  return null;
}

/**
 * Clears the active alarm session from persistent device storage.
 */
export async function clearAlarmSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(WAKEPOINT_SESSION_KEY);
  } catch (e) {
    console.warn('[WakePoint] Failed to clear alarm session:', e);
  }
}
