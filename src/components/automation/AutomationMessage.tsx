import React from 'react';
import type { AutomationMessage as AutomationMessageType } from './AutomationChat';
import { User, Bot, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutomationMessageProps {
  message: AutomationMessageType;
}

export function AutomationMessage({ message }: AutomationMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}

      <div
        className={cn(
          'flex flex-col gap-2 max-w-[80%]',
          isUser && 'items-end'
        )}
      >
        <div
          className={cn(
            'rounded-lg px-4 py-3',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        {/* Action Details */}
        {message.actions && message.actions.length > 0 && (
          <div className="space-y-2">
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                View {message.actions.length} action(s)
              </summary>
              <div className="mt-2 space-y-2 pl-4 border-l-2 border-muted">
                {message.actions.map((actionResult, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex items-start gap-2 p-2 rounded',
                      actionResult.success
                        ? 'bg-green-500/10'
                        : 'bg-red-500/10'
                    )}
                  >
                    {actionResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs">
                        {actionResult.action.type}.{actionResult.action.method}
                      </div>
                      {actionResult.error && (
                        <div className="text-red-500 text-xs mt-1">
                          {actionResult.error}
                        </div>
                      )}
                      {actionResult.result && (
                        <div className="text-muted-foreground text-xs mt-1 truncate">
                          {typeof actionResult.result === 'string'
                            ? actionResult.result
                            : JSON.stringify(actionResult.result)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

        {isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}

