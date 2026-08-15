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
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useWaypoint } from '../context/WaypointContext';
import { AlarmOptionsModal } from './AlarmOptionsModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const RadiusSliderWidget: React.FC = () => {
  const {
    destination,
    radius,
    setRadius,
    isAlarmActive,
    toggleAlarm,
    permissions,
  } = useWaypoint();

  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleMinimize = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsMinimized(!isMinimized);
  };

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await toggleAlarm();
    } finally {
      setIsToggling(false);
    }
  };

  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      const km = (meters / 1000).toFixed(meters % 500 === 0 ? 1 : 2);
      return `${km} km`;
    }
    return `${meters} m`;
  };

  return (
    <View style={styles.container}>
      {/* Alarm Options Modal */}
      <AlarmOptionsModal
        visible={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
      />

      <View style={[styles.card, isMinimized && styles.cardMinimized]}>
        {/* Top Header Row with Collapse/Expand Handle */}
        <View style={styles.headerRow}>
          <View style={styles.destInfo}>
            <Text style={styles.destLabel}>TARGET DESTINATION</Text>
            <Text style={styles.destTitle} numberOfLines={1}>
              {destination ? destination.title : 'Tap map or drag marker'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            {!isMinimized && (
              <TouchableOpacity
                style={styles.optionsIconBtn}
                onPress={() => setShowOptionsModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="options-outline" size={20} color="#818CF8" />
              </TouchableOpacity>
            )}

            <View
              style={[
                styles.statusBadge,
                isAlarmActive ? styles.statusBadgeActive : styles.statusBadgeStandby,
              ]}
            >
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
                {isAlarmActive ? 'ACTIVE' : 'STANDBY'}
              </Text>
            </View>

            {/* Minimize / Expand Chevron Handle */}
            <TouchableOpacity
              style={styles.minimizeBtn}
              onPress={toggleMinimize}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isMinimized ? 'chevron-up-sharp' : 'chevron-down-sharp'}
                size={20}
                color="#94A3B8"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Minimized Compact View Bar */}
        {isMinimized ? (
          <View style={styles.minimizedRow}>
            <View style={styles.minimizedBadge}>
              <Ionicons name="radio-outline" size={14} color="#818CF8" />
              <Text style={styles.minimizedBadgeText}>Radius: {formatDistance(radius)}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.compactToggleBtn,
                isAlarmActive ? styles.toggleBtnActive : styles.toggleBtnInactive,
                !destination && styles.toggleBtnDisabled,
              ]}
              onPress={handleToggle}
              disabled={!destination || isToggling}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isAlarmActive ? 'stop' : 'power'}
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.compactToggleText}>
                {isAlarmActive ? 'Stop' : 'Start'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Full Expanded View */
          <>
            {/* Perimeter Radius Control Header */}
            <View style={styles.sliderHeaderRow}>
              <View style={styles.sliderLabelGroup}>
                <Ionicons name="radio-outline" size={16} color="#818CF8" />
                <Text style={styles.sliderLabel}>Perimeter Radius</Text>
              </View>
              <View style={styles.radiusBadge}>
                <Text style={styles.radiusBadgeText}>{formatDistance(radius)}</Text>
              </View>
            </View>

            {/* Radius Interactive Slider Component */}
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderRangeText}>100m</Text>
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
              <Text style={styles.sliderRangeText}>5.0km</Text>
            </View>

            {/* Permission Hint if missing */}
            {(!permissions.foregroundGranted || !permissions.backgroundGranted) && (
              <View style={styles.permWarning}>
                <Ionicons name="information-circle-sharp" size={14} color="#F59E0B" />
                <Text style={styles.permWarningText}>
                  Background location permission required for automatic alerts
                </Text>
              </View>
            )}

            {/* Primary Control Toggle Button */}
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                isAlarmActive ? styles.toggleBtnActive : styles.toggleBtnInactive,
                !destination && styles.toggleBtnDisabled,
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
                    name={isAlarmActive ? 'stop-circle-sharp' : 'shield-checkmark-sharp'}
                    size={22}
                    color="#FFFFFF"
                  />
                  <Text style={styles.toggleBtnText}>
                    {isAlarmActive ? 'Deactivate Alarm' : 'Activate Location Alarm'}
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
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  cardMinimized: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  destInfo: {
    flex: 1,
    marginRight: 10,
  },
  destLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
  },
  destTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionsIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  minimizeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(51, 65, 85, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  statusBadgeStandby: {
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.3)',
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
  minimizedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.4)',
  },
  minimizedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  minimizedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A5B4FC',
  },
  compactToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  compactToggleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  sliderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.4)',
  },
  sliderLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sliderLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  radiusBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  radiusBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A5B4FC',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },
  sliderRangeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  permWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 12,
    gap: 6,
  },
  permWarningText: {
    fontSize: 11,
    color: '#FBBF24',
    flex: 1,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  toggleBtnInactive: {
    backgroundColor: '#6366F1',
  },
  toggleBtnActive: {
    backgroundColor: '#EF4444',
  },
  toggleBtnDisabled: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
  toggleBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
