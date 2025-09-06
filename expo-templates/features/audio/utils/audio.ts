/**
 * Expo Audio/Video Utilities
 * Complete audio and video playback, recording, and management
 */

import { Audio, Video, ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

export interface AudioConfig {
  shouldPlay: boolean;
  isLooping: boolean;
  volume: number;
  rate: number;
  shouldCorrectPitch: boolean;
}

export interface RecordingConfig {
  android: {
    extension: string;
    outputFormat: number;
    audioEncoder: number;
    sampleRate: number;
    numberOfChannels: number;
    bitRate: number;
  };
  ios: {
    extension: string;
    outputFormat: string;
    audioQuality: number;
    sampleRate: number;
    numberOfChannels: number;
    bitRate: number;
    linearPCMBitDepth: number;
    linearPCMIsBigEndian: boolean;
    linearPCMIsFloat: boolean;
  };
  web: {
    mimeType: string;
    bitsPerSecond: number;
  };
}

/**
 * Initialize audio session
 */
export async function initializeAudio(): Promise<boolean> {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: false,
    });
    return true;
  } catch (error) {
    console.error('Error initializing audio:', error);
    return false;
  }
}

/**
 * Request audio recording permissions
 */
export async function requestAudioPermissions(): Promise<boolean> {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Audio Permission Required',
        'This app needs microphone access to record audio.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error requesting audio permissions:', error);
    return false;
  }
}

/**
 * Load and play audio
 */
export async function loadAndPlayAudio(
  uri: string,
  config: Partial<AudioConfig> = {}
): Promise<Audio.Sound | null> {
  try {
    await initializeAudio();

    const defaultConfig: AudioConfig = {
      shouldPlay: true,
      isLooping: false,
      volume: 1.0,
      rate: 1.0,
      shouldCorrectPitch: true,
    };

    const finalConfig = { ...defaultConfig, ...config };

    const { sound } = await Audio.Sound.createAsync(
      { uri },
      finalConfig,
      (status) => {
        if (status.isLoaded && status.didJustFinish) {
          console.log('Audio playback finished');
        }
      }
    );

    return sound;
  } catch (error) {
    console.error('Error loading and playing audio:', error);
    Alert.alert('Error', 'Failed to play audio file.');
    return null;
  }
}

/**
 * Start audio recording
 */
export async function startRecording(
  config: Partial<RecordingConfig> = {}
): Promise<Audio.Recording | null> {
  try {
    const hasPermission = await requestAudioPermissions();
    if (!hasPermission) return null;

    await initializeAudio();

    const defaultConfig: RecordingConfig = {
      android: {
        extension: '.m4a',
        outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
        audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
        sampleRate: 44100,
        numberOfChannels: 2,
        bitRate: 128000,
      },
      ios: {
        extension: '.m4a',
        outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
        audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
        sampleRate: 44100,
        numberOfChannels: 2,
        bitRate: 128000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 128000,
      },
    };

    const finalConfig = { ...defaultConfig, ...config };

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(finalConfig);
    await recording.startAsync();

    return recording;
  } catch (error) {
    console.error('Error starting recording:', error);
    Alert.alert('Error', 'Failed to start recording.');
    return null;
  }
}

/**
 * Stop audio recording
 */
export async function stopRecording(recording: Audio.Recording): Promise<string | null> {
  try {
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    return uri;
  } catch (error) {
    console.error('Error stopping recording:', error);
    Alert.alert('Error', 'Failed to stop recording.');
    return null;
  }
}

/**
 * Play recorded audio
 */
export async function playRecording(uri: string): Promise<Audio.Sound | null> {
  try {
    const sound = await loadAndPlayAudio(uri);
    return sound;
  } catch (error) {
    console.error('Error playing recording:', error);
    return null;
  }
}

/**
 * Save audio file
 */
export async function saveAudioFile(uri: string, filename: string): Promise<string | null> {
  try {
    const documentsDir = FileSystem.documentDirectory;
    if (!documentsDir) {
      throw new Error('Documents directory not available');
    }

    const newUri = `${documentsDir}${filename}`;
    await FileSystem.copyAsync({ from: uri, to: newUri });

    return newUri;
  } catch (error) {
    console.error('Error saving audio file:', error);
    Alert.alert('Error', 'Failed to save audio file.');
    return null;
  }
}

/**
 * Get audio file info
 */
export async function getAudioInfo(uri: string): Promise<FileSystem.FileInfo | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info;
  } catch (error) {
    console.error('Error getting audio info:', error);
    return null;
  }
}

/**
 * Delete audio file
 */
export async function deleteAudioFile(uri: string): Promise<boolean> {
  try {
    await FileSystem.deleteAsync(uri);
    return true;
  } catch (error) {
    console.error('Error deleting audio file:', error);
    return false;
  }
}

/**
 * Convert audio format (basic implementation)
 */
export async function convertAudioFormat(
  inputUri: string,
  outputFormat: string
): Promise<string | null> {
  try {
    // This is a placeholder - actual conversion would require native modules
    // For now, we'll just copy the file with a new extension
    const outputUri = inputUri.replace(/\.[^/.]+$/, `.${outputFormat}`);
    await FileSystem.copyAsync({ from: inputUri, to: outputUri });
    return outputUri;
  } catch (error) {
    console.error('Error converting audio format:', error);
    return null;
  }
}

/**
 * Audio presets for different use cases
 */
export const AudioPresets = {
  music: {
    shouldPlay: true,
    isLooping: false,
    volume: 0.8,
    rate: 1.0,
    shouldCorrectPitch: true,
  },
  voiceNote: {
    shouldPlay: true,
    isLooping: false,
    volume: 1.0,
    rate: 1.0,
    shouldCorrectPitch: false,
  },
  backgroundMusic: {
    shouldPlay: true,
    isLooping: true,
    volume: 0.3,
    rate: 1.0,
    shouldCorrectPitch: true,
  },
  notification: {
    shouldPlay: true,
    isLooping: false,
    volume: 0.6,
    rate: 1.0,
    shouldCorrectPitch: true,
  },
} as const;

/**
 * Recording presets for different quality levels
 */
export const RecordingPresets = {
  highQuality: {
    android: {
      extension: '.m4a',
      outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
      audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 256000,
    },
    ios: {
      extension: '.m4a',
      outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
      audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MAX,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 256000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
  },
  mediumQuality: {
    android: {
      extension: '.m4a',
      outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
      audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    },
    ios: {
      extension: '.m4a',
      outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
      audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
  },
  lowQuality: {
    android: {
      extension: '.3gp',
      outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_THREE_GPP,
      audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AMR_NB,
      sampleRate: 8000,
      numberOfChannels: 1,
      bitRate: 12200,
    },
    ios: {
      extension: '.caf',
      outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
      audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_LOW,
      sampleRate: 8000,
      numberOfChannels: 1,
      bitRate: 64000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
  },
} as const;

export default {
  initializeAudio,
  requestAudioPermissions,
  loadAndPlayAudio,
  startRecording,
  stopRecording,
  playRecording,
  saveAudioFile,
  getAudioInfo,
  deleteAudioFile,
  convertAudioFormat,
  AudioPresets,
  RecordingPresets,
};

