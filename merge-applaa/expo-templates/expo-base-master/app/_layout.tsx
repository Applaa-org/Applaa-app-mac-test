import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppThemeProvider } from '@/providers/AppThemeProvider';
import { seedData } from '@/lib/seed';
import { useEffect } from 'react';
import '../global.css';

export default function RootLayout() {
  useEffect(() => {
    // Initialize with seed data on app start
    seedData();
  }, []);

  return (
    <AppThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="auto" />
    </AppThemeProvider>
  );
}

