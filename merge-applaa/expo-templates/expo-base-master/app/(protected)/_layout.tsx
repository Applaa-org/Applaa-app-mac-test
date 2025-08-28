import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { isSignedIn } from '@/lib/auth';

export default function ProtectedLayout() {
  const router = useRouter();
  useEffect(() => {
    if (!isSignedIn()) {
      router.replace('/(tabs)');
    }
  }, []);
  return <Stack screenOptions={{ headerShown: false }} />;
}


