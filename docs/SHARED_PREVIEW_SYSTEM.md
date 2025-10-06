# Shared Preview System with Chrome DevTools MCP

## Overview

The shared preview system provides a unified, reusable architecture for all preview types in Applaa. It integrates Chrome DevTools MCP for consistent debugging capabilities across Expo, Webapp, Flutter, and future app types.

## Architecture

### Core Components

#### 1. **ChromeDevToolsProvider** (`src/components/shared/ChromeDevToolsProvider.tsx`)
- React context provider for DevTools state
- Manages connection, console messages, network requests
- Auto-connects when preview URL is available
- Optional - can be disabled per preview type

#### 2. **ChromeDevToolsPanel** (`src/components/shared/ChromeDevToolsPanel.tsx`)
- Reusable DevTools panel with three tabs:
  - **Console**: JavaScript logs, errors, warnings
  - **Network**: HTTP requests, response times, status codes
  - **Errors**: Dedicated error view with stack traces
- Expandable/collapsible interface
- Real-time updates

#### 3. **ChromeDevToolsToggle** (`src/components/shared/ChromeDevToolsToggle.tsx`)
- Toggle button for showing/hiding DevTools
- Visual indicators for connection status and errors
- Consistent styling across all preview types

#### 4. **PreviewWithDevTools** (`src/components/shared/PreviewWithDevTools.tsx`)
- Wrapper component that adds DevTools to any preview
- Manages DevTools state and positioning
- Provides consistent layout

#### 5. **PreviewFactory** (`src/components/shared/PreviewFactory.tsx`)
- Factory pattern for creating appropriate preview components
- Routes to correct preview based on app type
- Extensible for new preview types

### Preview Types

```typescript
type PreviewType = 'expo' | 'webapp' | 'flutter' | 'react-native' | 'nextjs' | 'vue' | 'svelte';
```

Each preview type has a configuration in `src/types/preview.ts`:

```typescript
interface PreviewSystem {
  type: PreviewType;
  name: string;
  description: string;
  supportedExtensions: string[];
  defaultPort: number;
  devToolsSupported: boolean;
}
```

## Usage Examples

### Basic Usage

```tsx
import { PreviewFactory } from '@/components/shared/PreviewFactory';

function MyPreview() {
  return (
    <PreviewFactory 
      appId={123}
      previewType="expo"
      className="h-full"
    />
  );
}
```

### Custom Preview with DevTools

```tsx
import { PreviewWithDevTools } from '@/components/shared/PreviewWithDevTools';

function CustomPreview() {
  return (
    <PreviewWithDevTools 
      previewUrl="http://localhost:3000"
      devToolsEnabled={true}
    >
      <iframe src="http://localhost:3000" className="w-full h-full" />
    </PreviewWithDevTools>
  );
}
```

### Using DevTools Context

```tsx
import { useChromeDevToolsContext } from '@/components/shared/ChromeDevToolsProvider';

function MyComponent() {
  const { isConnected, errors, hasErrors } = useChromeDevToolsContext();
  
  return (
    <div>
      {hasErrors && <Alert>Found {errors.length} errors!</Alert>}
      <StatusIndicator connected={isConnected} />
    </div>
  );
}
```

## Adding New Preview Types

### 1. Define the Preview Type

Add to `src/types/preview.ts`:

```typescript
export const PREVIEW_SYSTEMS: Record<PreviewType, PreviewSystem> = {
  // ... existing types
  mynewtype: {
    type: 'mynewtype',
    name: 'My New Type',
    description: 'Description of my new preview type',
    supportedExtensions: ['.js', '.ts'],
    defaultPort: 4000,
    devToolsSupported: true
  }
};
```

### 2. Create the Preview Component

```tsx
// src/components/mynewtype/MyNewTypePreview.tsx
import React from 'react';
import { PreviewWithDevTools } from '@/components/shared/PreviewWithDevTools';

export function MyNewTypePreview({ appId, className }: Props) {
  return (
    <PreviewWithDevTools 
      previewUrl={previewUrl}
      devToolsEnabled={true}
      className={className}
    >
      {/* Your preview implementation */}
    </PreviewWithDevTools>
  );
}
```

### 3. Add to PreviewFactory

Update `src/components/shared/PreviewFactory.tsx`:

```tsx
case 'mynewtype':
  return (
    <MyNewTypePreview 
      appId={appId}
      className={className}
      {...props}
    />
  );
```

## Chrome DevTools MCP Integration

### Features

- **Real-time Console Monitoring**: See all JavaScript logs, errors, warnings
- **Network Request Tracking**: Monitor HTTP requests, response times, failures
- **Error Detection**: Automatic error aggregation and reporting
- **Screenshot Capabilities**: Visual debugging when needed
- **Cross-Preview Consistency**: Same debugging experience everywhere

### Configuration

The DevTools integration is automatic when using `PreviewWithDevTools` or `PreviewFactory`. It:

1. **Auto-connects** when a preview URL is available
2. **Polls for updates** every second
3. **Aggregates data** from console, network, and errors
4. **Provides context** to child components

### Disabling DevTools

```tsx
<PreviewWithDevTools 
  previewUrl={previewUrl}
  devToolsEnabled={false} // Disable DevTools
>
  {/* Your preview content */}
</PreviewWithDevTools>
```

## Benefits

### 1. **Consistency**
- Same DevTools experience across all preview types
- Unified debugging capabilities
- Consistent UI/UX patterns

### 2. **Reusability**
- Single DevTools implementation
- Shared components reduce code duplication
- Easy to maintain and update

### 3. **Extensibility**
- Easy to add new preview types
- Factory pattern allows flexible routing
- Type-safe configuration system

### 4. **Debugging Power**
- Real-time visibility into preview behavior
- Network request monitoring
- Error detection and reporting
- Professional debugging experience

## File Structure

```
src/
├── components/
│   ├── shared/
│   │   ├── ChromeDevToolsProvider.tsx    # Context provider
│   │   ├── ChromeDevToolsPanel.tsx       # DevTools UI
│   │   ├── ChromeDevToolsToggle.tsx      # Toggle button
│   │   ├── PreviewWithDevTools.tsx       # Wrapper component
│   │   └── PreviewFactory.tsx            # Factory pattern
│   ├── expo/
│   │   └── SnackPoweredPreview.tsx       # Expo preview (updated)
│   └── webapp/
│       └── WebappPreview.tsx             # Webapp preview (new)
├── hooks/
│   └── useChromeDevTools.ts              # DevTools hook
├── services/
│   └── chrome-devtools-mcp.ts            # MCP service
├── types/
│   └── preview.ts                        # Preview type definitions
└── ipc/
    └── handlers/
        └── chrome_devtools_handlers.ts   # IPC handlers
```

## Future Enhancements

### Planned Features

1. **Performance Monitoring**: CPU, memory, render metrics
2. **Hot Reload Integration**: Automatic refresh on file changes
3. **Mobile Device Simulation**: Device-specific debugging
4. **Custom DevTools Panels**: Plugin system for preview-specific tools
5. **Collaborative Debugging**: Share debugging sessions with team

### Integration Opportunities

- **VS Code Integration**: Connect to VS Code debugger
- **Browser Extensions**: Chrome DevTools extension support
- **API Testing**: Built-in API testing tools
- **Performance Profiling**: Bundle analysis and optimization

## Conclusion

The shared preview system with Chrome DevTools MCP provides a powerful, consistent, and extensible foundation for all preview types in Applaa. It solves the "blank preview" problem by providing real-time debugging visibility while maintaining a clean, reusable architecture that can grow with the platform.
