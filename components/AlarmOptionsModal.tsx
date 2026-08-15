import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWaypoint, AlarmOptions } from '../context/WaypointContext';

interface AlarmOptionsModalProps {
  visible: boolean;
  onClose: () => void;
}

const SOUND_OPTIONS: { key: AlarmOptions['soundTone']; label: string; icon: string }[] = [
  { key: 'radar', label: 'Urgent Radar', icon: 'radio-sharp' },
  { key: 'chime', label: 'Gentle Chime', icon: 'notifications-sharp' },
  { key: 'siren', label: 'Emergency Siren', icon: 'warning-sharp' },
  { key: 'bell', label: 'Classic Bell', icon: 'alarm-sharp' },
];

const VIBRATION_OPTIONS: { key: AlarmOptions['vibrationStyle']; label: string }[] = [
  { key: 'pulse', label: 'Triple Pulse' },
  { key: 'heavy', label: 'Continuous Heavy' },
  { key: 'gentle', label: 'Soft Haptic Tap' },
];

export const AlarmOptionsModal: React.FC<AlarmOptionsModalProps> = ({ visible, onClose }) => {
  const { alarmOptions, setAlarmOptions, testTriggerNotification } = useWaypoint();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="options-sharp" size={22} color="#6366F1" />
              <Text style={styles.headerTitle}>Proximity Alarm Options</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Alarm Sound Tone Selection */}
            <Text style={styles.sectionLabel}>Notification Sound Tone</Text>
            <View style={styles.gridContainer}>
              {SOUND_OPTIONS.map((item) => {
                const isSelected = alarmOptions.soundTone === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.gridCard, isSelected && styles.gridCardSelected]}
                    onPress={() => setAlarmOptions({ soundTone: item.key })}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={24}
                      color={isSelected ? '#818CF8' : '#64748B'}
                    />
                    <Text style={[styles.gridCardText, isSelected && styles.gridCardTextSelected]}>
                      {item.label}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#6366F1"
                        style={styles.checkBadge}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Vibration Pattern Selection */}
            <Text style={styles.sectionLabel}>Vibration Pattern</Text>
            <View style={styles.optionsList}>
              {VIBRATION_OPTIONS.map((item) => {
                const isSelected = alarmOptions.vibrationStyle === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.listRow, isSelected && styles.listRowSelected]}
                    onPress={() => setAlarmOptions({ vibrationStyle: item.key })}
                  >
                    <Text style={[styles.listRowText, isSelected && styles.listRowTextSelected]}>
                      {item.label}
                    </Text>
                    <View style={styles.radioOuter}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Continuous Alert Switch */}
            <View style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <Text style={styles.switchTitle}>Continuous Alerting</Text>
                <Text style={styles.switchSubtitle}>
                  Repeat alert notifications every 15 seconds while inside perimeter
                </Text>
              </View>
              <Switch
                value={alarmOptions.repeatAlert}
                onValueChange={(val) => setAlarmOptions({ repeatAlert: val })}
                trackColor={{ false: '#334155', true: '#6366F1' }}
                thumbColor={alarmOptions.repeatAlert ? '#A5B4FC' : '#94A3B8'}
              />
            </View>

            {/* Test Trigger Button */}
            <TouchableOpacity
              style={styles.testBtn}
              onPress={testTriggerNotification}
              activeOpacity={0.8}
            >
              <Ionicons name="volume-high" size={20} color="#F8FAFC" />
              <Text style={styles.testBtnText}>Test Push Notification Alert</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Footer Done Button */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.doneBtnText}>Save Preferences</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '82%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    position: 'relative',
  },
  gridCardSelected: {
    borderColor: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  gridCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 8,
  },
  gridCardTextSelected: {
    color: '#F8FAFC',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  optionsList: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    marginBottom: 20,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.4)',
  },
  listRowSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  listRowText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  listRowTextSelected: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366F1',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    marginBottom: 20,
  },
  switchTextCol: {
    flex: 1,
    marginRight: 12,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  switchSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: '#6366F1',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 24,
  },
  testBtnText: {
    color: '#818CF8',
    fontSize: 14,
    fontWeight: '600',
  },
  doneBtn: {
    backgroundColor: '#6366F1',
    marginHorizontal: 20,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
