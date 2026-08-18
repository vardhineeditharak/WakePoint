import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { GeoCoordinate } from '../services/apiService';

export interface WakeMapViewProps {
  userLocation?: { latitude: number; longitude: number } | null;
  destination?: { latitude: number; longitude: number; title: string } | null;
  radius: number;
  isAlarmActive: boolean;
  mapTheme?: 'dark' | 'satellite' | 'streets';
  routeCoordinates?: GeoCoordinate[];
  onMapPress?: (coord: { latitude: number; longitude: number }) => void;
  onMarkerDragEnd?: (coord: { latitude: number; longitude: number }) => void;
}

export interface WakeMapRef {
  flyTo: (latitude: number, longitude: number, zoom?: number) => void;
  fitBounds: (coords: GeoCoordinate[]) => void;
}

export const WakeMapView = forwardRef<WakeMapRef, WakeMapViewProps>(({
  userLocation,
  destination,
  radius,
  isAlarmActive,
  mapTheme = 'dark',
  routeCoordinates = [],
  onMapPress,
  onMarkerDragEnd,
}, ref) => {
  const webViewRef = useRef<WebView>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Imperative handle for smooth camera fly
  useImperativeHandle(ref, () => ({
    flyTo: (latitude: number, longitude: number, zoom = 15) => {
      if (webViewRef.current && isMapReady) {
        webViewRef.current.injectJavaScript(`
          if (window.wakeMap) {
            window.wakeMap.flyTo([${latitude}, ${longitude}], ${zoom}, {
              animate: true,
              duration: 1.2,
              easeLinearity: 0.25
            });
          }
          true;
        `);
      }
    },
    fitBounds: (coords: GeoCoordinate[]) => {
      if (webViewRef.current && isMapReady && coords.length > 0) {
        const boundsJson = JSON.stringify(coords.map(c => [c.latitude, c.longitude]));
        webViewRef.current.injectJavaScript(`
          if (window.wakeMap && window.L) {
            const bounds = ${boundsJson};
            window.wakeMap.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: true, duration: 1.2 });
          }
          true;
        `);
      }
    },
  }), [isMapReady]);

  // Sync state changes to WebView
  useEffect(() => {
    if (!isMapReady || !webViewRef.current) return;

    const payload = JSON.stringify({
      userLocation: userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : null,
      destination: destination ? { lat: destination.latitude, lng: destination.longitude, title: destination.title } : null,
      radius,
      isAlarmActive,
      route: routeCoordinates.map(c => [c.latitude, c.longitude]),
      theme: mapTheme,
    });

    webViewRef.current.injectJavaScript(`
      if (window.updateWakePointMap) {
        window.updateWakePointMap(${payload});
      }
      true;
    `);
  }, [userLocation, destination, radius, isAlarmActive, routeCoordinates, mapTheme, isMapReady]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_READY') {
        setIsMapReady(true);
      } else if (data.type === 'MAP_CLICK' && onMapPress) {
        onMapPress({ latitude: data.lat, longitude: data.lng });
      } else if (data.type === 'MARKER_DRAG_END' && onMarkerDragEnd) {
        onMarkerDragEnd({ latitude: data.lat, longitude: data.lng });
      }
    } catch (e) {
      console.warn('[WakeMapView] Bridge message error:', e);
    }
  };

  const initialLat = destination ? destination.latitude : userLocation ? userLocation.latitude : 12.9756;
  const initialLng = destination ? destination.longitude : userLocation ? userLocation.longitude : 77.6066;

  const htmlContent = React.useMemo(() => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body, #map { width: 100%; height: 100%; background: #0B0F19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden; }
    
    .leaflet-control-attribution { display: none !important; }
    .leaflet-control-zoom { display: none !important; }

    /* Pulsing User Location Marker */
    .user-marker-wrap {
      width: 28px;
      height: 28px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-marker-pulse {
      position: absolute;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(99, 102, 241, 0.4);
      animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
    }
    .user-marker-core {
      position: relative;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #6366F1;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 0 10px rgba(99, 102, 241, 0.9);
    }
    @keyframes pulse-ring {
      0% { transform: scale(0.6); opacity: 0.9; }
      100% { transform: scale(2.4); opacity: 0; }
    }

    /* Destination Pointer Pin - Precisely Centered */
    .pin-wrap {
      width: 32px;
      height: 44px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
    }
    .pin-svg {
      width: 32px;
      height: 44px;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6));
    }
    .leaflet-container { background: #0B0F19 !important; }
  </style>
</head>
<body>
  <div id="map"></div>

  <script>
    const map = L.map('map', {
      center: [${initialLat}, ${initialLng}],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: true,
      zoomAnimation: true,
    });

    window.wakeMap = map;

    let currentTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    let userMarker = null;
    let destMarker = null;
    let radiusCircle = null;
    let routePolyline = null;
    let isDraggingPin = false;

    // User location icon: 28x28, anchor exactly in center [14, 14]
    const userIcon = L.divIcon({
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      html: '<div class="user-marker-wrap"><div class="user-marker-pulse"></div><div class="user-marker-core"></div></div>'
    });

    // Destination Pin SVG: 32x44, anchor at the needle tip [16, 44]
    function getDestPinSvg(isActive) {
      const pinColor = isActive ? '#10B981' : '#6366F1';
      const iconPath = isActive
        ? '<path d="M16 11l-3-3 1.4-1.4 1.6 1.6 4.6-4.6L22 6z" fill="white"/>'
        : '<circle cx="16" cy="15" r="4.5" fill="white"/>';

      return '<div class="pin-wrap">' +
        '<svg class="pin-svg" viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<path d="M16 44C16 44 30 27.5 30 16C30 7.16344 23.732 0 16 0C8.26801 0 2 7.16344 2 16C2 27.5 16 44 16 44Z" fill="' + pinColor + '"/>' +
          '<path d="M16 42C16 42 28.5 26.5 28.5 16C28.5 8 22.9 1.5 16 1.5C9.1 1.5 3.5 8 3.5 16C3.5 26.5 16 42 16 42Z" stroke="white" stroke-width="1.8" stroke-opacity="0.85"/>' +
          iconPath +
        '</svg>' +
      '</div>';
    }

    // Map Tap Listener
    map.on('click', function(e) {
      if (isDraggingPin) return;
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'MAP_CLICK',
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      }));
    });

    // Update map data from React Native
    window.updateWakePointMap = function(data) {
      // 1. Theme
      if (data.theme) {
        let newUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        if (data.theme === 'satellite') {
          newUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        } else if (data.theme === 'streets') {
          newUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
        }
        if (currentTileLayer._url !== newUrl) {
          map.removeLayer(currentTileLayer);
          currentTileLayer = L.tileLayer(newUrl, { subdomains: 'abcd', maxZoom: 19 }).addTo(map);
          currentTileLayer.bringToBack();
        }
      }

      // 2. User Location
      if (data.userLocation) {
        if (!userMarker) {
          userMarker = L.marker([data.userLocation.lat, data.userLocation.lng], {
            icon: userIcon,
            zIndexOffset: 500,
          }).addTo(map);
          if (!data.destination) {
            map.setView([data.userLocation.lat, data.userLocation.lng], 15);
          }
        } else {
          userMarker.setLatLng([data.userLocation.lat, data.userLocation.lng]);
        }
      } else if (userMarker) {
        map.removeLayer(userMarker);
        userMarker = null;
      }

      // 3. Destination Pin & Radius Circle
      if (data.destination) {
        const destIcon = L.divIcon({
          className: '',
          iconSize: [32, 44],
          iconAnchor: [16, 44], // Bottom needle tip is exactly at [16, 44]
          html: getDestPinSvg(data.isAlarmActive),
        });

        if (!destMarker) {
          destMarker = L.marker([data.destination.lat, data.destination.lng], {
            icon: destIcon,
            draggable: true,
            zIndexOffset: 1000,
          }).addTo(map);

          destMarker.on('dragstart', function() { isDraggingPin = true; });
          destMarker.on('drag', function(e) {
            const curPos = e.target.getLatLng();
            if (radiusCircle) radiusCircle.setLatLng(curPos);
          });
          destMarker.on('dragend', function(e) {
            isDraggingPin = false;
            const newPos = e.target.getLatLng();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'MARKER_DRAG_END',
              lat: newPos.lat,
              lng: newPos.lng,
            }));
          });
        } else {
          if (!isDraggingPin) {
            destMarker.setLatLng([data.destination.lat, data.destination.lng]);
          }
          destMarker.setIcon(destIcon);
        }

        // Proximity Circle centered precisely at [lat, lng]
        const circleStyle = {
          color: data.isAlarmActive ? '#10B981' : '#6366F1',
          fillColor: data.isAlarmActive ? '#10B981' : '#6366F1',
          fillOpacity: data.isAlarmActive ? 0.22 : 0.16,
          weight: 2,
          dashArray: data.isAlarmActive ? null : '6, 6',
        };

        if (!radiusCircle) {
          radiusCircle = L.circle([data.destination.lat, data.destination.lng], {
            radius: data.radius || 1000,
            ...circleStyle,
          }).addTo(map);
        } else {
          if (!isDraggingPin) {
            radiusCircle.setLatLng([data.destination.lat, data.destination.lng]);
          }
          radiusCircle.setRadius(data.radius || 1000);
          radiusCircle.setStyle(circleStyle);
        }
      } else {
        if (destMarker) { map.removeLayer(destMarker); destMarker = null; }
        if (radiusCircle) { map.removeLayer(radiusCircle); radiusCircle = null; }
      }

      // 4. Route Polyline
      if (data.route && data.route.length > 1) {
        if (!routePolyline) {
          routePolyline = L.polyline(data.route, {
            color: '#6366F1',
            weight: 4.5,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);
          routePolyline.bringToBack();
        } else {
          routePolyline.setLatLngs(data.route);
        }
      } else if (routePolyline) {
        map.removeLayer(routePolyline);
        routePolyline = null;
      }
    };

    setTimeout(() => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
    }, 200);
  </script>
</body>
</html>
  `, [initialLat, initialLng]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        androidLayerType="hardware"
      />
    </View>
  );
});

WakeMapView.displayName = 'WakeMapView';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0B0F19',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
});
