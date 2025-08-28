import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <View 
      className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}
      {...props}
    >
      {children}
    </View>
  );
}

