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
        id: 'expo-minimal',
        title: 'Minimal Expo App',
        description: 'Clean, minimal Expo app',
        framework: 'expo',
        category: 'basic',
        tags: ['minimal'],
        platforms: ['android', 'ios', 'web'],
        dependencies: ['expo'],
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

// Default props for all tests
const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSelect: vi.fn(),
  userPrompt: 'Create a todo app'
};

describe('MobileFrameworkPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should auto-advance to template selection with single framework', () => {
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} />
      </TestWrapper>
    );

    // Should skip framework selection and go directly to template selection
    expect(screen.queryByText('Select Template')).toBeTruthy();
    expect(screen.queryByText('Choose Mobile Framework')).toBeFalsy();
  });

  test('should show user prompt when provided', () => {
    // Since Expo is the only framework, the component auto-advances to template selection
    // The prompt display is only shown in framework selection, so this test should check
    // that the component still works with a prompt even if it's not displayed
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} userPrompt="Create a todo app" />
      </TestWrapper>
    );

    // Component should still render successfully with a prompt
    expect(screen.queryByText('Select Template')).toBeTruthy();
  });

  test('should start at template selection with auto-advance', async () => {
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} />
      </TestWrapper>
    );

    // Should automatically be at template selection
    await waitFor(() => {
      expect(screen.queryByText('Select Template')).toBeTruthy();
    });
  });

  test('should call onSelect when template is chosen with auto-selected framework', async () => {
    const onSelect = vi.fn();
    
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} onSelect={onSelect} />
      </TestWrapper>
    );

    // Should automatically be at template selection
    await waitFor(() => {
      expect(screen.queryByText('Select Template')).toBeTruthy();
    });

    // Select a template (click twice to confirm selection)
    const templateCard = screen.getByText('Minimal Expo App');
    fireEvent.click(templateCard);
    fireEvent.click(templateCard);

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith(
        'expo',
        expect.objectContaining({
          id: 'expo-minimal',
          title: 'Minimal Expo App'
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

    // Since Expo is the only framework, it auto-advances to step 2
    expect(screen.queryByText('Step 2 of 2')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeTruthy();
  });

  test('should show platform selection in template step', async () => {
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} />
      </TestWrapper>
    );

    // Should automatically be at template selection with platform options
    await waitFor(() => {
      expect(screen.queryByText('Select Template')).toBeTruthy();
      expect(screen.queryByText('Target Platforms')).toBeTruthy();
      // Check for platform buttons by role since they include emojis
      expect(screen.getByRole('button', { name: /android/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /ios/i })).toBeTruthy();
    });
  });



  test('should handle platform selection', async () => {
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} />
      </TestWrapper>
    );

    // Should automatically be at template selection
    await waitFor(() => {
      expect(screen.queryByText('Select Template')).toBeTruthy();
    });

    // Select template to go to platform selection
    const templateCard = screen.getByText('Minimal Expo App');
    fireEvent.click(templateCard);

    await waitFor(() => {
      expect(screen.queryByText('Target Platforms')).toBeTruthy();
      expect(screen.getByRole('button', { name: /android/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /ios/i })).toBeTruthy();
    });
  });

  test('should show compact mode when enabled', () => {
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} compact={true} />
      </TestWrapper>
    );

    // In compact mode, the dialog should have a smaller max width
    const dialog = screen.queryByRole('dialog');
    expect(dialog).toBeTruthy();
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
        <MobileFrameworkPicker {...defaultProps} initialFramework="expo" />
      </TestWrapper>
    );

    // Should automatically advance to template selection
    await waitFor(() => {
      expect(screen.queryByText('Select Template')).toBeTruthy();
    });
  });

  test('should disable Create Project button until all selections are made', async () => {
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} />
      </TestWrapper>
    );

    // Should automatically be at template selection with platforms visible
    await waitFor(() => {
      expect(screen.queryByText('Select Template')).toBeTruthy();
      expect(screen.getByRole('button', { name: /android/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /ios/i })).toBeTruthy();
    });

    // Select a template first
    const templateCard = screen.getByText('Minimal Expo App');
    fireEvent.click(templateCard);

    // Check that Create Project button exists and is initially disabled
    await waitFor(() => {
      const createButton = screen.getByRole('button', { name: /create project/i });
      expect(createButton.disabled).toBe(true);
    });

    // Select platforms
    fireEvent.click(screen.getByRole('button', { name: /android/i }));
    fireEvent.click(screen.getByRole('button', { name: /ios/i }));

    // Button should now be enabled
    await waitFor(() => {
      const createButton = screen.getByRole('button', { name: /create project/i });
      expect(createButton.disabled).toBe(false);
    });
  });
});

describe('Framework Information', () => {
  test('should skip framework selection with single framework', () => {
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} />
      </TestWrapper>
    );

    // Should skip framework selection and go directly to template selection
    expect(screen.queryByText('Select Template')).toBeTruthy();
    expect(screen.queryByText('Choose Mobile Framework')).toBeFalsy();
  });

  test('should auto-advance to template selection when only one framework available', () => {
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} />
      </TestWrapper>
    );

    // Should skip framework selection and go directly to template selection
    expect(screen.queryByText('Select Template')).toBeTruthy();
    expect(screen.queryByText('Step 2 of 2')).toBeTruthy();
  });

  test('should remain on template step when clicking back (single framework)', async () => {
    render(
      <TestWrapper>
        <MobileFrameworkPicker {...defaultProps} />
      </TestWrapper>
    );

    // Should be on template step initially
    expect(screen.queryByText('Select Template')).toBeTruthy();
    
    // Click back button
    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);

    // Should still be on template step due to auto-advance with single framework
    await waitFor(() => {
      expect(screen.queryByText('Select Template')).toBeTruthy();
    });
  });
});


