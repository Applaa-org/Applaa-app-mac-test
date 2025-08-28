import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Home, BarChart3, Bell } from 'lucide-react-native';

export default function TabLayout() {
  const router = useRouter();

  useEffect(() => {
    try {
      // Enhanced: Router UI prefetch for snappier tab switching
      router.prefetch('/(tabs)/analytics');
      router.prefetch('/(tabs)/alerts');
    } catch {}
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#64748b',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <BarChart3 color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <Bell color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

