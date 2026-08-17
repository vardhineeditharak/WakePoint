import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWakePoint } from '../context/WakePointContext';
import { AlarmOptionsModal } from './AlarmOptionsModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PRESET_RADII = [
  { label: '250m', value: 250 },
  { label: '500m', value: 500 },
  { label: '1 km', value: 1000 },
  { label: '2 km', value: 2000 },
  { label: '5 km', value: 5000 },
];

export const RadiusSliderWidget: React.FC = () => {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 12) + 8;
  const {
    destination,
    setDestination,
    radius,
    setRadius,
    isAlarmActive,
    toggleAlarm,
    currentDistanceMeters,
    routeDistanceMeters,
    routeDurationSeconds,
    isSearchFocused,
  } = useWakePoint();

  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleMinimize = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsMinimized((prev) => !prev);
  };

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await toggleAlarm();
    } finally {
      setIsToggling(false);
    }
  };

  const handleDiscardLocation = () => {
    if (isAlarmActive) {
      Alert.alert(
        'Discard Destination',
        'This will turn off the active arrival alarm and clear your pinned destination. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard & Turn Off',
            style: 'destructive',
            onPress: async () => {
              await toggleAlarm();
              setDestination(null);
            },
          },
        ]
      );
    } else {
      setDestination(null);
    }
  };

  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.ceil(seconds / 60);
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}h ${remMins}m`;
    }
    return `${mins} min`;
  };

  if (isSearchFocused) {
    return null;
  }

  return (
    <View style={[styles.container, { bottom: bottomOffset }]}>
      <AlarmOptionsModal
        visible={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
      />

      <View style={[styles.card, isMinimized && styles.cardMinimized]}>
        {/* Top Header Row with Status, Destination & Controls */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.destInfoCol}
            onPress={isMinimized ? toggleMinimize : undefined}
            activeOpacity={isMinimized ? 0.7 : 1}
          >
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  isAlarmActive ? styles.statusDotActive : styles.statusDotStandby,
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  isAlarmActive ? styles.statusTextActive : styles.statusTextStandby,
                ]}
              >
                {isAlarmActive ? 'ALARM ACTIVE' : 'READY'}
              </Text>
            </View>
            <Text style={styles.destTitle} numberOfLines={1}>
              {destination ? destination.title : 'Tap map or search destination'}
            </Text>
          </TouchableOpacity>

          {/* Header Action Buttons */}
          <View style={styles.headerActions}>
            {destination && (
              <TouchableOpacity
                style={styles.discardBtn}
                onPress={handleDiscardLocation}
                activeOpacity={0.7}
                accessibilityLabel="Discard destination"
              >
                <Ionicons name="trash-outline" size={15} color="#F87171" />
              </TouchableOpacity>
            )}

            {!isMinimized && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setShowOptionsModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="settings-sharp" size={16} color="#818CF8" />
              </TouchableOpacity>
            )}

            {/* Minimize / Expand Button */}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={toggleMinimize}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isMinimized ? 'chevron-up-sharp' : 'chevron-down-sharp'}
                size={18}
                color="#94A3B8"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Minimized View Bar */}
        {isMinimized ? (
          <View style={styles.minimizedRow}>
            <View style={styles.minimizedBadge}>
              <Ionicons name="radio-outline" size={13} color="#818CF8" />
              <Text style={styles.minimizedBadgeText}>Radius: {formatDistance(radius)}</Text>
            </View>

            {destination && currentDistanceMeters !== null && (
              <View style={styles.minimizedBadge}>
                <Ionicons name="navigate-outline" size={13} color="#34D399" />
                <Text style={styles.minimizedBadgeText}>{formatDistance(currentDistanceMeters)}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.compactToggleBtn,
                isAlarmActive ? styles.compactToggleBtnActive : styles.compactToggleBtnInactive,
                !destination && styles.compactToggleBtnDisabled,
              ]}
              onPress={handleToggle}
              disabled={!destination || isToggling}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isAlarmActive ? 'stop' : 'notifications'}
                size={14}
                color="#FFFFFF"
              />
              <Text style={styles.compactToggleText}>
                {isAlarmActive ? 'Turn Off' : 'Set Alarm'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Full Expanded View */
          <>
            {/* Distance & ETA Info Strip (when destination selected) */}
            {destination && (
              <View style={styles.statsStrip}>
                <View style={styles.statItem}>
                  <Ionicons name="navigate-outline" size={14} color="#818CF8" />
                  <Text style={styles.statLabel}>Distance: </Text>
                  <Text style={styles.statValue}>
                    {currentDistanceMeters !== null
                      ? formatDistance(currentDistanceMeters)
                      : routeDistanceMeters > 0
                      ? formatDistance(routeDistanceMeters)
                      : '--'}
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <Ionicons name="time-outline" size={14} color="#34D399" />
                  <Text style={styles.statLabel}>Est. Time: </Text>
                  <Text style={styles.statValue}>
                    {routeDurationSeconds > 0 ? formatDuration(routeDurationSeconds) : '< 1 min'}
                  </Text>
                </View>
              </View>
            )}

            {/* Radius Slider Section */}
            <View style={styles.sliderSection}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sliderTitle}>Trigger Alarm Radius</Text>
                <View style={styles.radiusPill}>
                  <Text style={styles.radiusPillText}>{formatDistance(radius)}</Text>
                </View>
              </View>

              <Slider
                style={styles.slider}
                minimumValue={100}
                maximumValue={5000}
                step={50}
                value={radius}
                onValueChange={setRadius}
                minimumTrackTintColor="#6366F1"
                maximumTrackTintColor="#334155"
                thumbTintColor="#818CF8"
              />

              {/* Quick Preset Chips */}
              <View style={styles.presetsRow}>
                {PRESET_RADII.map((preset) => {
                  const isSelected = Math.abs(radius - preset.value) < 30;
                  return (
                    <TouchableOpacity
                      key={preset.label}
                      style={[styles.presetChip, isSelected && styles.presetChipSelected]}
                      onPress={() => setRadius(preset.value)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          isSelected && styles.presetChipTextSelected,
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                isAlarmActive ? styles.actionBtnActive : styles.actionBtnInactive,
                !destination && styles.actionBtnDisabled,
              ]}
              onPress={handleToggle}
              disabled={!destination || isToggling}
              activeOpacity={0.8}
            >
              {isToggling ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name={isAlarmActive ? 'stop-circle-sharp' : 'notifications-sharp'}
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.actionBtnText}>
                    {isAlarmActive ? 'Turn Off Arrival Alarm' : 'Set Arrival Alarm'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  cardMinimized: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  destInfoCol: {
    flex: 1,
    marginRight: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: '#10B981',
  },
  statusDotStandby: {
    backgroundColor: '#94A3B8',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusTextActive: {
    color: '#10B981',
  },
  statusTextStandby: {
    color: '#94A3B8',
  },
  destTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(51, 65, 85, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
  },
  discardBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  minimizedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.35)',
    gap: 6,
  },
  minimizedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  minimizedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A5B4FC',
  },
  compactToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 5,
  },
  compactToggleBtnInactive: {
    backgroundColor: '#6366F1',
  },
  compactToggleBtnActive: {
    backgroundColor: '#EF4444',
  },
  compactToggleBtnDisabled: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
  compactToggleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    marginBottom: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#334155',
  },
  sliderSection: {
    marginBottom: 12,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sliderTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  radiusPill: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  radiusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A5B4FC',
  },
  slider: {
    height: 32,
    marginHorizontal: -4,
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  presetChipSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  presetChipTextSelected: {
    color: '#FFFFFF',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionBtnInactive: {
    backgroundColor: '#6366F1',
  },
  actionBtnActive: {
    backgroundColor: '#EF4444',
  },
  actionBtnDisabled: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
