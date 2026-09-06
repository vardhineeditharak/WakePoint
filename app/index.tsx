import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWakePoint } from '../context/WakePointContext';
import {
  WakeMapView,
  WakeMapRef,
  SearchBar,
  RadiusSliderWidget,
  PermissionModal,
  AlarmAlertModal,
} from '../components';

export default function MainMapScreen() {
  const insets = useSafeAreaInsets();
  const topDockOffset = Math.max(insets.top, 16) + 64;
  const mapRef = useRef<WakeMapRef | null>(null);
  const [mapTheme, setMapTheme] = useState<'dark' | 'satellite' | 'streets'>('dark');

  const {
    destination,
    radius,
    isAlarmActive,
    userLocation,
    routeCoordinates,
    setDestinationFromCoordinates,
    getCurrentLocation,
    isSearchFocused,
  } = useWakePoint();

  const hasCenteredInitialLocation = useRef(false);
  const prevDestinationRef = useRef<typeof destination>(null);

  // Auto-center on user's live position when location is first acquired or when destination is cleared
  useEffect(() => {
    if (userLocation && !destination && !hasCenteredInitialLocation.current && mapRef.current) {
      hasCenteredInitialLocation.current = true;
      mapRef.current.flyTo(userLocation.coords.latitude, userLocation.coords.longitude, 15);
    }
  }, [userLocation, destination]);

  useEffect(() => {
    // When destination is cleared / discarded, refocus back towards user current location
    if (prevDestinationRef.current && !destination && userLocation && mapRef.current) {
      mapRef.current.flyTo(userLocation.coords.latitude, userLocation.coords.longitude, 15);
    }
    prevDestinationRef.current = destination;
  }, [destination, userLocation]);

  // Smoothly fly camera when destination changes
  useEffect(() => {
    if (destination && mapRef.current) {
      mapRef.current.flyTo(destination.latitude, destination.longitude, 14);
    }
  }, [destination]);

  // Fit bounds when route coordinates are calculated
  useEffect(() => {
    if (routeCoordinates && routeCoordinates.length > 1 && mapRef.current) {
      mapRef.current.fitBounds(routeCoordinates);
    }
  }, [routeCoordinates]);

  const handleCenterUserLocation = async () => {
    // 1. Instant 0ms response: Fly immediately if we already have coordinates
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo(userLocation.coords.latitude, userLocation.coords.longitude, 16);
    }

    // 2. Refresh GPS coordinates in parallel
    try {
      const loc = await getCurrentLocation();
      const target = loc || userLocation;
      if (target && mapRef.current) {
        mapRef.current.flyTo(target.coords.latitude, target.coords.longitude, 16);
      }
    } catch (e) {
      console.warn('[WakePoint] Error centering user position:', e);
    }
  };

  const handleCenterDestination = () => {
    if (destination && mapRef.current) {
      mapRef.current.flyTo(destination.latitude, destination.longitude, 15);
    }
  };

  const handleMapPress = (coord: { latitude: number; longitude: number }) => {
    setDestinationFromCoordinates(coord.latitude, coord.longitude);
  };

  const handleMarkerDragEnd = (coord: { latitude: number; longitude: number }) => {
    setDestinationFromCoordinates(coord.latitude, coord.longitude);
  };

  const cycleMapTheme = () => {
    setMapTheme((prev) => {
      if (prev === 'dark') return 'satellite';
      if (prev === 'satellite') return 'streets';
      return 'dark';
    });
  };

  return (
    <View style={styles.container}>
      {/* Permission Pre-Flight Modal */}
      <PermissionModal />

      {/* Arrival Alarm Alert Screen / Modal */}
      <AlarmAlertModal />

      {/* Interactive Map Engine */}
      <WakeMapView
        ref={mapRef}
        userLocation={
          userLocation
            ? { latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude }
            : null
        }
        destination={destination}
        radius={radius}
        isAlarmActive={isAlarmActive}
        mapTheme={mapTheme}
        routeCoordinates={routeCoordinates}
        onMapPress={handleMapPress}
        onMarkerDragEnd={handleMarkerDragEnd}
      />

      {/* Top Search Bar */}
      <SearchBar
        onCenterUserLocation={handleCenterUserLocation}
        onCenterDestination={handleCenterDestination}
      />

      {/* Clean Floating Right-Side Tool Dock (hidden while searching) */}
      {!isSearchFocused && (
        <View style={[styles.rightToolDock, { top: topDockOffset }]}>
          <TouchableOpacity
            style={styles.dockBtn}
            onPress={cycleMapTheme}
            activeOpacity={0.8}
          >
            <Ionicons
              name={mapTheme === 'dark' ? 'moon' : mapTheme === 'satellite' ? 'earth' : 'map'}
              size={18}
              color="#818CF8"
            />
            <Text style={styles.dockBtnText}>
              {mapTheme === 'dark' ? 'Dark' : mapTheme === 'satellite' ? 'Sat' : 'Street'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dockBtn}
            onPress={handleCenterUserLocation}
            activeOpacity={0.8}
            accessibilityLabel="Center on current location"
          >
            <Ionicons name="navigate" size={18} color="#007AFF" />
            <Text style={[styles.dockBtnText, { color: '#007AFF' }]}>GPS</Text>
          </TouchableOpacity>

          {destination && (
            <TouchableOpacity
              style={styles.dockBtn}
              onPress={handleCenterDestination}
              activeOpacity={0.8}
              accessibilityLabel="Center on destination"
            >
              <Ionicons name="flag" size={17} color="#10B981" />
              <Text style={[styles.dockBtnText, { color: '#10B981' }]}>Target</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Hint banner when no destination is locked (hidden while searching) */}
      {!destination && !isSearchFocused && (
        <View style={[styles.hintBanner, { top: topDockOffset }]}>
          <Ionicons name="finger-print-outline" size={16} color="#818CF8" />
          <Text style={styles.hintText}>Tap anywhere or search to set a target</Text>
        </View>
      )}

      {/* Bottom Control Sheet */}
      <RadiusSliderWidget />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  rightToolDock: {
    position: 'absolute',
    top: 115,
    right: 16,
    gap: 8,
    zIndex: 90,
  },
  dockBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 44,
  },
  dockBtnText: {
    color: '#E2E8F0',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  hintBanner: {
    position: 'absolute',
    top: 115,
    left: 16,
    right: 76,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 90,
  },
  hintText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});
