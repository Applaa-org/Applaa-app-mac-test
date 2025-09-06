import { useState, useCallback, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { appOutputAtom, selectedAppIdAtom } from '../atoms/appAtoms';

interface MetroIssue {
  type: 'port_conflict' | 'bundler_stuck' | 'process_hanging' | 'package_mismatch';
  message: string;
  timestamp: number;
  severity: 'warning' | 'error';
}

export const useMetroRecovery = () => {
  const [metroIssues, setMetroIssues] = useState<MetroIssue[]>([]);
  const [showRecoveryPanel, setShowRecoveryPanel] = useState(false);
  const appOutput = useAtomValue(appOutputAtom);
  const selectedAppId = useAtomValue(selectedAppIdAtom);

  // Metro issue detection patterns
  const metroPatterns = [
    {
      pattern: /port.*8081.*already.*in.*use|EADDRINUSE.*8081/i,
      type: 'port_conflict' as const,
      severity: 'error' as const,
      message: 'Port 8081 is occupied by another process'
    },
    {
      pattern: /bundler.*cache.*empty.*rebuilding/i,
      type: 'bundler_stuck' as const,
      severity: 'warning' as const,
      message: 'Metro bundler cache is rebuilding (may indicate stuck process)'
    },
    {
      pattern: /waiting.*on.*http.*localhost.*8081/i,
      type: 'process_hanging' as const,
      severity: 'error' as const,
      message: 'Metro process appears to be hanging on port 8081'
    },
    {
      pattern: /the.*following.*packages.*should.*be.*updated/i,
      type: 'package_mismatch' as const,
      severity: 'warning' as const,
      message: 'Package versions are mismatched with Expo SDK'
    }
  ];

  // Detect Metro issues from console output
  useEffect(() => {
    if (!selectedAppId) return;

    const recentOutput = appOutput.filter(
      output => output.appId === selectedAppId && 
      Date.now() - output.timestamp < 30000 // Last 30 seconds
    );

    const newIssues: MetroIssue[] = [];

    recentOutput.forEach(output => {
      metroPatterns.forEach(({ pattern, type, severity, message }) => {
        if (pattern.test(output.message)) {
          // Check if we already have this issue type recently
          const existingIssue = metroIssues.find(
            issue => issue.type === type && 
            Date.now() - issue.timestamp < 60000 // Within last minute
          );

          if (!existingIssue) {
            newIssues.push({
              type,
              message,
              timestamp: Date.now(),
              severity
            });
          }
        }
      });
    });

    if (newIssues.length > 0) {
      setMetroIssues(prev => [...prev, ...newIssues]);
      
      // Auto-show recovery panel for critical issues
      const hasCriticalIssue = newIssues.some(
        issue => issue.severity === 'error' || 
        issue.type === 'port_conflict' || 
        issue.type === 'process_hanging'
      );
      
      if (hasCriticalIssue) {
        setShowRecoveryPanel(true);
      }
    }
  }, [appOutput, selectedAppId, metroIssues]);

  // Clear old issues (older than 5 minutes)
  useEffect(() => {
    const cleanup = setInterval(() => {
      setMetroIssues(prev => 
        prev.filter(issue => Date.now() - issue.timestamp < 300000)
      );
    }, 60000); // Check every minute

    return () => clearInterval(cleanup);
  }, []);

  const clearIssues = useCallback(() => {
    setMetroIssues([]);
    setShowRecoveryPanel(false);
  }, []);

  const hideRecoveryPanel = useCallback(() => {
    setShowRecoveryPanel(false);
  }, []);

  const forceShowRecoveryPanel = useCallback(() => {
    setShowRecoveryPanel(true);
  }, []);

  // Get current critical issues
  const criticalIssues = metroIssues.filter(
    issue => issue.severity === 'error' && 
    Date.now() - issue.timestamp < 120000 // Last 2 minutes
  );

  const hasPortConflict = metroIssues.some(
    issue => issue.type === 'port_conflict' && 
    Date.now() - issue.timestamp < 120000
  );

  const hasHangingProcess = metroIssues.some(
    issue => issue.type === 'process_hanging' && 
    Date.now() - issue.timestamp < 120000
  );

  return {
    metroIssues,
    criticalIssues,
    showRecoveryPanel,
    hasPortConflict,
    hasHangingProcess,
    clearIssues,
    hideRecoveryPanel,
    forceShowRecoveryPanel
  };
};
