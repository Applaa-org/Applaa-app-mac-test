import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import AITextGenerator from '../components/AITextGenerator';

export default function AIScreen() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'AI Assistant',
          headerStyle: { backgroundColor: '#007AFF' },
          headerTintColor: '#fff',
        }} 
      />
      <View style={styles.container}>
        <AITextGenerator />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
