import React, { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  useEffect(() => {
    try {
      router.prefetch('/(tabs)/analytics');
      router.prefetch('/(tabs)/alerts');
    } catch {}
  }, []);
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Header title="Welcome to Applaa" />
      <ScrollView className="flex-1 px-4">
        <View className="py-6 space-y-4">
          <Card className="p-6">
            <Text className="text-xl font-bold text-gray-800 mb-2">
              🎉 Your App is Ready!
            </Text>
            <Text className="text-gray-600 leading-6">
              This is your new mobile app built with Expo and React Native. 
              You can start customizing it with your own features and design.
            </Text>
          </Card>

          <Card className="p-6">
            <Text className="text-lg font-semibold text-gray-800 mb-2">
              ⚡ Features Included
            </Text>
            <View className="space-y-2">
              <Text className="text-gray-600">• Expo Router for navigation</Text>
              <Text className="text-gray-600">• Gluestack UI components</Text>
              <Text className="text-gray-600">• NativeWind (TailwindCSS)</Text>
              <Text className="text-gray-600">• SQLite storage</Text>
              <Text className="text-gray-600">• Beautiful bottom tabs</Text>
            </View>
          </Card>

          <Card className="p-6">
            <Text className="text-lg font-semibold text-gray-800 mb-2">
              🚀 Next Steps
            </Text>
            <Text className="text-gray-600 leading-6">
              Start building your app by describing what you want. 
              The AI will help you add features, create screens, and customize the design.
            </Text>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

