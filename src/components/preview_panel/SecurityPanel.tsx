import { useState } from "react";
import { useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { IpcClient } from "@/ipc/ipc_client";
import { Shield, AlertTriangle, CheckCircle, Loader2, RefreshCw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useStreamChat } from "@/hooks/useStreamChat";
import { useChats } from "@/hooks/useChats";

interface SecurityIssue {
  id: string;
  level: 'high' | 'medium' | 'low';
  issue: string;
  description: string;
  file?: string;
  line?: number;
  column?: number;
  fixable: boolean;
  relevantFiles?: string[];
}

interface SecurityReviewResult {
  issues: SecurityIssue[];
  lastReviewed: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export function SecurityPanel() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const { chats } = useChats(selectedAppId);
  const currentChat = chats?.[0];
  const { streamMessage } = useStreamChat({ hasChatId: false });
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  const {
    data: securityReview,
    isLoading,
    refetch: runSecurityReview,
  } = useQuery<SecurityReviewResult>({
    queryKey: ["security-review", selectedAppId],
    queryFn: async () => {
      if (!selectedAppId) throw new Error("No app selected");
      return await IpcClient.getInstance().runSecurityReview({ appId: selectedAppId });
    },
    enabled: false, // Don't auto-fetch, only fetch when button is clicked
  });

  const handleFixIssue = async (issue: SecurityIssue) => {
    if (!currentChat?.id) {
      alert("No chat available to fix the issue. Please create a chat first.");
      return;
    }

    const fixPrompt = `Fix this security issue: ${issue.issue}

Description: ${issue.description}
${issue.file ? `File: ${issue.file}${issue.line ? `:${issue.line}` : ''}` : ''}
${issue.relevantFiles ? `Relevant files: ${issue.relevantFiles.join(', ')}` : ''}

Please provide a secure fix for this issue.`;

    await streamMessage({
      prompt: fixPrompt,
      chatId: currentChat.id,
    });
  };

  const toggleIssueExpanded = (issueId: string) => {
    setExpandedIssues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(issueId)) {
        newSet.delete(issueId);
      } else {
        newSet.add(issueId);
      }
      return newSet;
    });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (!selectedAppId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No App Selected
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Select an app to run security review
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-purple-500" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Security Review</h2>
              <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                EXPERIMENTAL
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {securityReview?.lastReviewed
                ? `Last reviewed ${new Date(securityReview.lastReviewed).toLocaleString()}`
                : 'Not reviewed yet'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={async () => {
              if (!selectedAppId) return;
              await runSecurityReview();
            }}
            disabled={isLoading || !selectedAppId}
            className="bg-green-600 hover:bg-green-700 text-white border-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Run Security Review
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary */}
      {securityReview && (
        <div className="p-4 border-b border-border bg-background">
          <div className="flex items-center gap-4">
            {securityReview.highCount > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="font-semibold">{securityReview.highCount} High</span>
              </div>
            )}
            {securityReview.mediumCount > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <span className="font-semibold">{securityReview.mediumCount} Medium</span>
              </div>
            )}
            {securityReview.lowCount > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-blue-500" />
                <span className="font-semibold">{securityReview.lowCount} Low</span>
              </div>
            )}
            {securityReview.issues.length === 0 && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-semibold text-green-500">No issues found</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Issues List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : securityReview?.issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Security Issues Found</h3>
            <p className="text-sm text-muted-foreground text-center">
              Your app appears to be secure. Keep up the good work!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {securityReview?.issues.map((issue) => {
              const isExpanded = expandedIssues.has(issue.id);
              return (
                <div key={issue.id} className="p-4 hover:bg-[var(--background-darkest)] transition-colors">
                  <div className="flex items-start gap-4">
                    <input type="checkbox" className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold border flex items-center gap-1 ${getLevelColor(issue.level)}`}>
                          <AlertTriangle className="w-3 h-3" />
                          <span>{issue.level.toUpperCase()}</span>
                        </span>
                        <span className="font-semibold">{issue.issue}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {isExpanded ? issue.description : `${issue.description.substring(0, 150)}...`}
                      </p>
                      {issue.description.length > 150 && (
                        <button
                          onClick={() => toggleIssueExpanded(issue.id)}
                          className="text-xs text-purple-500 hover:text-purple-600 mb-2"
                        >
                          {isExpanded ? 'Show less' : 'Show more'}
                        </button>
                      )}
                      {issue.file && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <FileText className="w-3 h-3" />
                          <span>{issue.file}{issue.line ? `:${issue.line}` : ''}</span>
                        </div>
                      )}
                      {issue.relevantFiles && issue.relevantFiles.length > 0 && (
                        <div className="text-xs text-muted-foreground mb-2">
                          <span className="font-medium">Relevant Files:</span> {issue.relevantFiles.join(', ')}
                        </div>
                      )}
                    </div>
                    {issue.fixable && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleFixIssue(issue)}
                        className="bg-purple-600 hover:bg-purple-700 text-white border-0"
                      >
                        Fix Issue
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

