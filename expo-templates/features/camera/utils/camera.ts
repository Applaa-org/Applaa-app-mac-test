/**
 * Expo Camera Utilities
 * Complete camera functionality with permissions, capture, and media library integration
 */

import { Camera, CameraType, FlashMode } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export interface CameraConfig {
  type: CameraType;
  flashMode: FlashMode;
  quality: number;
  allowsEditing: boolean;
  aspect: [number, number];
}

export interface MediaPickerConfig {
  mediaTypes: ImagePicker.MediaTypeOptions;
  allowsEditing: boolean;
  aspect: [number, number];
  quality: number;
  allowsMultipleSelection: boolean;
}

/**
 * Request camera permissions
 */
export async function requestCameraPermissions(): Promise<boolean> {
  try {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'This app needs camera access to take photos and videos.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error requesting camera permissions:', error);
    return false;
  }
}

/**
 * Request media library permissions
 */
export async function requestMediaLibraryPermissions(): Promise<boolean> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Media Library Permission Required',
        'This app needs access to your photo library to save images.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error requesting media library permissions:', error);
    return false;
  }
}

/**
 * Take a photo with camera
 */
export async function takePhoto(
  cameraRef: React.RefObject<Camera>,
  config: Partial<CameraConfig> = {}
): Promise<string | null> {
  try {
    if (!cameraRef.current) {
      throw new Error('Camera reference not available');
    }

    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return null;

    const defaultConfig: CameraConfig = {
      type: CameraType.back,
      flashMode: FlashMode.auto,
      quality: 0.8,
      allowsEditing: false,
      aspect: [4, 3],
    };

    const finalConfig = { ...defaultConfig, ...config };

    const photo = await cameraRef.current.takePictureAsync({
      quality: finalConfig.quality,
      skipProcessing: false,
    });

    return photo.uri;
  } catch (error) {
    console.error('Error taking photo:', error);
    Alert.alert('Error', 'Failed to take photo. Please try again.');
    return null;
  }
}

/**
 * Record video with camera
 */
export async function recordVideo(
  cameraRef: React.RefObject<Camera>,
  maxDuration: number = 60
): Promise<string | null> {
  try {
    if (!cameraRef.current) {
      throw new Error('Camera reference not available');
    }

    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return null;

    const video = await cameraRef.current.recordAsync({
      maxDuration,
      quality: Camera.Constants.VideoQuality['720p'],
    });

    return video.uri;
  } catch (error) {
    console.error('Error recording video:', error);
    Alert.alert('Error', 'Failed to record video. Please try again.');
    return null;
  }
}

/**
 * Stop video recording
 */
export async function stopRecording(cameraRef: React.RefObject<Camera>): Promise<void> {
  try {
    if (cameraRef.current) {
      cameraRef.current.stopRecording();
    }
  } catch (error) {
    console.error('Error stopping video recording:', error);
  }
}

/**
 * Pick image from gallery
 */
export async function pickImage(
  config: Partial<MediaPickerConfig> = {}
): Promise<ImagePicker.ImagePickerResult | null> {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'This app needs access to your photo library to select images.',
        [{ text: 'OK' }]
      );
      return null;
    }

    const defaultConfig: MediaPickerConfig = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      allowsMultipleSelection: false,
    };

    const finalConfig = { ...defaultConfig, ...config };

    const result = await ImagePicker.launchImageLibraryAsync(finalConfig);

    return result;
  } catch (error) {
    console.error('Error picking image:', error);
    Alert.alert('Error', 'Failed to pick image. Please try again.');
    return null;
  }
}

/**
 * Save image to media library
 */
export async function saveToMediaLibrary(uri: string): Promise<boolean> {
  try {
    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) return false;

    const asset = await MediaLibrary.createAssetAsync(uri);
    await MediaLibrary.createAlbumAsync('MyApp', asset, false);

    Alert.alert('Success', 'Image saved to gallery!');
    return true;
  } catch (error) {
    console.error('Error saving to media library:', error);
    Alert.alert('Error', 'Failed to save image to gallery.');
    return false;
  }
}

/**
 * Get camera status and permissions
 */
export async function getCameraStatus(): Promise<{
  cameraPermission: boolean;
  mediaLibraryPermission: boolean;
  isAvailable: boolean;
}> {
  try {
    const cameraPermission = await Camera.getCameraPermissionsAsync();
    const mediaPermission = await MediaLibrary.getPermissionsAsync();

    return {
      cameraPermission: cameraPermission.status === 'granted',
      mediaLibraryPermission: mediaPermission.status === 'granted',
      isAvailable: await Camera.isAvailableAsync(),
    };
  } catch (error) {
    console.error('Error getting camera status:', error);
    return {
      cameraPermission: false,
      mediaLibraryPermission: false,
      isAvailable: false,
    };
  }
}

/**
 * Camera component configuration
 */
export const CameraDefaults = {
  type: CameraType.back,
  flashMode: FlashMode.auto,
  autoFocus: Camera.Constants.AutoFocus.on,
  whiteBalance: Camera.Constants.WhiteBalance.auto,
  ratio: '4:3' as const,
  quality: 0.8,
};

/**
 * Image picker presets
 */
export const ImagePickerPresets = {
  avatar: {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1] as [number, number],
    quality: 0.8,
    allowsMultipleSelection: false,
  },
  gallery: {
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    allowsEditing: false,
    quality: 1,
    allowsMultipleSelection: true,
  },
  document: {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3] as [number, number],
    quality: 1,
    allowsMultipleSelection: false,
  },
} as const;

export default {
  requestCameraPermissions,
  requestMediaLibraryPermissions,
  takePhoto,
  recordVideo,
  stopRecording,
  pickImage,
  saveToMediaLibrary,
  getCameraStatus,
  CameraDefaults,
  ImagePickerPresets,
};

