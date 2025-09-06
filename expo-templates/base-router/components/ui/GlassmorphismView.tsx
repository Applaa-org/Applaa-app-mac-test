import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
// Minimal template: avoid expo-blur to reduce first-run deps
import { View as BlurView } from 'react-native';

interface GlassmorphismViewProps {
  children: React.ReactNode;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  style?: ViewStyle;
  borderRadius?: number;
}

export function GlassmorphismView({ 
  children, 
  intensity = 20, 
  tint = 'light',
  style,
  borderRadius = 16
}: GlassmorphismViewProps) {
  return (
    <View style={[styles.container, style, { borderRadius }]}>
      <BlurView style={[styles.blurView, { borderRadius }]}> 
        <View style={[styles.content, { borderRadius }]}>
          {children}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  blurView: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
  },
});
