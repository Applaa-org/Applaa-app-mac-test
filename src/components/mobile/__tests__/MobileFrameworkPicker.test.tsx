/**
 * Tests for MobileFrameworkPicker component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { MobileFrameworkPicker } from '../MobileFrameworkPicker';
import type { Framework, TemplateOption, Platform } from '@/lib/mobile/types';

// Mock the hooks
vi.mock('@/hooks/mobile/useTemplateRegistry', () => ({
  useTemplateRegistry: vi.fn(() => ({
    filteredTemplates: [
      {
        id: 'flutter-minimal',
        title: 'Minimal Flutter App',
        description: 'Clean, minimal Flutter app',
        framework: 'flutter',
        category: 'basic',
        tags: ['minimal'],
        platforms: ['android', 'ios'],
        dependencies: ['flutter'],
        complexity: 1,
        setupTime: 5
      }
    ],
    isLoading: false
  })),
  useTemplateRecommendations: vi.fn(() => ({
    recommendations: []
  }))
}));

vi.mock('@/hooks/mobile/useFlutterEnvironment', () => ({
  useFlutterEnvironment: vi.fn(() => ({
    environmentStatus: {
      isReady: true,
      isChecking: false,
      issues: [],
      recommendations: [],
      hasChecked: true
    }
  }))
}));

// Test wrapper with React Query
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('MobileFrameworkPicker', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelect: vi.fn(),
    userPrompt: 'Create a todo app'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should render framework selection step initially', () => {
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Choose Mobile Framework')).toBeInTheDocument();
    expect(screen.getByText('Flutter')).toBeInTheDocument();
    expect(screen.getByText('Expo')).toBeInTheDocument();
  });

  test('should show user prompt when provided', () => {
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} userPrompt="Create a todo app" />
      </TestWrapper>
    );

    expect(screen.getByText('Based on your prompt:')).toBeInTheDocument();
    expect(screen.getByText('"Create a todo app"')).toBeInTheDocument();
  });

  test('should advance to template selection when framework is selected', async () => {
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} />
      </TestWrapper>
    );

    // Click on Flutter framework
    fireEvent.click(screen.getByText('Flutter'));

    await waitFor(() => {
      expect(screen.getByText('Select Template')).toBeInTheDocument();
    });
  });

  test('should call onSelect when template and framework are chosen', async () => {
    const onSelect = vi.fn();
    
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} onSelect={onSelect} />
      </TestWrapper>
    );

    // Select Flutter framework
    fireEvent.click(screen.getByText('Flutter'));

    await waitFor(() => {
      expect(screen.getByText('Select Template')).toBeInTheDocument();
    });

    // Select a template (click twice to confirm selection)
    const templateCard = screen.getByText('Minimal Flutter App');
    fireEvent.click(templateCard);
    fireEvent.click(templateCard);

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith(
        'flutter',
        expect.objectContaining({
          id: 'flutter-minimal',
          title: 'Minimal Flutter App'
        }),
        expect.any(Array)
      );
    });
  });

  test('should show progress indicator', () => {
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('should allow going back from template to framework selection', async () => {
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} />
      </TestWrapper>
    );

    // Go to template selection
    fireEvent.click(screen.getByText('Flutter'));

    await waitFor(() => {
      expect(screen.getByText('Select Template')).toBeInTheDocument();
    });

    // Click back button
    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);

    await waitFor(() => {
      expect(screen.getByText('Choose Mobile Framework')).toBeInTheDocument();
    });
  });

  test('should handle platform selection', async () => {
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} />
      </TestWrapper>
    );

    // Go to template selection
    fireEvent.click(screen.getByText('Flutter'));

    await waitFor(() => {
      expect(screen.getByText('Target Platforms')).toBeInTheDocument();
    });

    // Platform buttons should be available
    expect(screen.getByText('android')).toBeInTheDocument();
    expect(screen.getByText('ios')).toBeInTheDocument();
  });

  test('should show compact mode when enabled', () => {
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} compact={true} />
      </TestWrapper>
    );

    // In compact mode, the dialog should have a smaller max width
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
  });

  test('should handle close action', () => {
    const onClose = vi.fn();
    
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} onClose={onClose} />
      </TestWrapper>
    );

    // Click close button
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  test('should start with pre-selected framework when provided', async () => {
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} initialFramework="flutter" />
      </TestWrapper>
    );

    // Should automatically advance to template selection
    await waitFor(() => {
      expect(screen.getByText('Select Template')).toBeInTheDocument();
    });
  });

  test('should disable Create Project button when requirements not met', async () => {
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} />
      </TestWrapper>
    );

    // Go to template selection
    fireEvent.click(screen.getByText('Flutter'));

    await waitFor(() => {
      // Create Project button should be disabled initially
      const createButton = screen.getByRole('button', { name: /create project/i });
      expect(createButton).toBeDisabled();
    });
  });
});

describe('Framework Information', () => {
  test('should display correct framework features', () => {
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} />
      </TestWrapper>
    );

    // Check Flutter features
    expect(screen.getByText('Single codebase for all platforms')).toBeInTheDocument();
    expect(screen.getByText('Hot reload for fast development')).toBeInTheDocument();
    expect(screen.getByText('Native performance')).toBeInTheDocument();

    // Check Expo features
    expect(screen.getByText('React Native made easy')).toBeInTheDocument();
    expect(screen.getByText('Instant preview on device')).toBeInTheDocument();
  });

  test('should show popularity ratings', () => {
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('95%')).toBeInTheDocument(); // Flutter popularity
    expect(screen.getByText('88%')).toBeInTheDocument(); // Expo popularity
  });

  test('should display difficulty levels', () => {
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Intermediate')).toBeInTheDocument(); // Flutter
    expect(screen.getByText('Beginner')).toBeInTheDocument(); // Expo
  });
});


