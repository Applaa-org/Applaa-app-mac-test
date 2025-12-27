import { useState, useEffect, useRef } from 'react';
import {
    Plus,
    AudioLines,
    Paperclip,
    Scan,
    Mic,
    MicOff,
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ipcClient } from '@/ipc/ipc_client';

// Removed BuddyMode logic from UI as requested

interface BuddyInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onAttachFile?: () => void;
    onAttachScreenshot?: () => void;
    onVoiceInput?: () => void; // Callback when voice transcription succeeds
    isLoading?: boolean;
}

export function BuddyInput({
    value,
    onChange,
    onSubmit,
    onAttachFile,
    onAttachScreenshot,
    onVoiceInput,
    isLoading,
}: BuddyInputProps) {
    const [isListening, setIsListening] = useState(false);
    const [isProcessingAudio, setIsProcessingAudio] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
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
                setIsProcessingAudio(true);
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
                                onChange(value + (value && !value.endsWith(' ') ? ' ' : '') + result.text);
                                // Notify parent that voice input was used
                                onVoiceInput?.();
                            } else {
                                console.error('Transcription failed:', result.message);
                            }
                        } catch (error) {
                            console.error('Transcription error:', error);
                        }
                    }
                    setIsProcessingAudio(false);

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
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isListening) {
            mediaRecorderRef.current.stop();
            setIsListening(false);
        }
    };

    const toggleListening = () => {
        if (isListening) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
        }
    };

    return (
        <div className="p-4 bg-background">
            <div className="max-w-3xl mx-auto space-y-2">

                {/* Main Input Container */}
                <div className={cn(
                    "relative border border-input shadow-sm bg-card rounded-[28px] overflow-hidden focus-within:ring-1 focus-within:ring-ring transition-all duration-200",
                    isListening && "ring-2 ring-red-500 border-red-500",
                    isProcessingAudio && "opacity-70"
                )}>
                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            isListening ? "Listening..." :
                                isProcessingAudio ? "Transcribing audio..." :
                                    "Ask anything..."
                        }
                        className="w-full px-5 py-4 bg-transparent border-none outline-none resize-none text-[15px] min-h-[56px] max-h-[200px] placeholder:text-muted-foreground/60"
                        disabled={isLoading || isProcessingAudio}
                        rows={1}
                        style={{ height: 'auto', minHeight: '56px' }}
                        onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
                        }}
                    />

                    {/* Bottom Action Row */}
                    <div className="flex items-center justify-between px-3 pb-3 pt-1">
                        {/* Left Actions */}
                        <div className="flex items-center gap-1">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80"
                                    >
                                        <Plus className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-48">
                                    <DropdownMenuItem onClick={onAttachFile} className="gap-2">
                                        <Paperclip className="h-4 w-4" />
                                        <span>File</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={onAttachScreenshot} className="gap-2">
                                        <Scan className="h-4 w-4" />
                                        <span>Screenshot</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-9 w-9 rounded-full transition-colors",
                                    isListening ? "text-red-500 bg-red-50 hover:bg-red-100" : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                                )}
                                onClick={toggleListening}
                                disabled={isProcessingAudio}
                            >
                                {isProcessingAudio ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : isListening ? (
                                    <MicOff className="h-5 w-5" />
                                ) : (
                                    <Mic className="h-5 w-5" />
                                )}
                            </Button>

                            <Button
                                onClick={onSubmit}
                                disabled={!value.trim() || isLoading}
                                size="icon"
                                className={cn(
                                    "h-10 w-12 rounded-2xl transition-all duration-200",
                                    value.trim()
                                        ? "bg-teal-600 hover:bg-teal-700 text-white shadow-md"
                                        : "bg-muted text-muted-foreground"
                                )}
                            >
                                <AudioLines className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
