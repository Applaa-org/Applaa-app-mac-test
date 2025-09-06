import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Pipeline } from 'react-native-transformers';
import * as FileSystem from 'expo-file-system';

interface AITextGeneratorProps {
  modelRepo?: string;
  modelFile?: string;
}

export default function AITextGenerator({ 
  modelRepo = 'Felladrin/onnx-Llama-160M-Chat-v1',
  modelFile = 'onnx/decoder_model_merged.onnx'
}: AITextGeneratorProps) {
  const [output, setOutput] = useState('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    loadModel();
  }, []);

  const loadModel = async () => {
    setIsLoading(true);
    setDownloadProgress(0);
    
    try {
      await Pipeline.TextGeneration.init(modelRepo, modelFile, {
        fetch: async (url: string) => {
          const filename = url.split('/').pop() || 'model.onnx';
          const localPath = FileSystem.cacheDirectory + filename;

          // Check if file already exists
          const fileInfo = await FileSystem.getInfoAsync(localPath);
          if (fileInfo.exists) {
            console.log('Model already downloaded, using cached version');
            return localPath;
          }

          // Download file with progress tracking
          const downloadResumable = FileSystem.createDownloadResumable(
            url,
            localPath,
            {},
            (progress) => {
              const percentComplete = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
              setDownloadProgress(Math.round(percentComplete * 100));
              console.log(`Download progress: ${(percentComplete * 100).toFixed(1)}%`);
            }
          );

          const result = await downloadResumable.downloadAsync();
          return result?.uri || localPath;
        },
      });
      
      setIsModelReady(true);
      Alert.alert('Success', 'AI model loaded successfully!');
    } catch (error) {
      console.error('Error loading model:', error);
      Alert.alert('Error', `Failed to load AI model: ${error.message}`);
    } finally {
      setIsLoading(false);
      setDownloadProgress(0);
    }
  };

  const generateText = async () => {
    if (!input.trim()) {
      Alert.alert('Error', 'Please enter some text to generate from');
      return;
    }

    setOutput('');
    setIsLoading(true);
    
    try {
      // Generate text with streaming callback
      await Pipeline.TextGeneration.generate(
        input,
        (text: string) => {
          setOutput(text);
        }
      );
    } catch (error) {
      console.error('Error generating text:', error);
      Alert.alert('Error', `Failed to generate text: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🤖 AI Text Generator</Text>
      <Text style={styles.subtitle}>Powered by Transformers.js</Text>
      
      {!isModelReady && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            {isLoading ? `Loading model... ${downloadProgress}%` : 'Initializing...'}
          </Text>
          {downloadProgress > 0 && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${downloadProgress}%` }]} />
            </View>
          )}
        </View>
      )}

      {isModelReady && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Enter your prompt here..."
            value={input}
            onChangeText={setInput}
            multiline
            numberOfLines={3}
          />
          
          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={generateText}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Generate Text</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {output && (
        <ScrollView style={styles.outputContainer}>
          <Text style={styles.outputTitle}>Generated Text:</Text>
          <Text style={styles.output}>{output}</Text>
        </ScrollView>
      )}

      <Text style={styles.footer}>
        Using {modelRepo.split('/').pop()} model
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  progressBar: {
    width: '80%',
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  outputContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  outputTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  output: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginTop: 10,
  },
});
