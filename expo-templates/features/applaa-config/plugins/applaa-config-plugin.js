/**
 * Applaa Custom Config Plugin
 * Comprehensive config plugin for Applaa-generated Expo apps
 * Handles branding, permissions, assets, and optimizations
 */

const { withAndroidManifest, withInfoPlist, withDangerousMod, withPlugins } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Main Applaa config plugin
 */
function withApplaa(config, options = {}) {
  const {
    branding = {},
    permissions = {},
    assets = {},
    ai = {},
    performance = {},
    features = [],
  } = options;

  // Apply all sub-plugins
  config = withPlugins(config, [
    [withApplaaBranding, branding],
    [withApplaaPermissions, permissions],
    [withApplaaAssets, assets],
    [withApplaaAI, ai],
    [withApplaaPerformance, performance],
    [withApplaaFeatures, { features }],
  ]);

  return config;
}

/**
 * Applaa Branding Plugin
 * Adds Applaa attribution and custom branding
 */
function withApplaaBranding(config, options = {}) {
  const {
    showApplaaAttribution = true,
    customBranding = {},
    appName = config.name,
  } = options;

  // Android branding
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    
    if (showApplaaAttribution) {
      // Add Applaa attribution to app label
      const application = androidManifest.manifest.application[0];
      const currentLabel = application.$['android:label'] || appName;
      application.$['android:label'] = `${currentLabel} - Built with Applaa`;
    }

    // Add custom metadata
    if (customBranding.metadata) {
      const application = androidManifest.manifest.application[0];
      if (!application['meta-data']) {
        application['meta-data'] = [];
      }
      
      Object.entries(customBranding.metadata).forEach(([key, value]) => {
        application['meta-data'].push({
          $: {
            'android:name': key,
            'android:value': value,
          },
        });
      });
    }

    return config;
  });

  // iOS branding
  config = withInfoPlist(config, (config) => {
    if (showApplaaAttribution) {
      config.modResults.CFBundleDisplayName = `${appName} - Built with Applaa`;
    }

    // Add custom info.plist entries
    if (customBranding.infoPlist) {
      Object.entries(customBranding.infoPlist).forEach(([key, value]) => {
        config.modResults[key] = value;
      });
    }

    return config;
  });

  return config;
}

/**
 * Applaa Permissions Plugin
 * Automatically manages permissions based on features
 */
function withApplaaPermissions(config, options = {}) {
  const { features = [], customPermissions = {} } = options;

  // Android permissions
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const permissions = new Set();

    // Add permissions based on features
    features.forEach(feature => {
      switch (feature) {
        case 'camera':
          permissions.add('android.permission.CAMERA');
          permissions.add('android.permission.RECORD_AUDIO');
          permissions.add('android.permission.WRITE_EXTERNAL_STORAGE');
          break;
        case 'location':
          permissions.add('android.permission.ACCESS_FINE_LOCATION');
          permissions.add('android.permission.ACCESS_COARSE_LOCATION');
          permissions.add('android.permission.ACCESS_BACKGROUND_LOCATION');
          break;
        case 'notifications':
          permissions.add('android.permission.RECEIVE_BOOT_COMPLETED');
          permissions.add('android.permission.VIBRATE');
          break;
        case 'contacts':
          permissions.add('android.permission.READ_CONTACTS');
          permissions.add('android.permission.WRITE_CONTACTS');
          break;
        case 'audio':
          permissions.add('android.permission.RECORD_AUDIO');
          permissions.add('android.permission.MODIFY_AUDIO_SETTINGS');
          break;
        case 'storage':
          permissions.add('android.permission.READ_EXTERNAL_STORAGE');
          permissions.add('android.permission.WRITE_EXTERNAL_STORAGE');
          break;
        case 'network':
          permissions.add('android.permission.INTERNET');
          permissions.add('android.permission.ACCESS_NETWORK_STATE');
          break;
      }
    });

    // Add custom permissions
    Object.keys(customPermissions.android || {}).forEach(permission => {
      permissions.add(permission);
    });

    // Apply permissions to manifest
    if (!androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = [];
    }

    permissions.forEach(permission => {
      const exists = androidManifest.manifest['uses-permission'].some(
        p => p.$['android:name'] === permission
      );
      
      if (!exists) {
        androidManifest.manifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });

    return config;
  });

  // iOS permissions
  config = withInfoPlist(config, (config) => {
    const permissionDescriptions = {
      camera: 'This app uses the camera to capture photos and videos for your projects.',
      location: 'This app uses your location to provide location-based features.',
      locationAlways: 'This app uses your location in the background for continuous tracking.',
      microphone: 'This app uses the microphone to record audio for your projects.',
      contacts: 'This app accesses your contacts to help you connect with friends.',
      photoLibrary: 'This app accesses your photo library to let you select and save images.',
      notifications: 'This app sends notifications to keep you updated with important information.',
    };

    features.forEach(feature => {
      switch (feature) {
        case 'camera':
          config.modResults.NSCameraUsageDescription = permissionDescriptions.camera;
          config.modResults.NSMicrophoneUsageDescription = permissionDescriptions.microphone;
          config.modResults.NSPhotoLibraryUsageDescription = permissionDescriptions.photoLibrary;
          break;
        case 'location':
          config.modResults.NSLocationWhenInUseUsageDescription = permissionDescriptions.location;
          config.modResults.NSLocationAlwaysAndWhenInUseUsageDescription = permissionDescriptions.locationAlways;
          break;
        case 'contacts':
          config.modResults.NSContactsUsageDescription = permissionDescriptions.contacts;
          break;
        case 'audio':
          config.modResults.NSMicrophoneUsageDescription = permissionDescriptions.microphone;
          break;
      }
    });

    // Add custom iOS permissions
    Object.entries(customPermissions.ios || {}).forEach(([key, description]) => {
      config.modResults[key] = description;
    });

    return config;
  });

  return config;
}

/**
 * Applaa Assets Plugin
 * Handles automatic asset generation and optimization
 */
function withApplaaAssets(config, options = {}) {
  const { generateIcons = false, generateSplash = false, iconPrompt = '', splashConfig = {} } = options;

  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;

      // Generate app icons if requested
      if (generateIcons && iconPrompt) {
        try {
          console.log('🎨 Generating app icons with SnapAI...');
          // This would integrate with SnapAI API
          // await generateAppIcons(iconPrompt, path.join(projectRoot, 'assets'));
        } catch (error) {
          console.warn('Failed to generate app icons:', error.message);
        }
      }

      // Generate splash screens if requested
      if (generateSplash && splashConfig) {
        try {
          console.log('🎨 Generating splash screens with SuperDesign...');
          // This would integrate with SuperDesign API
          // await generateSplashScreens(splashConfig, path.join(projectRoot, 'assets'));
        } catch (error) {
          console.warn('Failed to generate splash screens:', error.message);
        }
      }

      return config;
    },
  ]);
}

/**
 * Applaa AI Plugin
 * Optimizes app for AI features and Transformers.js
 */
function withApplaaAI(config, options = {}) {
  const { enableAI = false, enableCoreML = true, enableBackgroundProcessing = false } = options;

  if (!enableAI) return config;

  // Android AI optimizations
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];

    // Enable hardware acceleration for AI
    application.$['android:hardwareAccelerated'] = 'true';
    
    // Enable large heap for AI models
    application.$['android:largeHeap'] = 'true';

    // Add AI-specific permissions
    if (!androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = [];
    }

    const aiPermissions = [
      'android.permission.WAKE_LOCK',
      'android.permission.FOREGROUND_SERVICE',
    ];

    aiPermissions.forEach(permission => {
      const exists = androidManifest.manifest['uses-permission'].some(
        p => p.$['android:name'] === permission
      );
      
      if (!exists) {
        androidManifest.manifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });

    return config;
  });

  // iOS AI optimizations
  config = withInfoPlist(config, (config) => {
    if (enableCoreML) {
      config.modResults.NSCoreMLUsageDescription = 'This app uses AI to provide intelligent features.';
    }

    if (enableBackgroundProcessing) {
      config.modResults.UIBackgroundModes = ['background-processing', 'background-fetch'];
      config.modResults.BGTaskSchedulerPermittedIdentifiers = ['ai-processing-task'];
    }

    // AI performance optimizations
    config.modResults.UIApplicationSupportsIndirectInputEvents = true;

    return config;
  });

  return config;
}

/**
 * Applaa Performance Plugin
 * Optimizes app performance based on configuration
 */
function withApplaaPerformance(config, options = {}) {
  const { enableOptimizations = true, targetDevices = ['phone', 'tablet'] } = options;

  if (!enableOptimizations) return config;

  // Android performance optimizations
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];

    // Enable hardware acceleration
    application.$['android:hardwareAccelerated'] = 'true';
    
    // Optimize for different device types
    if (targetDevices.includes('tablet')) {
      application.$['android:supportsRtl'] = 'true';
      application.$['android:resizeableActivity'] = 'true';
    }

    return config;
  });

  // iOS performance optimizations
  config = withInfoPlist(config, (config) => {
    // Enable metal rendering
    config.modResults.UIRequiredDeviceCapabilities = ['metal'];
    
    // Optimize for tablets
    if (targetDevices.includes('tablet')) {
      config.modResults.UISupportedInterfaceOrientations = [
        'UIInterfaceOrientationPortrait',
        'UIInterfaceOrientationLandscapeLeft',
        'UIInterfaceOrientationLandscapeRight',
        'UIInterfaceOrientationPortraitUpsideDown',
      ];
    }

    return config;
  });

  return config;
}

/**
 * Applaa Features Plugin
 * Configures app based on selected features
 */
function withApplaaFeatures(config, options = {}) {
  const { features = [] } = options;

  // Configure based on features
  features.forEach(feature => {
    switch (feature) {
      case 'transformers-ai':
        config = withApplaaAI(config, { enableAI: true });
        break;
      case 'camera':
        config = withApplaaPermissions(config, { features: ['camera'] });
        break;
      case 'location':
        config = withApplaaPermissions(config, { features: ['location'] });
        break;
      case 'notifications':
        config = withApplaaPermissions(config, { features: ['notifications'] });
        break;
      case 'contacts':
        config = withApplaaPermissions(config, { features: ['contacts'] });
        break;
    }
  });

  return config;
}

module.exports = withApplaa;
module.exports.withApplaaBranding = withApplaaBranding;
module.exports.withApplaaPermissions = withApplaaPermissions;
module.exports.withApplaaAssets = withApplaaAssets;
module.exports.withApplaaAI = withApplaaAI;
module.exports.withApplaaPerformance = withApplaaPerformance;
module.exports.withApplaaFeatures = withApplaaFeatures;

