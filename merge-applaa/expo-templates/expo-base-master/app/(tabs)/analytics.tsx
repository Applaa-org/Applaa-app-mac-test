import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';

export default function AnalyticsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Header title="Analytics" />
      <ScrollView className="flex-1 px-4">
        <View className="py-6 space-y-4">
          <Card className="p-6">
            <Text className="text-xl font-bold text-gray-800 mb-4">
              📊 App Analytics
            </Text>
            <View className="space-y-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600">Active Users</Text>
                <Text className="text-lg font-semibold text-blue-600">1,234</Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600">Sessions Today</Text>
                <Text className="text-lg font-semibold text-green-600">456</Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600">Retention Rate</Text>
                <Text className="text-lg font-semibold text-purple-600">78%</Text>
              </View>
            </View>
          </Card>

          <Card className="p-6">
            <Text className="text-lg font-semibold text-gray-800 mb-3">
              📈 Growth Metrics
            </Text>
            <Text className="text-gray-600">
              Your app is performing well! User engagement is up 15% this week.
            </Text>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

