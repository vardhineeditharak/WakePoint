import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { GeoCoordinate } from '../services/apiService';
import { ENHANCED_DARK_MAP_STYLE } from '../constants/mapDarkTheme';

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

  const pendingFlyToRef = useRef<{ latitude: number; longitude: number; zoom: number } | null>(null);

  // Imperative handle for smooth camera fly
  useImperativeHandle(ref, () => ({
    flyTo: (latitude: number, longitude: number, zoom = 15) => {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          if (window.wakeMap) {
            try {
              window.wakeMap.flyTo({
                center: [${longitude}, ${latitude}],
                zoom: ${zoom},
                duration: 1000,
                essential: true
              });
            } catch(e) {
              window.wakeMap.setCenter([${longitude}, ${latitude}]);
              window.wakeMap.setZoom(${zoom});
            }
          } else {
            window.pendingFlyTo = [${longitude}, ${latitude}, ${zoom}];
          }
          true;
        `);
      }
      pendingFlyToRef.current = { latitude, longitude, zoom };
    },
    fitBounds: (coords: GeoCoordinate[]) => {
      if (webViewRef.current && coords.length > 0) {
        const boundsJson = JSON.stringify(coords.map(c => [c.longitude, c.latitude]));
        webViewRef.current.injectJavaScript(`
          if (window.wakeMap && window.maplibregl) {
            try {
              const rawCoords = ${boundsJson};
              const bounds = new window.maplibregl.LngLatBounds();
              rawCoords.forEach(c => bounds.extend(c));
              window.wakeMap.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 1000 });
            } catch(e) {}
          }
          true;
        `);
      }
    },
  }), []);

  // Execute buffered camera flyTo once MapLibre engine reports ready
  useEffect(() => {
    if (isMapReady && pendingFlyToRef.current && webViewRef.current) {
      const { latitude, longitude, zoom } = pendingFlyToRef.current;
      pendingFlyToRef.current = null;
      webViewRef.current.injectJavaScript(`
        if (window.wakeMap) {
          try {
            window.wakeMap.flyTo({
              center: [${longitude}, ${latitude}],
              zoom: ${zoom},
              duration: 1000,
              essential: true
            });
          } catch(e) {
            window.wakeMap.setCenter([${longitude}, ${latitude}]);
            window.wakeMap.setZoom(${zoom});
          }
        }
        true;
      `);
    }
  }, [isMapReady]);

  // Sync state changes to WebView
  useEffect(() => {
    if (!isMapReady || !webViewRef.current) return;

    const payload = JSON.stringify({
      userLocation: userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : null,
      destination: destination ? { lat: destination.latitude, lng: destination.longitude, title: destination.title } : null,
      radius,
      isAlarmActive,
      route: routeCoordinates.map(c => [c.longitude, c.latitude]), // [lng, lat] for MapLibre
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
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" />
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body, #map { width: 100%; height: 100%; background: #0B0F19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden; }
    
    .maplibregl-ctrl-attrib { display: none !important; }
    .maplibregl-ctrl-logo { display: none !important; }

    /* Pulsing Electric Blue User Location Marker (Clean & Modern) */
    .user-marker-wrap {
      width: 28px;
      height: 28px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 999 !important;
    }
    .user-marker-pulse {
      position: absolute;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(0, 122, 255, 0.35);
      animation: user-blue-pulse 2s cubic-bezier(0.2, 0.7, 0.2, 1) infinite;
    }
    .user-marker-core {
      position: relative;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #007AFF;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 0 10px rgba(0, 122, 255, 0.9), 0 2px 5px rgba(0, 0, 0, 0.35);
      z-index: 2;
    }
    @keyframes user-blue-pulse {
      0% { transform: scale(0.5); opacity: 0.95; }
      100% { transform: scale(2.4); opacity: 0; }
    }

    /* Destination Pointer Pin - Small & Minimalist */
    .pin-container {
      width: 24px;
      height: 30px;
      position: relative;
      cursor: grab;
      user-select: none;
      filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.45));
      transition: transform 0.15s ease;
    }
    .pin-container:active,
    .pin-container.is-dragging {
      cursor: grabbing;
      transform: scale(1.15) translateY(-3px);
    }
    .pin-svg {
      width: 24px;
      height: 30px;
      display: block;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <script>
    const SATELLITE_STYLE = {
      version: 8,
      sources: {
        'esri-imagery': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          maxzoom: 19
        }
      },
      layers: [
        {
          id: 'esri-imagery-layer',
          type: 'raster',
          source: 'esri-imagery',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    };

    const DARK_STYLE = ${JSON.stringify(ENHANCED_DARK_MAP_STYLE)};

    function getStyleUrl(theme) {
      if (theme === 'satellite') return SATELLITE_STYLE;
      if (theme === 'streets') return 'https://tiles.openfreemap.org/styles/liberty';
      return DARK_STYLE;
    }

    let currentTheme = '${mapTheme || 'dark'}';

    const map = new maplibregl.Map({
      container: 'map',
      style: getStyleUrl(currentTheme),
      center: [${initialLng}, ${initialLat}],
      zoom: 14,
      attributionControl: false
    });

    window.wakeMap = map;

    let userMarker = null;
    let destMarker = null;
    let isDraggingPin = false;

    let cachedData = null;

    // Helper: Compute exact geographic circle polygon in GeoJSON
    function createGeoJsonCircle(centerLngLat, radiusInMeters, points = 64) {
      const lng = centerLngLat[0];
      const lat = centerLngLat[1];
      const km = radiusInMeters / 1000;
      const ret = [];
      const distanceX = km / (111.320 * Math.cos((lat * Math.PI) / 180));
      const distanceY = km / 110.574;

      for (let i = 0; i < points; i++) {
        const theta = (i / points) * (2 * Math.PI);
        const x = distanceX * Math.cos(theta);
        const y = distanceY * Math.sin(theta);
        ret.push([lng + x, lat + y]);
      }
      ret.push(ret[0]); // Close polygon
      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [ret]
        },
        properties: {}
      };
    }

    // Destination Pin HTML builder - Small, clean & modern
    function getDestPinHtml(isActive) {
      const pinColor = isActive ? '#10B981' : '#6366F1';
      const iconSvg = isActive
        ? '<path d="M8.5 10.5L10.8 12.8L15.5 8" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
        : '<circle cx="12" cy="10.5" r="3.2" fill="#FFFFFF"/>';

      return '<div class="pin-container">' +
        '<svg class="pin-svg" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<path d="M12 30 C10.5 24 2 17 2 10.5 A 10 10 0 1 1 22 10.5 C 22 17 13.5 24 12 30 Z" fill="' + pinColor + '" stroke="#FFFFFF" stroke-width="1.8" stroke-linejoin="round"/>' +
          iconSvg +
        '</svg>' +
      '</div>';
    }

    // Ensure GeoJSON layers exist on the active style
    function ensureLayers() {
      if (!map.getSource('radius-circle-source')) {
        map.addSource('radius-circle-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
        map.addLayer({
          id: 'radius-circle-fill',
          type: 'fill',
          source: 'radius-circle-source',
          paint: {
            'fill-color': '#6366F1',
            'fill-opacity': 0.18
          }
        });
        map.addLayer({
          id: 'radius-circle-stroke',
          type: 'line',
          source: 'radius-circle-source',
          paint: {
            'line-color': '#6366F1',
            'line-width': 2.2,
            'line-opacity': 0.95
          }
        });
      }

      if (!map.getSource('route-source')) {
        map.addSource('route-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route-source',
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': '#6366F1',
            'line-width': 4.5,
            'line-opacity': 0.95
          }
        });
      }
    }

    // Map Tap Listener
    map.on('click', function(e) {
      if (isDraggingPin) return;
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'MAP_CLICK',
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
      }));
    });

    map.on('load', function() {
      ensureLayers();
      if (cachedData) {
        renderMapData(cachedData);
      }
      if (window.pendingFlyTo) {
        try {
          map.flyTo({ center: [window.pendingFlyTo[0], window.pendingFlyTo[1]], zoom: window.pendingFlyTo[2], duration: 1000 });
        } catch(e) {
          map.setCenter([window.pendingFlyTo[0], window.pendingFlyTo[1]]);
          map.setZoom(window.pendingFlyTo[2]);
        }
        window.pendingFlyTo = null;
      }
      setTimeout(() => {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
      }, 100);
    });

    map.on('style.load', function() {
      ensureLayers();
      if (cachedData) {
        renderMapData(cachedData);
      }
    });

    function renderMapData(data) {
      cachedData = data;
      if (!map.loaded() || !map.getSource('radius-circle-source')) return;

      // 1. User Location (Always visible Electric Blue Beacon)
      if (data.userLocation) {
        const userCoords = [data.userLocation.lng, data.userLocation.lat];
        if (!userMarker) {
          const userEl = document.createElement('div');
          userEl.className = 'user-marker-wrap';
          userEl.innerHTML = '<div class="user-marker-pulse"></div><div class="user-marker-core"></div>';
          userMarker = new maplibregl.Marker({ element: userEl, anchor: 'center' })
            .setLngLat(userCoords)
            .addTo(map);

          if (!data.destination) {
            map.flyTo({ center: userCoords, zoom: 15, duration: 800 });
          }
        } else {
          userMarker.setLngLat(userCoords);
          if (!userMarker.getElement().parentNode) {
            userMarker.addTo(map);
          }
        }
      } else if (userMarker) {
        userMarker.remove();
        userMarker = null;
      }

      // 2. Destination Pin & Arrival Radius Circle
      if (data.destination) {
        const destCoords = [data.destination.lng, data.destination.lat];
        const radiusMeters = data.radius || 1000;
        const isActive = !!data.isAlarmActive;
        const color = isActive ? '#10B981' : '#6366F1';

        // Update / create destination marker
        if (!destMarker) {
          const destEl = document.createElement('div');
          destEl.innerHTML = getDestPinHtml(isActive);

          destMarker = new maplibregl.Marker({
            element: destEl,
            anchor: 'bottom',
            draggable: true
          })
            .setLngLat(destCoords)
            .addTo(map);

          destMarker.on('dragstart', function() {
            isDraggingPin = true;
            const container = destMarker.getElement().querySelector('.pin-container');
            if (container) container.classList.add('is-dragging');
          });
          destMarker.on('drag', function() {
            const curPos = destMarker.getLngLat();
            const liveCircle = createGeoJsonCircle([curPos.lng, curPos.lat], radiusMeters);
            const source = map.getSource('radius-circle-source');
            if (source) source.setData(liveCircle);
          });
          destMarker.on('dragend', function() {
            isDraggingPin = false;
            const container = destMarker.getElement().querySelector('.pin-container');
            if (container) container.classList.remove('is-dragging');
            const newPos = destMarker.getLngLat();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'MARKER_DRAG_END',
              lat: newPos.lat,
              lng: newPos.lng,
            }));
          });
        } else {
          if (!isDraggingPin) {
            destMarker.setLngLat(destCoords);
          }
          destMarker.getElement().innerHTML = getDestPinHtml(isActive);
          if (!destMarker.getElement().parentNode) {
            destMarker.addTo(map);
          }
        }

        // Update GeoJSON radius circle
        const circleData = createGeoJsonCircle(destCoords, radiusMeters);
        const radiusSource = map.getSource('radius-circle-source');
        if (radiusSource) {
          radiusSource.setData(circleData);
        }

        if (map.getLayer('radius-circle-fill')) {
          map.setPaintProperty('radius-circle-fill', 'fill-color', color);
          map.setPaintProperty('radius-circle-fill', 'fill-opacity', isActive ? 0.22 : 0.16);
        }
        if (map.getLayer('radius-circle-stroke')) {
          map.setPaintProperty('radius-circle-stroke', 'line-color', color);
        }
      } else {
        if (destMarker) {
          destMarker.remove();
          destMarker = null;
        }
        const radiusSource = map.getSource('radius-circle-source');
        if (radiusSource) {
          radiusSource.setData({ type: 'FeatureCollection', features: [] });
        }
      }

      // 3. Routing Polyline
      const routeSource = map.getSource('route-source');
      if (routeSource) {
        if (data.route && data.route.length > 1) {
          routeSource.setData({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: data.route
            },
            properties: {}
          });
        } else {
          routeSource.setData({ type: 'FeatureCollection', features: [] });
        }
      }
    }

    // React Native updates trigger this function
    window.updateWakePointMap = function(data) {
      if (data.theme && data.theme !== currentTheme) {
        currentTheme = data.theme;
        map.setStyle(getStyleUrl(currentTheme));
      }
      renderMapData(data);
    };
  </script>
</body>
</html>
  `, [initialLat, initialLng, mapTheme]);

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
    backgroundColor: '#111622',
  },
  webview: {
    flex: 1,
    backgroundColor: '#111622',
  },
});
