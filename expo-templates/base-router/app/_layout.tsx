/**
 * 🚨 APPLAA SIMPLE TEMPLATE - Root Layout
 * Simple single-screen layout - LLM can add tabs if needed
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}