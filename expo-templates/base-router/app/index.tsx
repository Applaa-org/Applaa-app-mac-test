import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientCard } from '../components/ui/GradientCard';
import { GlassmorphismView } from '../components/ui/GlassmorphismView';
import { AnimatedButton } from '../components/ui/AnimatedButton';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Hero Background Gradient */}
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroBackground}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Hero Section */}
            <View style={styles.hero}>
              <Text style={styles.heroTitle}>🚀 Welcome to {{APP_DISPLAY_NAME}}</Text>
              <Text style={styles.heroSubtitle}>
                Your app is powered by cutting-edge features and stunning Dribbble-inspired design!
              </Text>
            </View>

            {/* Enhanced Feature Highlights with Gradient Cards */}
            <View style={styles.featuresGrid}>
              <GradientCard
                title="🤖 AI-Powered"
                subtitle="On-device AI with Transformers.js"
                colors={['#ff6b6b', '#ee5a24']}
                onPress={() => console.log('AI Features pressed')}
              />
              
              <GradientCard
                title="💾 Offline Storage"
                subtitle="AsyncStorage and SQLite ready"
                colors={['#00d2d3', '#54a0ff']}
                onPress={() => console.log('Storage Features pressed')}
              />
              
              <GradientCard
                title="🔔 Smart Notifications"
                subtitle="Push notifications with expo-notifications"
                colors={['#5f27cd', '#a55eea']}
                onPress={() => console.log('Notification Features pressed')}
              />
              
              <GradientCard
                title="🎨 Design Studio"
                subtitle="AI-powered icon generation & UI"
                colors={['#ff9a9e', '#fecfef']}
                onPress={() => console.log('Design Features pressed')}
              />
            </View>

            {/* Demo Section (kept minimal) */}
            <GlassmorphismView style={styles.demoSection}>
              <Text style={styles.sectionTitle}>🎮 Demo</Text>
              <Text style={{ color: '#fff' }}>Your preview is ready instantly. Add features anytime.</Text>
            </GlassmorphismView>

            {/* Enhanced Action Buttons */}
            <View style={styles.actions}>
              <Link href="/features" asChild>
                <AnimatedButton
                  title="🚀 Explore All Features"
                  onPress={() => {}}
                  colors={['#ff9a9e', '#fecfef']}
                />
              </Link>
            </View>

            {/* Enhanced Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                🎉 Built with Applaa's Advanced Template System
              </Text>
              <Text style={styles.footerSubtext}>✨ Minimal template • ⚡ Fast preview • 📱 Native performance</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroBackground: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  hero: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.95,
    paddingHorizontal: 10,
  },
  featuresGrid: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  demoSection: {
    marginHorizontal: 20,
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  actions: {
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  footer: {
    padding: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.9,
  },
});
