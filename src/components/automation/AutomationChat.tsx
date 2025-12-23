import React, { useState, useRef, useEffect } from 'react';
import { useApplaaAutomation } from '@/hooks/useApplaaAutomation';
import { AutomationChatInput } from './AutomationChatInput';
import { AutomationMessage } from './AutomationMessage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Loader2 } from 'lucide-react';

export interface AutomationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: Array<{
    action: {
      type: string;
      method: string;
      params: any;
    };
    result: any;
    success: boolean;
    error?: string;
  }>;
}

export function AutomationChat() {
  const { executeTask, isExecuting, taskResult, error } = useApplaaAutomation();
  const [messages, setMessages] = useState<AutomationMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastTaskRef = useRef<string>('');

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle task results
  useEffect(() => {
    if (taskResult && taskResult.task !== lastTaskRef.current) {
      lastTaskRef.current = taskResult.task;
      
      // Remove any existing loading message for this task
      setMessages((prev) => prev.filter((msg) => !msg.id.startsWith('loading-')));
      
      const assistantMessage: AutomationMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: taskResult.result || 'Task completed',
        timestamp: new Date(),
        actions: taskResult.actions,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }
  }, [taskResult]);

  // Handle errors
  useEffect(() => {
    if (error) {
      // Remove any existing loading message
      setMessages((prev) => prev.filter((msg) => !msg.id.startsWith('loading-')));
      
      const errorMessage: AutomationMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Error: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  }, [error]);

  // Show loading indicator when executing
  useEffect(() => {
    if (isExecuting) {
      setMessages((prev) => {
        // Check if loading message already exists
        const hasLoading = prev.some((msg) => msg.id.startsWith('loading-'));
        if (!hasLoading) {
          const loadingMessage: AutomationMessage = {
            id: `loading-${Date.now()}`,
            role: 'assistant',
            content: '🤖 Executing automation task...',
            timestamp: new Date(),
          };
          return [...prev, loadingMessage];
        }
        return prev;
      });
    } else {
      // Remove loading message when not executing
      setMessages((prev) => prev.filter((msg) => !msg.id.startsWith('loading-')));
    }
  }, [isExecuting]);

  const handleSubmit = async (task: string) => {
    if (!task.trim() || isExecuting) return;

    // Add user message
    const userMessage: AutomationMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: task,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      // Execute task - result will be added via useEffect when taskResult updates
      await executeTask(task);
    } catch (err) {
      // Error is handled by useEffect above
      console.error('Task execution error:', err);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          App Automation
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Control Applaa with natural language commands
        </p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Bot className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Start automating Applaa</p>
              <p className="text-sm max-w-md">
                Try commands like:
              </p>
              <div className="mt-4 text-left space-y-2 text-sm">
                <p>• "Create a new React web app called 'MyApp'"</p>
                <p>• "List all my apps"</p>
                <p>• "Show me details of my first app"</p>
                <p>• "Create a new app, run it, and open the chat"</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <AutomationMessage key={message.id} message={message} />
            ))
          )}
          {isExecuting && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Executing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <AutomationChatInput
          onSubmit={handleSubmit}
          disabled={isExecuting}
        />
      </CardContent>
    </Card>
  );
}

