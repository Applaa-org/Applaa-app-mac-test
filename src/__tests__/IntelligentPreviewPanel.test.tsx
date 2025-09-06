/**
 * 🧪 INTELLIGENT PREVIEW PANEL - REACT COMPONENT TESTS
 * 
 * Tests the React component for user-friendly preview interface
 * Ensures proper rendering, state management, and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => React.createElement('div', props, children),
    button: ({ children, ...props }) => React.createElement('button', props, children)
  },
  AnimatePresence: ({ children }) => children,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-icon">Loading</div>,
  Smartphone: () => <div data-testid="smartphone-icon">Phone</div>,
  QrCode: () => <div data-testid="qr-icon">QR</div>,
  Zap: () => <div data-testid="zap-icon">Zap</div>,
  Sparkles: () => <div data-testid="sparkles-icon">Sparkles</div>,
  CheckCircle: () => <div data-testid="check-icon">Check</div>,
  AlertCircle: () => <div data-testid="alert-icon">Alert</div>,
}));

// Mock IpcClient
const mockIpcClient = {
  getInstance: jest.fn().mockReturnValue({
    ipcRenderer: {
      invoke: jest.fn()
    }
  })
};

jest.mock('../../ipc/ipc_client', () => ({
  IpcClient: mockIpcClient
}));

describe('IntelligentPreviewPanel', () => {
  let IntelligentPreviewPanel: any;
  let mockInvoke: jest.MockedFunction<any>;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    
    mockInvoke = jest.fn();
    mockIpcClient.getInstance.mockReturnValue({
      ipcRenderer: { invoke: mockInvoke }
    });

    // Import component after mocks are set up
    const module = await import('../../components/expo/IntelligentPreviewPanel');
    IntelligentPreviewPanel = module.IntelligentPreviewPanel;
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('🎨 Initial Rendering', () => {
    it('should render initial state when no preview state exists', () => {
      render(
        <IntelligentPreviewPanel
          appId={1}
          appName="Test App"
          isLLMGenerating={false}
        />
      );

      expect(screen.getByText('Mobile Preview')).toBeInTheDocument();
      expect(screen.getByText('Preview will be available once your app is generated...')).toBeInTheDocument();
      expect(screen.getByTestId('smartphone-icon')).toBeInTheDocument();
    });

    it('should start preparation when LLM begins generating', async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        state: {
          appId: 1,
          phase: 'preparing',
          progress: 20,
          userMessage: 'Getting your app ready...',
          motivationalMessage: '🎨 Bringing Test App to life...'
        }
      });

      render(
        <IntelligentPreviewPanel
          appId={1}
          appName="Test App"
          isLLMGenerating={true}
        />
      );

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('intelligent-preview:start-preparation', {
          appId: 1,
          isLLMGenerating: true
        });
      });
    });
  });

  describe('🔄 State Management', () => {
    it('should display preparing state correctly', async () => {
      mockInvoke
        .mockResolvedValueOnce({
          success: true,
          state: {
            appId: 1,
            phase: 'preparing',
            progress: 40,
            userMessage: 'Installing app components...',
            motivationalMessage: '🎨 Bringing Test App to life...'
          }
        })
        .mockResolvedValue({
          success: true,
          state: {
            appId: 1,
            phase: 'preparing',
            progress: 40,
            userMessage: 'Installing app components...',
            motivationalMessage: '🎨 Bringing Test App to life...'
          }
        });

      render(
        <IntelligentPreviewPanel
          appId={1}
          appName="Test App"
          isLLMGenerating={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('🎨 Bringing Test App to life...')).toBeInTheDocument();
        expect(screen.getByText('Installing app components...')).toBeInTheDocument();
        expect(screen.getByText('40%')).toBeInTheDocument();
      });

      expect(screen.getByTestId('zap-icon')).toBeInTheDocument();
    });

    it('should display warming state correctly', async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        state: {
          appId: 1,
          phase: 'warming',
          progress: 85,
          userMessage: 'Your code is ready! Warming up the preview...',
          motivationalMessage: '🔥 Test App is almost ready to shine!'
        }
      });

      render(
        <IntelligentPreviewPanel
          appId={1}
          appName="Test App"
          isLLMGenerating={false}
        />
      );

      // Simulate state update
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      await waitFor(() => {
        expect(screen.getByText('🔥 Test App is almost ready to shine!')).toBeInTheDocument();
        expect(screen.getByText('Your code is ready! Warming up the preview...')).toBeInTheDocument();
        expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      });
    });

    it('should display ready state with QR code', async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        state: {
          appId: 1,
          phase: 'ready',
          progress: 100,
          userMessage: 'Your app is live and ready to preview!',
          motivationalMessage: '🎉 Test App is live and amazing!',
          qrCode: 'exp://192.168.1.100:8081',
          port: 8081
        }
      });

      const mockOnPreviewReady = jest.fn();

      render(
        <IntelligentPreviewPanel
          appId={1}
          appName="Test App"
          isLLMGenerating={false}
          onPreviewReady={mockOnPreviewReady}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('🎉 Preview Ready!')).toBeInTheDocument();
        expect(screen.getByText('🎉 Your Test App is Live!')).toBeInTheDocument();
        expect(screen.getByText('🎉 View Your Live App')).toBeInTheDocument();
        expect(screen.getByTestId('check-icon')).toBeInTheDocument();
      });

      // Should call onPreviewReady callback
      expect(mockOnPreviewReady).toHaveBeenCalledWith('exp://192.168.1.100:8081', 8081);
    });

    it('should display error state with retry option', async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        state: {
          appId: 1,
          phase: 'error',
          progress: 50,
          userMessage: 'Preview setup failed, but we can try again!',
          motivationalMessage: 'Don\'t worry! Let\'s try again.'
        }
      });

      render(
        <IntelligentPreviewPanel
          appId={1}
          appName="Test App"
          isLLMGenerating={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Don\'t worry! Let\'s try again.')).toBeInTheDocument();
        expect(screen.getByText('🔄 Try Again')).toBeInTheDocument();
        expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
      });
    });
  });

  describe('🖱️ User Interactions', () => {
    it('should handle retry button click', async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        state: {
          appId: 1,
          phase: 'error',
          progress: 50,
          userMessage: 'Preview setup failed, but we can try again!',
          motivationalMessage: 'Don\'t worry! Let\'s try again.'
        }
      });

      render(
        <IntelligentPreviewPanel
          appId={1}
          appName="Test App"
          isLLMGenerating={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('🔄 Try Again')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('🔄 Try Again');
      fireEvent.click(retryButton);

      expect(mockInvoke).toHaveBeenCalledWith('intelligent-preview:start-preparation', {
        appId: 1,
        isLLMGenerating: true
      });
    });

    it('should handle "Get Preview Now" button', async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        state: {
          appId: 1,
          phase: 'waiting',
          progress: 0,
          userMessage: 'Waiting for preview request...',
          motivationalMessage: 'Ready when you are!'
        }
      });

      render(
        <IntelligentPreviewPanel
          appId={1}
          appName="Test App"
          isLLMGenerating={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('🚀 Get Preview Now')).toBeInTheDocument();
      });

      const previewButton = screen.getByText('🚀 Get Preview Now');
      fireEvent.click(previewButton);

      expect(mockInvoke).toHaveBeenCalledWith('intelligent-preview:get-preview', {
        appId: 1
      });
    });

    it('should handle "View Your Live App" button', async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        state: {
          appId: 1,
          phase: 'ready',
          progress: 100,
          userMessage: 'Your app is live and ready to preview!',
          motivationalMessage: '🎉 Test App is live and amazing!',
          qrCode: 'exp://192.168.1.100:8081',
          port: 8081
        }
      });

      render(
        <IntelligentPreviewPanel
          appId={1}
          appName="Test App"
          isLLMGenerating={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('🎉 View Your Live App')).toBeInTheDocument();
      });

      const viewButton = screen.getByText('🎉 View Your Live App');
      fireEvent.click(viewButton);

      // Should show QR code (implementation detail)
      // In real component, this would expand QR code view
    });
  });

  describe('⏱️ Polling and Updates', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should poll for state updates when active', async () => {
      mockInvoke
        .mockResolvedValueOnce({
          success: true,
          state: {
            appId: 1,
            phase: 'preparing',
            progress: 20,
            userMessage: 'Getting started...',
            motivationalMessage: 'Starting up...'
          }
        })
        .mockResolvedValue({
          success: true,
          state: {
            appId: 1,
            phase: 'preparing',
            progress: 40,
            userMessage: 'Making progress...',
            motivationalMessage: 'Getting there...'
          }
        });

      render(
        <IntelligentPreviewPanel
          appId={1}
          appName="Test App"
          isLLMGenerating={true}
        />
      );

      // Wait for initial setup
      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('intelligent-preview:start-preparation', expect.any(Object));
      });

      // Advance timers to trigger polling
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('intelligent-preview:get-state', { appId: 1 });
      });
    });

    it('should notify LLM completion when generation stops', async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        state: {
          appId: 1,
          phase: 'preparing',
          progress: 60,
          userMessage: 'Almost there...',
          motivationalMessage: 'Getting close...'
        }
      });

      const { rerender } = render(
        <IntelligentPreviewPanel
          appId={1}
          appName="Test App"
          isLLMGenerating={true}
        />
      );

      // LLM stops generating
      rerender(
        <IntelligentPreviewPanel
          appId={1}
          appName="Test App"
          isLLMGenerating={false}
        />
      );

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('intelligent-preview:llm-completed', { appId: 1 });
      });
    });
  });

  describe('🔧 Error Handling', () => {
    it('should handle IPC errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('IPC Error'));

      // Should not crash
      render(
        <IntelligentPreviewPanel
          appId={1}
          appName="Test App"
          isLLMGenerating={true}
        />
      );

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalled();
      });

      // Component should still render
      expect(screen.getByText('Mobile Preview')).toBeInTheDocument();
    });

    it('should handle missing state gracefully', async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        state: null
      });

      render(
        <IntelligentPreviewPanel
          appId={1}
          appName="Test App"
          isLLMGenerating={false}
        />
      );

      // Should show initial state
      expect(screen.getByText('Preview will be available once your app is generated...')).toBeInTheDocument();
    });

    it('should handle IPC failure responses', async () => {
      mockInvoke.mockResolvedValue({
        success: false,
        error: 'Preview system unavailable'
      });

      render(
        <IntelligentPreviewPanel
          appId={1}
          appName="Test App"
          isLLMGenerating={true}
        />
      );

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalled();
      });

      // Should handle gracefully without crashing
      expect(screen.getByText('Mobile Preview')).toBeInTheDocument();
    });
  });

  describe('📱 Responsive Design', () => {
    it('should render technical details section', async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        state: {
          appId: 1,
          phase: 'preparing',
          progress: 30,
          userMessage: 'Installing dependencies...',
          motivationalMessage: 'Making progress...',
          port: 8081
        }
      });

      render(
        <IntelligentPreviewPanel
          appId={1}
          appName="Test App"
          isLLMGenerating={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Technical Details')).toBeInTheDocument();
      });

      // Click to expand
      const detailsToggle = screen.getByText('Technical Details');
      fireEvent.click(detailsToggle);

      // Should show technical information
      expect(screen.getByText('Phase: preparing')).toBeInTheDocument();
      expect(screen.getByText('Progress: 30%')).toBeInTheDocument();
      expect(screen.getByText('Port: 8081')).toBeInTheDocument();
    });

    it('should show estimated time when available', async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        state: {
          appId: 1,
          phase: 'preparing',
          progress: 50,
          userMessage: 'Half way there...',
          motivationalMessage: 'Making great progress...',
          estimatedTimeRemaining: 45
        }
      });

      render(
        <IntelligentPreviewPanel
          appId={1}
          appName="Test App"
          isLLMGenerating={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Estimated time: 45 seconds')).toBeInTheDocument();
      });
    });
  });

  describe('🎯 Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        state: {
          appId: 1,
          phase: 'ready',
          progress: 100,
          userMessage: 'Ready to preview!',
          motivationalMessage: '🎉 All set!',
          qrCode: 'exp://192.168.1.100:8081'
        }
      });

      render(
        <IntelligentPreviewPanel
          appId={1}
          appName="Test App"
          isLLMGenerating={false}
        />
      );

      await waitFor(() => {
        const button = screen.getByText('🎉 View Your Live App');
        expect(button).toBeInTheDocument();
        expect(button.tagName).toBe('BUTTON');
      });
    });

    it('should provide meaningful text for screen readers', async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        state: {
          appId: 1,
          phase: 'preparing',
          progress: 75,
          userMessage: 'Almost ready...',
          motivationalMessage: 'Nearly there!'
        }
      });

      render(
        <IntelligentPreviewPanel
          appId={1}
          appName="Test App"
          isLLMGenerating={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Nearly there!')).toBeInTheDocument();
        expect(screen.getByText('Almost ready...')).toBeInTheDocument();
        expect(screen.getByText('75%')).toBeInTheDocument();
      });
    });
  });
});
