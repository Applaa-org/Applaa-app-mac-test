import React from 'react';
import { View, Text } from 'react-native';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <View className="px-4 py-6 bg-white border-b border-gray-100">
      <Text className="text-2xl font-bold text-gray-900">{title}</Text>
      {subtitle && (
        <Text className="text-gray-600 mt-1">{subtitle}</Text>
      )}
    </View>
  );
}

