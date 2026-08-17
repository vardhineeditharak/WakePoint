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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWakePoint, AlarmOptions } from '../context/WakePointContext';
import { AlarmTone } from '../services/alarmSoundService';

interface AlarmOptionsModalProps {
  visible: boolean;
  onClose: () => void;
}

const SOUND_OPTIONS: { key: AlarmTone; label: string; desc: string; icon: string }[] = [
  { key: 'radar', label: 'Urgent Radar', desc: 'High-pitch rapid chirps', icon: 'radio-sharp' },
  { key: 'siren', label: 'Emergency Siren', desc: 'Alternating warble siren', icon: 'warning-sharp' },
  { key: 'bell', label: 'Classic Alarm Bell', desc: 'Metallic double bells', icon: 'alarm-sharp' },
  { key: 'chime', label: 'Upbeat Chime', desc: 'Rising 4-note melodic chord', icon: 'musical-notes-sharp' },
];

const VIBRATION_OPTIONS: { key: AlarmOptions['vibrationStyle']; label: string; desc: string }[] = [
  { key: 'pulse', label: 'Triple Pulse Rhythm', desc: 'Sharp rhythmic bursts' },
  { key: 'heavy', label: 'Continuous Heavy', desc: 'Relentless strong vibration' },
  { key: 'gentle', label: 'Soft Haptic Taps', desc: 'Subtle periodic vibrations' },
];

export const AlarmOptionsModal: React.FC<AlarmOptionsModalProps> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 16) + 12;
  const {
    alarmOptions,
    setAlarmOptions,
    testTriggerNotification,
    previewAlarmTone,
    isAlarmRinging,
    stopAlarmRinging,
  } = useWakePoint();

  const handleSelectSound = (tone: AlarmTone) => {
    setAlarmOptions({ soundTone: tone });
    previewAlarmTone(tone);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { paddingBottom: bottomPadding }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="options-sharp" size={22} color="#6366F1" />
              <Text style={styles.headerTitle}>WakePoint Alarm Settings</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Alarm Sound Tone Selection */}
            <Text style={styles.sectionLabel}>Alarm Sound Ringtone (Tap to Preview)</Text>
            <View style={styles.gridContainer}>
              {SOUND_OPTIONS.map((item) => {
                const isSelected = alarmOptions.soundTone === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.gridCard, isSelected && styles.gridCardSelected]}
                    onPress={() => handleSelectSound(item.key)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.gridIconRow}>
                      <Ionicons
                        name={item.icon as any}
                        size={22}
                        color={isSelected ? '#818CF8' : '#64748B'}
                      />
                      <Ionicons
                        name="volume-medium-outline"
                        size={16}
                        color={isSelected ? '#A5B4FC' : '#475569'}
                      />
                    </View>
                    <Text style={[styles.gridCardText, isSelected && styles.gridCardTextSelected]}>
                      {item.label}
                    </Text>
                    <Text style={styles.gridCardDesc}>{item.desc}</Text>
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
                    <View style={styles.listTextCol}>
                      <Text style={[styles.listRowText, isSelected && styles.listRowTextSelected]}>
                        {item.label}
                      </Text>
                      <Text style={styles.listRowSub}>{item.desc}</Text>
                    </View>
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
                <Text style={styles.switchTitle}>Repeat Notifications</Text>
                <Text style={styles.switchSubtitle}>
                  Keep ringing and pulsing vibration until explicitly dismissed
                </Text>
              </View>
              <Switch
                value={alarmOptions.repeatAlert}
                onValueChange={(val) => setAlarmOptions({ repeatAlert: val })}
                trackColor={{ false: '#334155', true: '#6366F1' }}
                thumbColor={alarmOptions.repeatAlert ? '#A5B4FC' : '#94A3B8'}
              />
            </View>

            {/* Dynamic Test / Stop Alarm Button */}
            <TouchableOpacity
              style={[styles.testBtn, isAlarmRinging && styles.testBtnRinging]}
              onPress={async () => {
                if (isAlarmRinging) {
                  await stopAlarmRinging();
                } else {
                  onClose();
                  await testTriggerNotification();
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isAlarmRinging ? 'stop-circle-sharp' : 'play-circle-sharp'}
                size={22}
                color={isAlarmRinging ? '#FFFFFF' : '#818CF8'}
              />
              <Text
                style={[
                  styles.testBtnText,
                  isAlarmRinging && styles.testBtnTextRinging,
                ]}
              >
                {isAlarmRinging ? 'STOP RINGING ALARM' : 'Test Full Loud Ringing Alarm'}
              </Text>
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '84%',
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
    fontSize: 11,
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
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    position: 'relative',
  },
  gridCardSelected: {
    borderColor: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
  },
  gridIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridCardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 8,
  },
  gridCardTextSelected: {
    color: '#F8FAFC',
  },
  gridCardDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  optionsList: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
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
  listTextCol: {
    flex: 1,
    marginRight: 10,
  },
  listRowText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  listRowTextSelected: {
    color: '#F8FAFC',
  },
  listRowSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
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
    borderRadius: 16,
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
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
    borderWidth: 1.5,
    borderColor: '#6366F1',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 10,
    marginBottom: 24,
  },
  testBtnRinging: {
    backgroundColor: '#EF4444',
    borderColor: '#DC2626',
  },
  testBtnText: {
    color: '#A5B4FC',
    fontSize: 14,
    fontWeight: '700',
  },
  testBtnTextRinging: {
    color: '#FFFFFF',
  },
  doneBtn: {
    backgroundColor: '#6366F1',
    marginHorizontal: 20,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
