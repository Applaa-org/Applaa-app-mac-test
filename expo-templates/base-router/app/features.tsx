import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  Switch,
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import utilities
import { storage, storeUserPreference, getUserPreference } from '../utils/storage';

interface FeatureStatus {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  status: 'ready' | 'loading' | 'error' | 'disabled';
  icon: string;
}

export default function FeaturesScreen() {
  const [features, setFeatures] = useState<FeatureStatus[]>([
    {
      id: 'transformers-ai',
      name: 'Transformers.js AI',
      description: 'On-device AI text generation and analysis',
      enabled: false,
      status: 'ready',
      icon: '🤖',
    },
    {
      id: 'offline-storage',
      name: 'Offline Storage',
      description: 'Local data storage with AsyncStorage and SQLite',
      enabled: true,
      status: 'ready',
      icon: '💾',
    },
    {
      id: 'notifications',
      name: 'Push Notifications',
      description: 'Local and remote notifications',
      enabled: false,
      status: 'ready',
      icon: '🔔',
    },
    {
      id: 'supabase',
      name: 'Supabase Backend',
      description: 'Authentication and database integration',
      enabled: false,
      status: 'ready',
      icon: '🗄️',
    },
    {
      id: 'splash-screen',
      name: 'Enhanced Splash Screen',
      description: 'Professional splash screen with animations',
      enabled: true,
      status: 'ready',
      icon: '🚀',
    },
  ]);

  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [storageInfo, setStorageInfo] = useState<any>(null);

  useEffect(() => {
    loadFeatureStates();
    loadStorageInfo();
  }, []);

  const loadFeatureStates = async () => {
    try {
      for (const feature of features) {
        const enabled = await getUserPreference(`feature_${feature.id}`);
        if (enabled !== null) {
          setFeatures(prev => prev.map(f => 
            f.id === feature.id ? { ...f, enabled } : f
          ));
        }
      }
    } catch (error: any) {
      console.error('Failed to load feature states:', error);
    }
  };

  const loadStorageInfo = async () => {
    try {
      const info = await storage.getStorageInfo();
      setStorageInfo(info);
    } catch (error: any) {
      console.error('Failed to load storage info:', error);
    }
  };

  const toggleFeature = async (featureId: string) => {
    const feature = features.find(f => f.id === featureId);
    if (!feature) return;

    // Update UI immediately
    setFeatures(prev => prev.map(f => 
      f.id === featureId 
        ? { ...f, enabled: !f.enabled, status: 'loading' }
        : f
    ));

    try {
      const newEnabled = !feature.enabled;
      
      // Save preference
      await storeUserPreference(`feature_${featureId}`, newEnabled);

      // Initialize feature if enabled
      if (newEnabled) {
        await initializeFeature(featureId);
      }

      // Update status
      setFeatures(prev => prev.map(f => 
        f.id === featureId 
          ? { ...f, enabled: newEnabled, status: 'ready' }
          : f
      ));

      // Show feedback
      Alert.alert(
        'Feature Updated',
        `${feature.name} has been ${newEnabled ? 'enabled' : 'disabled'}.`,
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      console.error(`Failed to toggle feature ${featureId}:`, error);
      
      // Revert on error
      setFeatures(prev => prev.map(f => 
        f.id === featureId 
          ? { ...f, enabled: feature.enabled, status: 'error' }
          : f
      ));

      Alert.alert('Error', `Failed to update ${feature.name}: ${error?.message || 'Unknown error'}`);
    }
  };

  const initializeFeature = async (featureId: string) => {
    switch (featureId) {
      case 'notifications':
        console.log('Notifications feature enabled');
        break;

      case 'supabase':
        // Initialize Supabase connection
        console.log('Supabase initialized');
        break;

      // transformers-ai removed for MVP

      default:
        console.log(`Feature ${featureId} initialized`);
    }
  };

  const runFeatureDemo = async (featureId: string) => {
    setActiveDemo(featureId);
    const feature = features.find(f => f.id === featureId);

    try {
      switch (featureId) {
        case 'offline-storage':
          await demoStorage();
          break;

        case 'notifications':
          await demoNotifications();
          break;

        case 'supabase':
          await demoSupabase();
          break;

        case 'transformers-ai':
          // Demo is handled by the AI component
          break;

        default:
          Alert.alert('Demo', `${feature?.name} demo would run here.`);
      }
    } catch (error: any) {
      Alert.alert('Demo Error', `Failed to run ${feature?.name} demo: ${error?.message || 'Unknown error'}`);
    } finally {
      setActiveDemo(null);
    }
  };

  const demoStorage = async () => {
    // Store some demo data
    await storage.setItem('demo_data', {
      message: 'Hello from Applaa Storage!',
      timestamp: new Date().toISOString(),
      features: ['encryption', 'compression', 'expiration'],
    });

    // Retrieve and show
    const data = await storage.getItem('demo_data');
    await loadStorageInfo();

    Alert.alert(
      'Storage Demo',
      `Data stored and retrieved successfully!\n\nStored: ${JSON.stringify(data, null, 2)}`,
      [{ text: 'Cool!' }]
    );
  };

  const demoNotifications = async () => {
    Alert.alert(
      'Notifications Demo',
      'Notifications feature is ready! Configure your notification settings to enable push notifications.',
      [{ text: 'Got it!' }]
    );
  };

  const demoSupabase = async () => {
    Alert.alert(
      'Supabase Demo',
      'Supabase is ready for authentication and database operations. Configure your project URL and keys to get started.',
      [{ text: 'Got it!' }]
    );
  };


  const renderFeatureCard = (feature: FeatureStatus) => (
    <View key={feature.id} style={styles.featureCard}>
      <View style={styles.featureHeader}>
        <View style={styles.featureInfo}>
          <Text style={styles.featureIcon}>{feature.icon}</Text>
          <View style={styles.featureText}>
            <Text style={styles.featureName}>{feature.name}</Text>
            <Text style={styles.featureDescription}>{feature.description}</Text>
          </View>
        </View>
        
        <View style={styles.featureControls}>
          <Switch
            value={feature.enabled}
            onValueChange={() => toggleFeature(feature.id)}
            disabled={feature.status === 'loading'}
          />
        </View>
      </View>

      {feature.enabled && (
        <View style={styles.featureActions}>
          <TouchableOpacity
            style={styles.demoButton}
            onPress={() => runFeatureDemo(feature.id)}
            disabled={activeDemo === feature.id}
          >
            {activeDemo === feature.id ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.demoButtonText}>Try Demo</Text>
            )}
          </TouchableOpacity>

          <View style={styles.statusIndicator}>
            <Text style={[
              styles.statusText,
              { color: feature.status === 'ready' ? '#28a745' : '#dc3545' }
            ]}>
              {feature.status.toUpperCase()}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>🚀 App Features</Text>
          <Text style={styles.subtitle}>
            Explore and configure your app's capabilities
          </Text>
        </View>

        {/* Storage Info */}
        {storageInfo && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>📊 Storage Info</Text>
            <Text style={styles.infoText}>
              Items: {storageInfo.totalItems} • Size: {(storageInfo.totalSize / 1024).toFixed(1)}KB
              {storageInfo.expiredItems > 0 && ` • Expired: ${storageInfo.expiredItems}`}
            </Text>
          </View>
        )}

        {/* Feature Cards */}
        <View style={styles.featuresContainer}>
          {features.map(renderFeatureCard)}
        </View>


        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => storage.cleanupExpired()}
          >
            <Text style={styles.actionButtonText}>🗑️ Clean Storage</Text>
          </TouchableOpacity>


          <TouchableOpacity
            style={styles.actionButton}
            onPress={loadStorageInfo}
          >
            <Text style={styles.actionButtonText}>🔄 Refresh Info</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            💡 All features are ready to use! Enable them to unlock powerful capabilities for your app.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  infoCard: {
    backgroundColor: '#e3f2fd',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
  },
  featuresContainer: {
    paddingHorizontal: 20,
  },
  featureCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureText: {
    flex: 1,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6c757d',
  },
  featureControls: {
    marginLeft: 12,
  },
  featureActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  demoButton: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  demoButtonText: {
    color: '#1976d2',
    fontSize: 14,
    fontWeight: '600',
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#f8f9fa',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  demoSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  quickActions: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#495057',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
  },
});
