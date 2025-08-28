import { useState, useRef, useCallback, useEffect } from 'react';

interface UseVoiceInputOptions {
  onResult: (transcript: string) => void;
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
}

interface VoiceInputState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
}

export function useVoiceInput({
  onResult,
  continuous = true,
  interimResults = true,
  language = 'en-US',
}: UseVoiceInputOptions) {
  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    isSupported: false,
    transcript: '',
    interimTranscript: '',
    error: null,
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const retryCountRef = useRef<number>(0);
  const stopRequestedRef = useRef<boolean>(false);

  // Store the onResult callback in a ref to avoid recreating recognition on every render
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  // Check if speech recognition is supported
  useEffect(() => {
    const SpeechRecognition = 
      window.SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setState(prev => ({ ...prev, isSupported: true }));
      
      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = language;
      
      // Handle successful recognition
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = finalTranscriptRef.current;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        finalTranscriptRef.current = finalTranscript;
        
        setState(prev => ({
          ...prev,
          transcript: finalTranscript,
          interimTranscript,
          error: null,
        }));

        // Call onResult with the final transcript when we have one
        if (finalTranscript.trim()) {
          onResultRef.current(finalTranscript.trim());
        }
      };

      // Handle errors
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        let errorMessage = 'Speech recognition error';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try again.';
            break;
          case 'audio-capture':
            errorMessage = 'Microphone access denied or not available.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone permission denied.';
            break;
          case 'network':
            errorMessage = 'Network error occurred.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }

        // Auto-retry on transient errors while listening
        const transient = event.error === 'network' || event.error === 'no-speech';
        if (state.isListening && transient && retryCountRef.current < 3) {
          retryCountRef.current += 1;
          setTimeout(() => {
            try { recognitionRef.current?.start(); } catch {}
          }, 800);
        } else {
          setState(prev => ({
            ...prev,
            error: errorMessage,
            isListening: false,
          }));
        }
      };

      // Handle when recognition starts
      recognition.onstart = () => {
        retryCountRef.current = 0;
        setState(prev => ({ ...prev, isListening: true, error: null }));
      };

      // Handle when recognition ends
      recognition.onend = () => {
        if (stopRequestedRef.current) {
          stopRequestedRef.current = false;
          setState(prev => ({ ...prev, isListening: false }));
        } else if (state.isListening && retryCountRef.current < 3) {
          // Keep session alive if user expects continuous listening
          try { recognitionRef.current?.start(); } catch {}
        } else {
          setState(prev => ({ ...prev, isListening: false }));
          // If we have a final transcript, call onResult
          if (finalTranscriptRef.current.trim()) {
            onResultRef.current(finalTranscriptRef.current.trim());
          }
        }
      };

      recognitionRef.current = recognition;
    } else {
      setState(prev => ({ 
        ...prev, 
        isSupported: false,
        error: 'Speech recognition not supported in this browser'
      }));
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [continuous, interimResults, language]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || state.isListening) return;

    try {
      // Warm up mic permission proactively
      if (navigator?.mediaDevices?.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {});
      }
      // Reset transcript
      finalTranscriptRef.current = '';
      setState(prev => ({ 
        ...prev, 
        transcript: '', 
        interimTranscript: '', 
        error: null 
      }));
      stopRequestedRef.current = false;
      retryCountRef.current = 0;
      recognitionRef.current.start();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to start voice recognition',
        isListening: false,
      }));
    }
  }, [state.isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !state.isListening) return;

    try {
      stopRequestedRef.current = true;
      recognitionRef.current.stop();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to stop voice recognition',
        isListening: false,
      }));
    }
  }, [state.isListening]);

  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
    // Helpful guidance for UI components to display when errors occur
    help: state.error ?
      (state.error.includes('permission') || state.error.includes('Microphone'))
        ? 'Microphone permission is blocked. Click to open Windows microphone settings and enable access for desktop apps.'
        : state.error.includes('Network')
          ? 'Network issue detected. Check your internet connection or VPN and try again.'
          : null
      : null,
  };
}
