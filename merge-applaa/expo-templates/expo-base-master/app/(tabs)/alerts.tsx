import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';

export default function AlertsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Header title="Alerts" />
      <ScrollView className="flex-1 px-4">
        <View className="py-6 space-y-4">
          <Card className="p-6">
            <Text className="text-xl font-bold text-gray-800 mb-4">
              🔔 Recent Alerts
            </Text>
            <View className="space-y-4">
              <View className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <Text className="font-semibold text-blue-800">System Update</Text>
                <Text className="text-blue-600 text-sm mt-1">
                  Your app has been updated to the latest version.
                </Text>
              </View>
              
              <View className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                <Text className="font-semibold text-green-800">Performance</Text>
                <Text className="text-green-600 text-sm mt-1">
                  App performance has improved by 20% this week.
                </Text>
              </View>
              
              <View className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                <Text className="font-semibold text-yellow-800">Maintenance</Text>
                <Text className="text-yellow-600 text-sm mt-1">
                  Scheduled maintenance tomorrow at 2 AM UTC.
                </Text>
              </View>
            </View>
          </Card>

          <Card className="p-6">
            <Text className="text-lg font-semibold text-gray-800 mb-3">
              ⚙️ Notification Settings
            </Text>
            <Text className="text-gray-600">
              Manage your notification preferences and alert frequency.
            </Text>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

