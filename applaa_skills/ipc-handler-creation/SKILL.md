---
name: ipc-handler-creation
description: Create IPC handlers for Applaa's Electron app. Use when adding new main-to-renderer communication, creating new backend functionality accessible from React, or implementing new features that require main process access (file system, database, shell, etc.).
---

# IPC Handler Creation

Pattern for creating secure IPC handlers in Applaa's Electron app.

## Architecture Overview

```
React Component → Hook → IpcClient → preload.ts → IPC Handler → Database/FS/etc.
```

**Files involved:**
- `src/ipc/handlers/<feature>_handlers.ts` - Handler implementation
- `src/ipc/ipc_host.ts` - Handler registration
- `src/ipc/ipc_client.ts` - Client-side methods
- `src/preload.ts` - Security allowlist

## Step 1: Create Handler File

Create `src/ipc/handlers/<feature>_handlers.ts`:

```typescript
import { ipcMain } from "electron";
import log from "electron-log";
import { createLoggedHandler } from "./safe_handle";
import { withLock } from "../utils/lock_utils";

const logger = log.scope("feature-handlers");
const handle = createLoggedHandler(logger);

export function registerFeatureHandlers(): void {
  // Read operation (no lock needed)
  handle("feature:get", async (_event, { id }: { id: number }) => {
    // Validate input
    if (!id) throw new Error("ID is required");
    
    // Business logic here
    const result = await getFeatureById(id);
    if (!result) throw new Error(`Feature ${id} not found`);
    
    return result;
  });

  // Write operation (use lock for app-specific operations)
  handle("feature:create", async (_event, { appId, data }: { appId: number; data: FeatureData }) => {
    if (!appId) throw new Error("App ID is required");
    
    return withLock(appId, async () => {
      // Mutating operation - use lock to prevent race conditions
      const result = await createFeature(appId, data);
      return result;
    });
  });
}
```

### Key Patterns

1. **Error handling**: Always `throw new Error()` - never return `{ success: false }`
2. **Logging**: Use `log.scope()` and `createLoggedHandler()`
3. **Concurrency**: Use `withLock(appId, ...)` for app-specific mutations
4. **Channel naming**: Use `namespace:action` format (e.g., `feature:create`)

## Step 2: Register Handler

Add to `src/ipc/ipc_host.ts`:

```typescript
import { registerFeatureHandlers } from "./handlers/feature_handlers";

export function registerAllHandlers(): void {
  // ...existing handlers
  registerFeatureHandlers();
}
```

## Step 3: Add to Preload Allowlist

Add channels to `src/preload.ts` in `validInvokeChannels`:

```typescript
const validInvokeChannels = [
  // ...existing channels
  "feature:get",
  "feature:create",
  "feature:update",
  "feature:delete",
];
```

## Step 4: Add Client Method

Add to `src/ipc/ipc_client.ts`:

```typescript
export class IpcClient {
  // ...existing methods

  async getFeature(params: { id: number }): Promise<Feature> {
    return this.ipcRenderer.invoke("feature:get", params);
  }

  async createFeature(params: { appId: number; data: FeatureData }): Promise<Feature> {
    return this.ipcRenderer.invoke("feature:create", params);
  }
}
```

## Step 5: Create React Hook

Create `src/hooks/useFeature.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";
import { showError } from "@/lib/toast";

export function useFeature(id: number | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["feature", id],
    queryFn: async () => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.getFeature({ id: id! });
    },
    enabled: id !== null,
  });

  const createMutation = useMutation({
    mutationFn: async (params: { appId: number; data: FeatureData }) => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.createFeature(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature"] });
    },
    onError: (error) => {
      showError(error);
    },
  });

  return {
    feature: query.data,
    isLoading: query.isLoading,
    error: query.error,
    createFeature: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
```

## Complete Flow Example

```
1. Component calls hook.createFeature({ appId: 1, data: {...} })
2. Hook's mutationFn calls ipcClient.createFeature(...)
3. IpcClient.invoke("feature:create", params)
4. preload.ts validates channel is in allowlist
5. Handler executes with lock, throws Error on failure
6. Error propagates back → TanStack Query catches → onError shows toast
7. Success → onSuccess invalidates queries → UI refreshes
```

## Common Mistakes

- **Missing preload entry**: "Error invoking remote method" = channel not in allowlist
- **Returning instead of throwing**: Handler returns `{ success: false }` breaks error flow
- **Missing lock**: Race conditions when multiple operations on same app
- **Wrong channel name**: Mismatch between handler, preload, and client
