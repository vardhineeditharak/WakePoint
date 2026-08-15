import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import MapView, { Marker, Circle, Polyline, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useWaypoint } from '../context/WaypointContext';
import { SearchBar } from '../components/SearchBar';
import { RadiusSliderWidget } from '../components/RadiusSliderWidget';
import { PermissionModal } from '../components/PermissionModal';
import { AlarmAlertModal } from '../components/AlarmAlertModal';

export default function MainMapScreen() {
  const mapRef = useRef<MapView | null>(null);

  const {
    destination,
    radius,
    isAlarmActive,
    userLocation,
    routeCoordinates,
    routeDistanceMeters,
    setDestinationFromCoordinates,
    getCurrentLocation,
  } = useWaypoint();

  // Animate map camera when destination changes
  useEffect(() => {
    if (destination && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: destination.latitude,
          longitude: destination.longitude,
          latitudeDelta: getLatitudeDeltaForRadius(radius),
          longitudeDelta: getLatitudeDeltaForRadius(radius),
        },
        1000
      );
    }
  }, [destination, radius]);

  const handleCenterUserLocation = async () => {
    await getCurrentLocation();
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        1000
      );
    }
  };

  const handleMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setDestinationFromCoordinates(latitude, longitude);
  };

  const handleMarkerDragEnd = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setDestinationFromCoordinates(latitude, longitude);
  };

  return (
    <View style={styles.container}>
      {/* Permission Pre-Flight Modal */}
      <PermissionModal />

      {/* Arrival Alarm Alert Popup Modal */}
      <AlarmAlertModal />

      {/* Floating Top Search Bar Overlay */}
      <SearchBar onCenterUserLocation={handleCenterUserLocation} />

      {/* Full-Screen Interactive MapView */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        userInterfaceStyle="dark"
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        onPress={handleMapPress}
        initialRegion={{
          latitude: destination ? destination.latitude : 12.9756,
          longitude: destination ? destination.longitude : 77.6066,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
      >
        {/* 1. Visual Tile Layer Engine (OpenStreetMap Raster Mirror) */}
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          maximumNativeZ={19}
          tileSize={256}
          shouldReplaceMapContent={false}
        />

        {/* 3. Route Calculation Engine Polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#6366F1"
            strokeWidth={4.5}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Destination Lock Marker & Proximity Circle */}
        {destination && (
          <>
            {/* Dynamic Semi-transparent Circle scaling in real-time with radius slider */}
            <Circle
              center={{
                latitude: destination.latitude,
                longitude: destination.longitude,
              }}
              radius={radius}
              fillColor={
                isAlarmActive
                  ? 'rgba(16, 185, 129, 0.22)' // Active vibrant emerald green fill
                  : 'rgba(99, 102, 241, 0.22)' // Standby vibrant indigo fill
              }
              strokeColor={isAlarmActive ? '#10B981' : '#6366F1'}
              strokeWidth={2.5}
              lineDashPattern={isAlarmActive ? undefined : [6, 4]}
            />

            {/* Draggable Destination Pin Marker */}
            <Marker
              draggable={true}
              onDragEnd={handleMarkerDragEnd}
              coordinate={{
                latitude: destination.latitude,
                longitude: destination.longitude,
              }}
              title={destination.title}
              description={`Hold & drag pin to reposition | Radius: ${
                radius >= 1000 ? `${(radius / 1000).toFixed(1)}km` : `${radius}m`
              }${routeDistanceMeters > 0 ? ` | Dist: ${(routeDistanceMeters / 1000).toFixed(1)}km` : ''}`}
            >
              <View style={styles.markerContainer}>
                <View
                  style={[
                    styles.markerPin,
                    isAlarmActive ? styles.markerPinActive : styles.markerPinInactive,
                  ]}
                >
                  <Ionicons
                    name={isAlarmActive ? 'shield-sharp' : 'location-sharp'}
                    size={22}
                    color="#FFFFFF"
                  />
                </View>
                <View
                  style={[
                    styles.markerArrow,
                    isAlarmActive ? styles.markerArrowActive : styles.markerArrowInactive,
                  ]}
                />
              </View>
            </Marker>
          </>
        )}
      </MapView>

      {/* Floating Instructions Bar when no target locked */}
      {!destination && (
        <View style={styles.hintBanner}>
          <Ionicons name="finger-print-outline" size={18} color="#818CF8" />
          <Text style={styles.hintText}>Tap anywhere or drag pin to set a target waypoint</Text>
        </View>
      )}

      {/* Floating Re-Center GPS Location FAB Button */}
      <TouchableOpacity
        style={styles.recenterFab}
        onPress={handleCenterUserLocation}
        activeOpacity={0.8}
      >
        <Ionicons name="locate-sharp" size={24} color="#6366F1" />
      </TouchableOpacity>

      {/* Bottom Persistent Radius Slider Overlay */}
      <RadiusSliderWidget />
    </View>
  );
}

function getLatitudeDeltaForRadius(radiusMeters: number): number {
  const delta = (radiusMeters * 3.2) / 111000;
  return Math.max(0.015, Math.min(delta, 0.15));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  markerPinInactive: {
    backgroundColor: '#6366F1',
  },
  markerPinActive: {
    backgroundColor: '#10B981',
  },
  markerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 0,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  markerArrowInactive: {
    borderTopColor: '#6366F1',
  },
  markerArrowActive: {
    borderTopColor: '#10B981',
  },
  hintBanner: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 90,
  },
  hintText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '500',
  },
  recenterFab: {
    position: 'absolute',
    bottom: 270,
    right: 18,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 95,
  },
});
