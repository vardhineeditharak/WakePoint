import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWakePoint } from '../context/WakePointContext';

export const AlarmAlertModal: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    showAlarmAlertModal,
    stopAlarmRinging,
    snoozeAlarm,
    destination,
    currentDistanceMeters,
  } = useWakePoint();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (showAlarmAlertModal) {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.25,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 700,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 0.9,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.4,
              duration: 700,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0.4);
    }
  }, [showAlarmAlertModal, pulseAnim, glowAnim]);

  return (
    <Modal
      visible={showAlarmAlertModal}
      animationType="slide"
      transparent={true}
      onRequestClose={stopAlarmRinging}
    >
      <View style={[styles.overlay, { paddingBottom: Math.max(insets.bottom, 20) + 10 }]}>
        <View style={styles.card}>
          {/* Animated Pulsing Alarm Bell Badge */}
          <View style={styles.pulseWrapper}>
            <Animated.View
              style={[
                styles.pulseHalo,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: glowAnim,
                },
              ]}
            />
            <View style={styles.iconPulseBadge}>
              <Ionicons name="alarm-sharp" size={42} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.alarmBadge}>🚨 WAKE UP! ARRIVAL ALARM</Text>

          <Text style={styles.destinationName} numberOfLines={2}>
            {destination ? destination.title : 'Target Location'}
          </Text>

          <Text style={styles.message}>
            You have crossed into your destination radius
            {currentDistanceMeters !== null ? ` (~${currentDistanceMeters}m away)` : ''}!
            Wake up and prepare for arrival.
          </Text>

          {/* Primary Big Stop Alarm Button */}
          <TouchableOpacity
            style={styles.stopBtn}
            onPress={stopAlarmRinging}
            activeOpacity={0.8}
          >
            <Ionicons name="stop-circle-sharp" size={26} color="#FFFFFF" />
            <Text style={styles.stopBtnText}>STOP & SILENCE ALARM</Text>
          </TouchableOpacity>

          {/* Secondary Snooze Button */}
          <TouchableOpacity
            style={styles.snoozeBtn}
            onPress={() => snoozeAlarm(5)}
            activeOpacity={0.8}
          >
            <Ionicons name="time-outline" size={20} color="#CBD5E1" />
            <Text style={styles.snoozeBtnText}>Snooze for 5 Minutes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 15, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 32,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.7,
    shadowRadius: 32,
    elevation: 20,
  },
  pulseWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pulseHalo: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
  },
  iconPulseBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 12,
  },
  alarmBadge: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  destinationName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  stopBtn: {
    width: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 12,
  },
  stopBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  snoozeBtn: {
    width: '100%',
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.4)',
  },
  snoozeBtnText: {
    color: '#CBD5E1',
    fontSize: 15,
    fontWeight: '600',
  },
});
