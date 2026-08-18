export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface SearchResultItem {
  id: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
}

export interface RouteResponse {
  coordinates: GeoCoordinate[];
  distanceMeters: number;
  durationSeconds: number;
}

const NETWORK_TIMEOUT_MS = 8000;

/**
 * Utility function to wrap fetch requests with an explicit timeout signal
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = NETWORK_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Network request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  }
}

/**
 * 2. Autocomplete Geocoding Search Engine (Komoot Photon API)
 * Targets: https://photon.komoot.io/api/
 * Parses GeoJSON [lon, lat] coordinates into native mobile { latitude, longitude }
 */
export async function photonSearch(
  query: string,
  userLocation?: GeoCoordinate | null,
  limit = 8
): Promise<SearchResultItem[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const encodedQuery = encodeURIComponent(query.trim());
  let url = `https://photon.komoot.io/api/?q=${encodedQuery}&limit=${limit}`;

  // Inject spatial biasing coordinates if current user location is available
  if (userLocation && typeof userLocation.latitude === 'number' && typeof userLocation.longitude === 'number') {
    url += `&lat=${userLocation.latitude}&lon=${userLocation.longitude}`;
  }

  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'WakePoint-Mobile-App/1.1',
      },
    });

    if (!response.ok) {
      console.warn(`[Photon API] HTTP Error: ${response.status} ${response.statusText}`);
      return [];
    }

    const payload = await response.json();

    if (!payload || !Array.isArray(payload.features)) {
      return [];
    }

    const searchResults: SearchResultItem[] = payload.features
      .filter((feature: any) => {
        return (
          feature &&
          feature.geometry &&
          feature.geometry.type === 'Point' &&
          Array.isArray(feature.geometry.coordinates) &&
          feature.geometry.coordinates.length >= 2
        );
      })
      .map((feature: any, index: number) => {
        // Explicitly extract [longitude, latitude] from standard GeoJSON format
        const coords = feature.geometry.coordinates;
        const longitude = Number(coords[0]);
        const latitude = Number(coords[1]);

        const props = feature.properties || {};
        const name = props.name || props.street || props.city || 'Named Location';

        // Construct clean display address from properties
        const addressParts = [
          props.street,
          props.housenumber,
          props.district || props.suburb,
          props.city,
          props.state,
          props.country,
          props.postcode,
        ].filter(Boolean);

        const fullAddress = addressParts.length > 0
          ? addressParts.join(', ')
          : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

        return {
          id: `photon_${props.osm_id || index}_${Date.now()}`,
          title: name,
          address: fullAddress,
          latitude,
          longitude,
          city: props.city,
          state: props.state,
          country: props.country,
        };
      });

    return searchResults;
  } catch (error: any) {
    console.error('[Photon API] Search fetch failed:', error.message || error);
    return [];
  }
}

/**
 * 3. Route Calculation Engine (Public OSRM / OpenRouteService Routing Engine)
 * Takes start and end coordinates and parses GeoJSON LineString coordinates
 * into native [{ latitude, longitude }] polyline arrays
 */
export async function calculateRoutePath(
  start: GeoCoordinate,
  end: GeoCoordinate
): Promise<RouteResponse | null> {
  if (!start || !end) {
    return null;
  }

  // Format: start = lng,lat & end = lng,lat
  const startLngLat = `${start.longitude},${start.latitude}`;
  const endLngLat = `${end.longitude},${end.latitude}`;

  const url = `https://router.project-osrm.org/route/v1/driving/${startLngLat};${endLngLat}?overview=full&geometries=geojson`;

  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'WakePoint-Routing-Engine/1.1',
      },
    });

    if (!response.ok) {
      console.warn(`[Routing API] HTTP Error: ${response.status} ${response.statusText}`);
      return null;
    }

    const payload = await response.json();

    if (
      !payload ||
      payload.code !== 'Ok' ||
      !Array.isArray(payload.routes) ||
      payload.routes.length === 0
    ) {
      console.warn('[Routing API] No valid routes found in response payload.');
      return null;
    }

    const primaryRoute = payload.routes[0];
    const rawCoordinates: [number, number][] = primaryRoute.geometry?.coordinates || [];

    // Map [lng, lat] GeoJSON matrix directly into native mobile { latitude, longitude } shape
    const coordinates: GeoCoordinate[] = rawCoordinates.map((coord: [number, number]) => ({
      latitude: coord[1],
      longitude: coord[0],
    }));

    return {
      coordinates,
      distanceMeters: primaryRoute.distance || 0,
      durationSeconds: primaryRoute.duration || 0,
    };
  } catch (error: any) {
    console.error('[Routing API] Route calculation fetch failed:', error.message || error);
    return null;
  }
}
