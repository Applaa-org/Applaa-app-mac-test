import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceInput({ onTranscript, disabled = false, className = '' }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [useNativeSpeech, setUseNativeSpeech] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [hasNetworkError, setHasNetworkError] = useState(false);
  const [isTemporarilyDisabled, setIsTemporarilyDisabled] = useState(false);
  const [microphoneBlocked, setMicrophoneBlocked] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const retryCountRef = useRef(0);
  const errorCountRef = useRef(0);
  const maxRetries = 2; // Limit retries to prevent infinite loop
  const maxErrors = 3; // Reduced max errors to prevent spam

  useEffect(() => {
    // ✅ Listen for global voice input trigger from Electron
    const handleVoiceTrigger = () => {
      if (!disabled && isSupported) {
        toggleRecording();
      }
    };

    if (typeof window !== 'undefined' && window.electron) {
      window.electron.ipcRenderer.on('trigger-voice-input', handleVoiceTrigger);
    }

    // 🎤 Check for native speech recognition support first
    const checkNativeSpeechSupport = async () => {
      if (typeof window !== 'undefined' && window.electron) {
        try {
          const ipcClient = (await import('@/ipc/ipc_client')).IpcClient.getInstance();
          const support = await ipcClient.checkNativeSpeechSupport();
          
          if (support.supported) {
            console.log(`🎤 Native speech recognition available on ${support.platform}`);
            setUseNativeSpeech(true);
            setIsSupported(true);
            setupNativeSpeechListeners();
            return;
          } else {
            console.log(`🚫 Native speech not supported: ${support.reason}`);
          }
        } catch (error) {
          console.warn('Failed to check native speech support:', error);
        }
      }
      
      // Fallback to Web Speech API
      setupWebSpeechAPI();
    };

    const setupNativeSpeechListeners = () => {
      if (typeof window !== 'undefined' && window.electron) {
        // Listen for native speech events
        window.electron.ipcRenderer.on('speech:ready', () => {
          console.log('🎤 Native speech recognition ready');
          setIsRecording(true);
        });

        window.electron.ipcRenderer.on('speech:result', (result: any) => {
          console.log('🎤 Native speech result:', result);
          if (result.text) {
            setTranscript(result.text);
            if (result.isFinal) {
              onTranscript(result.text);
            }
          }
        });

        window.electron.ipcRenderer.on('speech:partial', (result: any) => {
          console.log('🎤 Native speech partial:', result);
          if (result.text) {
            setTranscript(result.text);
          }
        });

        window.electron.ipcRenderer.on('speech:error', (error: string) => {
          console.error('🎤 Native speech error:', error);
          setIsRecording(false);
          setHasNetworkError(true);
        });

        window.electron.ipcRenderer.on('speech:ended', () => {
          console.log('🎤 Native speech recognition ended');
          setIsRecording(false);
        });
      }
    };

    const setupWebSpeechAPI = () => {
      // Check if Web Speech API is supported
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSupported(true);
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US'; // Default to English, could be made configurable
      
      // ✅ Enhanced settings for Electron and offline support
      const isElectron = typeof window !== 'undefined' && window.electron;
      if (isElectron) {
        recognition.maxAlternatives = 3; // Get multiple alternatives in Electron
        
        // ✅ Try different service configurations for Electron
        try {
          // First try: Use default Google service (most common)
          recognition.serviceURI = '';
          console.log('🎤 Electron environment detected - trying default Google Speech service');
        } catch (error) {
          console.warn('Default service failed, trying alternatives:', error);
        }
        
        // ✅ Electron-specific configuration for better compatibility
        recognition.continuous = true;
        recognition.interimResults = true;
        
        // ✅ Try to set a more browser-like user agent context
        if (recognition.grammars) {
          recognition.grammars = new (window as any).SpeechGrammarList();
        }
        
        console.log('🎤 Electron Web Speech API configured with enhanced settings');
      }
      
      // ✅ Try to enable offline speech recognition
      try {
        // Some browsers support offline speech recognition
        if ('webkitSpeechRecognition' in window) {
          recognition.continuous = true;
          recognition.interimResults = true;
          // Prefer local processing to avoid network errors
          if (recognition.serviceURI !== undefined) {
            recognition.serviceURI = '';
          }
        }
      } catch (offlineError) {
        console.warn('Offline speech recognition not available:', offlineError);
      }
      
      recognition.onstart = () => {
        setIsRecording(true);
        setHasNetworkError(false); // Clear any previous network errors
        retryCountRef.current = 0; // Reset retry count on successful start
        console.log('🎤 Speech recognition started successfully');
        console.log('🔍 Debug info:', {
          continuous: recognition.continuous,
          interimResults: recognition.interimResults,
          lang: recognition.lang,
          serviceURI: recognition.serviceURI || 'default',
          maxAlternatives: recognition.maxAlternatives
        });
      };
      
      recognition.onend = () => {
        setIsRecording(false);
      };
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }
        
        const fullTranscript = finalTranscript || interimTranscript;
        setTranscript(fullTranscript);
        
        // Send final transcript to parent
        if (finalTranscript) {
          onTranscript(finalTranscript);
        }
      };
      
      recognition.onerror = (event) => {
        setIsRecording(false);
        errorCountRef.current += 1;
        
        // 🚨 CRITICAL: Prevent console spam when microphone is not working
        if (errorCountRef.current <= maxErrors) {
          console.warn(`Speech recognition error (${errorCountRef.current}/${maxErrors}):`, event.error);
        }
        
        // Handle specific errors with better UX
        if (event.error === 'not-allowed') {
          setMicrophoneBlocked(true);
          setIsTemporarilyDisabled(true);
          const isElectron = typeof window !== 'undefined' && window.electron;
          if (isElectron) {
            console.warn('🎤 Microphone access denied in Electron - this might be a permission issue. Check system microphone permissions.');
          } else {
            console.warn('🎤 Microphone access denied - voice input disabled');
          }
          // Don't show alert repeatedly - just disable silently
        } else if (event.error === 'no-speech') {
          // No speech detected - this is normal, just stop recording silently
          if (errorCountRef.current <= 2) {
            console.log('No speech detected - stopping recording');
          }
        } else if (event.error === 'network') {
          // Network error - likely Google speech services are blocked or unreachable
          setHasNetworkError(true);
          setIsRecording(false);
          setIsTemporarilyDisabled(true);
          
          // Only log the first few network errors to prevent console spam
          if (errorCountRef.current <= 2) {
            console.warn('🌐 Voice recognition failed to connect to Google\'s speech servers.');
            console.info('💡 SOLUTION: Use native OS speech recognition instead of web APIs!');
            console.info('   • Windows: Windows Speech API (SAPI) or PowerShell');
            console.info('   • macOS: NSSpeechRecognizer or Speech Framework');
            console.info('   • Electron: Can execute native OS speech recognition');
            console.info('🔧 Implementing native OS speech recognition...');
            console.info('💭 This will work offline and bypass Google\'s web API restrictions');
            
            // Test connectivity immediately when error occurs
            testGoogleSpeechConnectivity();
          }
          
          // Clear network error indicator after 5 seconds but keep disabled
          setTimeout(() => setHasNetworkError(false), 5000);
        } else if (event.error === 'aborted') {
          // User cancelled - don't log as error
          if (errorCountRef.current <= 2) {
            console.log('Speech recognition aborted by user');
          }
        } else {
          // Other errors - only show if we haven't exceeded error limit
          if (errorCountRef.current <= maxErrors) {
            console.error('Speech recognition error:', event.error);
          }
          
          // Disable after too many errors to prevent spam
          if (errorCountRef.current >= maxErrors) {
            setIsTemporarilyDisabled(true);
            console.warn('Voice recognition disabled due to repeated errors');
          }
        }
      };
      
        recognitionRef.current = recognition;
      }
    };

    // Initialize speech recognition
    checkNativeSpeechSupport();
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      // ✅ Cleanup global voice trigger listener
      if (typeof window !== 'undefined' && window.electron) {
        window.electron.ipcRenderer.removeAllListeners('trigger-voice-input');
        window.electron.ipcRenderer.removeAllListeners('speech:ready');
        window.electron.ipcRenderer.removeAllListeners('speech:result');
        window.electron.ipcRenderer.removeAllListeners('speech:partial');
        window.electron.ipcRenderer.removeAllListeners('speech:error');
        window.electron.ipcRenderer.removeAllListeners('speech:ended');
      }
    };
  }, [onTranscript, testGoogleSpeechConnectivity]);

  const testGoogleSpeechConnectivity = async () => {
    console.log('🔍 Testing connectivity to Google Speech services...');
    
    // Test multiple endpoints to narrow down the issue
    const endpoints = [
      'https://www.google.com',
      'https://speech.googleapis.com',
      'https://www.googleapis.com'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(endpoint, { 
          method: 'HEAD', 
          mode: 'no-cors',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log(`✅ ${endpoint} - reachable`);
      } catch (error) {
        console.warn(`❌ ${endpoint} - failed:`, error.name);
      }
    }
    
    // Test if this is an Electron-specific issue
    console.log('🔍 Electron environment details:', {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      onLine: navigator.onLine,
      cookieEnabled: navigator.cookieEnabled
    });
    
    return true;
  };

  const resetVoiceInput = async () => {
    // Reset all error states
    errorCountRef.current = 0;
    retryCountRef.current = 0;
    setHasNetworkError(false);
    setIsTemporarilyDisabled(false);
    setMicrophoneBlocked(false);
    setTranscript('');
    console.log('🎤 Voice input reset - testing connectivity...');
    
    // Test connectivity to help diagnose issues
    await testGoogleSpeechConnectivity();
    
    console.log('🎤 Ready to try voice input again');
  };

  const toggleRecording = async () => {
    if (disabled) return;
    
    // If disabled due to errors, allow user to reset by clicking
    if (isTemporarilyDisabled || microphoneBlocked || errorCountRef.current >= maxErrors) {
      resetVoiceInput();
      return;
    }
    
    if (useNativeSpeech) {
      // 🎤 Use native OS speech recognition
      try {
        const ipcClient = (await import('@/ipc/ipc_client')).IpcClient.getInstance();
        
        if (isRecording) {
          await ipcClient.stopNativeSpeechRecognition();
          setIsRecording(false);
        } else {
          setHasNetworkError(false);
          setTranscript('');
          await ipcClient.startNativeSpeechRecognition({
            language: 'en-US',
            continuous: true
          });
          // Note: setIsRecording(true) will be called by the 'speech:ready' event
        }
      } catch (error) {
        console.error('Failed to toggle native speech recognition:', error);
        setHasNetworkError(true);
        errorCountRef.current += 1;
        if (errorCountRef.current >= maxErrors) {
          setIsTemporarilyDisabled(true);
        }
      }
    } else {
      // 🌐 Fallback to Web Speech API
      if (!recognitionRef.current) return;
      
      if (isRecording) {
        recognitionRef.current.stop();
      } else {
        // Reset retry count when user manually starts recording
        retryCountRef.current = 0;
        setHasNetworkError(false);
        setTranscript('');
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.warn('Failed to start speech recognition:', error);
          setHasNetworkError(true);
          errorCountRef.current += 1;
          if (errorCountRef.current >= maxErrors) {
            setIsTemporarilyDisabled(true);
          }
        }
      }
    }
  };

  // Don't render if not supported
  if (!isSupported) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={toggleRecording}
        disabled={disabled}
        className={`p-2 rounded-lg transition-all duration-200 ${
          isTemporarilyDisabled || microphoneBlocked || errorCountRef.current >= maxErrors
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
            : hasNetworkError
              ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30 dark:text-yellow-400'
              : isRecording 
                ? 'bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400' 
                : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-400'
        }`}
                            title={
                      microphoneBlocked
                        ? '🚫 Microphone access denied. Click to reset and try again.'
                        : errorCountRef.current >= maxErrors
                          ? '🚫 Voice input disabled due to errors. Click to reset and try again.'
                          : isTemporarilyDisabled
                            ? useNativeSpeech 
                              ? '🚫 Native speech recognition failed. Click to reset and try again.'
                              : '🚫 Voice input disabled: Google blocks Speech API in Electron apps. Use browser version for voice input.'
                            : hasNetworkError 
                              ? '⚠️ Network issue detected' 
                              : isRecording 
                                ? 'Stop recording (click to stop)' 
                                : useNativeSpeech
                                  ? '🎤 Start native voice input (Windows/macOS speech recognition)'
                                  : 'Start voice input (click or Ctrl+Shift+V)'
                    }
      >
        {isRecording ? (
          <div className="flex items-center gap-1">
            <MicOff className="h-4 w-4" />
            <div className="flex gap-0.5">
              <div className="w-1 h-3 bg-current rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-4 bg-current rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
      
      {/* Show interim transcript while recording */}
      {isRecording && transcript && (
        <div className="text-xs text-gray-500 dark:text-gray-400 italic max-w-32 truncate">
          "{transcript}"
        </div>
      )}
    </div>
  );
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
