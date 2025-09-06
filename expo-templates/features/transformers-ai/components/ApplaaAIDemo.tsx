import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Pipeline } from 'react-native-transformers';
import { SimpleStorage } from '../utils/storage';
import { NotificationManager } from '../utils/notifications';

const AI_DEMOS = [
  {
    id: 'creative-writing',
    title: '✍️ Creative Writing',
    prompt: 'Write a short story about a robot learning to paint:',
    description: 'Generate creative content'
  },
  {
    id: 'code-helper',
    title: '💻 Code Assistant',
    prompt: 'Explain this React Native component and suggest improvements:\n\nconst Button = ({ title, onPress }) => {\n  return <TouchableOpacity onPress={onPress}><Text>{title}</Text></TouchableOpacity>\n}',
    description: 'Get coding help and explanations'
  },
  {
    id: 'business-ideas',
    title: '💡 Business Ideas',
    prompt: 'Generate 3 innovative mobile app ideas for small businesses:',
    description: 'Brainstorm business concepts'
  },
  {
    id: 'learning-tutor',
    title: '🎓 Learning Tutor',
    prompt: 'Explain machine learning in simple terms for beginners:',
    description: 'Educational content generation'
  }
];

export default function ApplaaAIDemo() {
  const [isModelReady, setIsModelReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentDemo, setCurrentDemo] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const [savedResults, setSavedResults] = useState<string[]>([]);

  useEffect(() => {
    initializeAI();
    loadSavedResults();
    setupNotifications();
  }, []);

  const initializeAI = async () => {
    setIsLoading(true);
    try {
      // Initialize with a lightweight model for demo
      await Pipeline.TextGeneration.init(
        'Felladrin/onnx-Llama-160M-Chat-v1',
        'onnx/decoder_model_merged.onnx'
      );
      setIsModelReady(true);
      
      // Show welcome notification
      await NotificationManager.scheduleLocalNotification(
        '🤖 AI Ready!',
        'Your personal AI assistant is now ready to help you create amazing content!'
      );
    } catch (error) {
      console.error('AI initialization failed:', error);
      Alert.alert('AI Error', 'Failed to initialize AI model. Some features may not work.');
    } finally {
      setIsLoading(false);
    }
  };

  const setupNotifications = async () => {
    try {
      await NotificationManager.registerForPushNotifications();
    } catch (error) {
      console.log('Notification setup failed:', error);
    }
  };

  const loadSavedResults = async () => {
    try {
      const saved = await SimpleStorage.getItem<string[]>('ai-demo-results') || [];
      setSavedResults(saved);
    } catch (error) {
      console.error('Failed to load saved results:', error);
    }
  };

  const runDemo = async (demo: typeof AI_DEMOS[0]) => {
    if (!isModelReady) {
      Alert.alert('AI Not Ready', 'Please wait for the AI model to finish loading.');
      return;
    }

    setCurrentDemo(demo.id);
    setResults(prev => ({ ...prev, [demo.id]: '' }));

    try {
      await Pipeline.TextGeneration.generate(
        demo.prompt,
        (text: string) => {
          setResults(prev => ({ ...prev, [demo.id]: text }));
        }
      );

      // Save result
      const newResult = `${demo.title}: ${results[demo.id]}`;
      const updatedResults = [...savedResults, newResult].slice(-10); // Keep last 10
      setSavedResults(updatedResults);
      await SimpleStorage.setItem('ai-demo-results', updatedResults);

      // Show completion notification
      await NotificationManager.scheduleLocalNotification(
        '✅ AI Task Complete',
        `${demo.title} generation finished!`
      );

    } catch (error) {
      console.error('Demo failed:', error);
      Alert.alert('Demo Error', `Failed to run ${demo.title}: ${error.message}`);
    } finally {
      setCurrentDemo(null);
    }
  };

  const clearHistory = async () => {
    try {
      setSavedResults([]);
      await SimpleStorage.removeItem('ai-demo-results');
      Alert.alert('History Cleared', 'All saved AI results have been cleared.');
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🚀 Applaa AI Showcase</Text>
        <Text style={styles.subtitle}>
          Powered by Transformers.js - Running AI locally on your device!
        </Text>
        
        {isLoading && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>🔄 Loading AI model...</Text>
          </View>
        )}
        
        {isModelReady && (
          <View style={styles.statusContainer}>
            <Text style={[styles.statusText, styles.ready]}>✅ AI Ready!</Text>
          </View>
        )}
      </View>

      <View style={styles.demosContainer}>
        <Text style={styles.sectionTitle}>🎯 AI Capabilities Demo</Text>
        
        {AI_DEMOS.map((demo) => (
          <TouchableOpacity
            key={demo.id}
            style={[
              styles.demoCard,
              currentDemo === demo.id && styles.demoCardActive
            ]}
            onPress={() => runDemo(demo)}
            disabled={!isModelReady || currentDemo === demo.id}
          >
            <Text style={styles.demoTitle}>{demo.title}</Text>
            <Text style={styles.demoDescription}>{demo.description}</Text>
            
            {currentDemo === demo.id && (
              <Text style={styles.generatingText}>🔄 Generating...</Text>
            )}
            
            {results[demo.id] && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultTitle}>Result:</Text>
                <Text style={styles.resultText}>{results[demo.id]}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {savedResults.length > 0 && (
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>📚 Recent Results</Text>
            <TouchableOpacity onPress={clearHistory} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
          
          {savedResults.slice(-3).map((result, index) => (
            <View key={index} style={styles.historyItem}>
              <Text style={styles.historyText} numberOfLines={3}>
                {result}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🎉 This showcases on-device AI with Transformers.js
        </Text>
        <Text style={styles.footerSubtext}>
          • No internet required for AI inference{'\n'}
          • Privacy-first: data stays on device{'\n'}
          • Powered by ONNX Runtime{'\n'}
          • Built with Applaa
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#212529',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6c757d',
    marginBottom: 16,
  },
  statusContainer: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  ready: {
    color: '#28a745',
  },
  demosContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
  },
  demoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  demoCardActive: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  demoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  demoDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  generatingText: {
    fontSize: 14,
    color: '#007AFF',
    fontStyle: 'italic',
    marginTop: 8,
  },
  resultContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 4,
  },
  resultText: {
    fontSize: 14,
    color: '#212529',
    lineHeight: 20,
  },
  historyContainer: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#dc3545',
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  historyItem: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  historyText: {
    fontSize: 12,
    color: '#495057',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  footerText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#28a745',
    marginBottom: 8,
  },
  footerSubtext: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6c757d',
    lineHeight: 20,
  },
});
