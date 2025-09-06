/**
 * Expo Location Utilities
 * Complete location services with GPS, geocoding, and background location
 */

import * as Location from 'expo-location';
import { Alert } from 'react-native';

export interface LocationConfig {
  accuracy: Location.Accuracy;
  timeout: number;
  maximumAge: number;
}

export interface WatchLocationConfig extends LocationConfig {
  distanceInterval: number;
  timeInterval: number;
}

export interface GeofenceConfig {
  identifier: string;
  latitude: number;
  longitude: number;
  radius: number;
  notifyOnEnter: boolean;
  notifyOnExit: boolean;
}

/**
 * Request location permissions
 */
export async function requestLocationPermissions(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Location Permission Required',
        'This app needs location access to provide location-based features.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error requesting location permissions:', error);
    return false;
  }
}

/**
 * Request background location permissions
 */
export async function requestBackgroundLocationPermissions(): Promise<boolean> {
  try {
    const foregroundPermission = await requestLocationPermissions();
    if (!foregroundPermission) return false;

    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Background Location Permission Required',
        'This app needs background location access for continuous tracking.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error requesting background location permissions:', error);
    return false;
  }
}

/**
 * Get current location
 */
export async function getCurrentLocation(
  config: Partial<LocationConfig> = {}
): Promise<Location.LocationObject | null> {
  try {
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) return null;

    const defaultConfig: LocationConfig = {
      accuracy: Location.Accuracy.High,
      timeout: 15000,
      maximumAge: 10000,
    };

    const finalConfig = { ...defaultConfig, ...config };

    const location = await Location.getCurrentPositionAsync(finalConfig);
    return location;
  } catch (error) {
    console.error('Error getting current location:', error);
    Alert.alert('Error', 'Failed to get current location. Please try again.');
    return null;
  }
}

/**
 * Watch location changes
 */
export async function watchLocation(
  callback: (location: Location.LocationObject) => void,
  config: Partial<WatchLocationConfig> = {}
): Promise<Location.LocationSubscription | null> {
  try {
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) return null;

    const defaultConfig: WatchLocationConfig = {
      accuracy: Location.Accuracy.High,
      timeout: 15000,
      maximumAge: 10000,
      distanceInterval: 10, // meters
      timeInterval: 5000, // milliseconds
    };

    const finalConfig = { ...defaultConfig, ...config };

    const subscription = await Location.watchPositionAsync(finalConfig, callback);
    return subscription;
  } catch (error) {
    console.error('Error watching location:', error);
    Alert.alert('Error', 'Failed to start location tracking.');
    return null;
  }
}

/**
 * Geocode address to coordinates
 */
export async function geocodeAddress(address: string): Promise<Location.LocationGeocodedLocation[] | null> {
  try {
    const result = await Location.geocodeAsync(address);
    return result;
  } catch (error) {
    console.error('Error geocoding address:', error);
    Alert.alert('Error', 'Failed to find location for the given address.');
    return null;
  }
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<Location.LocationGeocodedAddress[] | null> {
  try {
    const result = await Location.reverseGeocodeAsync({ latitude, longitude });
    return result;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    Alert.alert('Error', 'Failed to get address for the given coordinates.');
    return null;
  }
}

/**
 * Calculate distance between two points
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

/**
 * Start geofencing
 */
export async function startGeofencing(
  geofences: GeofenceConfig[],
  callback: (event: Location.LocationGeofencingEventType) => void
): Promise<boolean> {
  try {
    const hasPermission = await requestBackgroundLocationPermissions();
    if (!hasPermission) return false;

    const regions = geofences.map(geofence => ({
      identifier: geofence.identifier,
      latitude: geofence.latitude,
      longitude: geofence.longitude,
      radius: geofence.radius,
      notifyOnEnter: geofence.notifyOnEnter,
      notifyOnExit: geofence.notifyOnExit,
    }));

    await Location.startGeofencingAsync('geofencing-task', regions);
    return true;
  } catch (error) {
    console.error('Error starting geofencing:', error);
    Alert.alert('Error', 'Failed to start geofencing.');
    return false;
  }
}

/**
 * Stop geofencing
 */
export async function stopGeofencing(): Promise<void> {
  try {
    await Location.stopGeofencingAsync('geofencing-task');
  } catch (error) {
    console.error('Error stopping geofencing:', error);
  }
}

/**
 * Get location status and permissions
 */
export async function getLocationStatus(): Promise<{
  foregroundPermission: boolean;
  backgroundPermission: boolean;
  locationServicesEnabled: boolean;
  providerStatus: Location.LocationProviderStatus | null;
}> {
  try {
    const foregroundPermission = await Location.getForegroundPermissionsAsync();
    const backgroundPermission = await Location.getBackgroundPermissionsAsync();
    const locationServicesEnabled = await Location.hasServicesEnabledAsync();
    const providerStatus = await Location.getProviderStatusAsync();

    return {
      foregroundPermission: foregroundPermission.status === 'granted',
      backgroundPermission: backgroundPermission.status === 'granted',
      locationServicesEnabled,
      providerStatus,
    };
  } catch (error) {
    console.error('Error getting location status:', error);
    return {
      foregroundPermission: false,
      backgroundPermission: false,
      locationServicesEnabled: false,
      providerStatus: null,
    };
  }
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(
  latitude: number,
  longitude: number,
  precision: number = 6
): string {
  return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
}

/**
 * Location accuracy presets
 */
export const LocationAccuracy = {
  Lowest: Location.Accuracy.Lowest,
  Low: Location.Accuracy.Low,
  Balanced: Location.Accuracy.Balanced,
  High: Location.Accuracy.High,
  Highest: Location.Accuracy.Highest,
  BestForNavigation: Location.Accuracy.BestForNavigation,
} as const;

/**
 * Common location configurations
 */
export const LocationPresets = {
  quick: {
    accuracy: Location.Accuracy.Balanced,
    timeout: 5000,
    maximumAge: 30000,
  },
  precise: {
    accuracy: Location.Accuracy.High,
    timeout: 15000,
    maximumAge: 10000,
  },
  navigation: {
    accuracy: Location.Accuracy.BestForNavigation,
    timeout: 20000,
    maximumAge: 5000,
  },
  tracking: {
    accuracy: Location.Accuracy.High,
    timeout: 15000,
    maximumAge: 10000,
    distanceInterval: 5,
    timeInterval: 3000,
  },
} as const;

export default {
  requestLocationPermissions,
  requestBackgroundLocationPermissions,
  getCurrentLocation,
  watchLocation,
  geocodeAddress,
  reverseGeocode,
  calculateDistance,
  startGeofencing,
  stopGeofencing,
  getLocationStatus,
  formatCoordinates,
  LocationAccuracy,
  LocationPresets,
};

