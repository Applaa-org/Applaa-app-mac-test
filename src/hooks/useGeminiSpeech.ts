import { useState, useRef, useCallback } from 'react';
import { ipcClient } from '@/ipc/ipc_client';

interface UseGeminiSpeechOptions {
    onTranscript: (text: string) => void;
    onTranscriptionEnd?: () => void;
}

export function useGeminiSpeech({ onTranscript, onTranscriptionEnd }: UseGeminiSpeechOptions) {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const startListening = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                setIsProcessing(true);
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

                // Convert Blob to Base64
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = reader.result?.toString().split(',')[1];
                    if (base64Audio) {
                        try {
                            const result = await ipcClient.automationTranscribe({
                                audioBase64: base64Audio,
                                mimeType: 'audio/webm'
                            });

                            if (result.success && result.text) {
                                onTranscript(result.text.trim());
                            } else {
                                console.error('Transcription failed:', result.message);
                            }
                        } catch (error) {
                            console.error('Transcription error:', error);
                        }
                    }
                    setIsProcessing(false);
                    onTranscriptionEnd?.();

                    // Stop all tracks
                    stream.getTracks().forEach(track => track.stop());
                };
            };

            mediaRecorder.start();
            setIsListening(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    }, [onTranscript, onTranscriptionEnd]);

    const stopListening = useCallback(() => {
        if (mediaRecorderRef.current && isListening) {
            mediaRecorderRef.current.stop();
            setIsListening(false);
        }
    }, [isListening]);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    return {
        isListening,
        isProcessing,
        startListening,
        stopListening,
        toggleListening
    };
}
