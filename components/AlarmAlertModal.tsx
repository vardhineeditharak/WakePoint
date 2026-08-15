import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWaypoint } from '../context/WaypointContext';

export const AlarmAlertModal: React.FC = () => {
  const { showAlarmAlertModal, dismissAlarmAlertModal, destination } = useWaypoint();

  return (
    <Modal
      visible={showAlarmAlertModal}
      animationType="fade"
      transparent={true}
      onRequestClose={dismissAlarmAlertModal}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconPulseBadge}>
            <Ionicons name="notifications-sharp" size={36} color="#FFFFFF" />
          </View>

          <Text style={styles.title}>📍 Waypoint Reached!</Text>

          <Text style={styles.destinationName}>
            {destination ? destination.title : 'Target Location'}
          </Text>

          <Text style={styles.message}>
            You have crossed into your target proximity perimeter. Your alarm has sounded!
          </Text>

          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={dismissAlarmAlertModal}
            activeOpacity={0.8}
          >
            <Ionicons name="stop-circle-sharp" size={22} color="#FFFFFF" />
            <Text style={styles.dismissBtnText}>Silence & Dismiss Alarm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 28,
    padding: 26,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
  },
  iconPulseBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 6,
  },
  destinationName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  dismissBtn: {
    width: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dismissBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
