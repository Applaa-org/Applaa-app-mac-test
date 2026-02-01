---
name: react-hook-patterns
description: Create React hooks for Applaa using TanStack Query and IPC. Use when building new UI features that need data from main process, implementing CRUD operations, managing loading/error states, or creating reusable data-fetching logic.
---

# React Hook Patterns

TanStack Query + IPC patterns for Applaa React hooks.

## Core Pattern

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";
import { showError } from "@/lib/toast";
```

## Read Hook (useQuery)

```typescript
export function useFeatureList(appId: number | null) {
  return useQuery({
    queryKey: ["features", appId],
    queryFn: async () => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.listFeatures({ appId: appId! });
    },
    enabled: appId !== null,  // Don't fetch until appId is available
  });
}
```

### Query Key Rules

- Always include dependencies in queryKey: `["entity", id]`, `["entity", parentId, "children"]`
- Use consistent naming across hooks for invalidation
- Generic keys for broad invalidation: `["entity"]` invalidates all entity queries

## Write Hook (useMutation)

```typescript
export function useCreateFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { appId: number; name: string }) => {
      if (!params.appId) throw new Error("App ID required");
      
      const ipcClient = IpcClient.getInstance();
      return ipcClient.createFeature(params);
    },
    onSuccess: (_data, variables) => {
      // Invalidate relevant queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ["features", variables.appId] });
      queryClient.invalidateQueries({ queryKey: ["app", variables.appId] });
    },
    onError: (error) => {
      showError(error);
    },
  });
}
```

## Combined Hook Pattern

Most common pattern - combines read and write operations:

```typescript
export function useFeature(featureId: number | null) {
  const queryClient = useQueryClient();

  // Read
  const query = useQuery({
    queryKey: ["feature", featureId],
    queryFn: async () => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.getFeature({ id: featureId! });
    },
    enabled: featureId !== null,
  });

  // Update
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Feature>) => {
      if (!featureId) throw new Error("Feature ID required");
      const ipcClient = IpcClient.getInstance();
      return ipcClient.updateFeature({ id: featureId, ...data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature", featureId] });
    },
    onError: showError,
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!featureId) throw new Error("Feature ID required");
      const ipcClient = IpcClient.getInstance();
      return ipcClient.deleteFeature({ id: featureId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature"] });
    },
    onError: showError,
  });

  return {
    // Data
    feature: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    
    // Update
    updateFeature: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    
    // Delete
    deleteFeature: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
```

## Jotai Integration (Optional)

Sync TanStack Query data with global state:

```typescript
import { useAtom } from "jotai";
import { featuresAtom } from "@/atoms/features";

export function useFeatures(appId: number | null) {
  const [, setFeatures] = useAtom(featuresAtom);

  const query = useQuery({
    queryKey: ["features", appId],
    queryFn: async () => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.listFeatures({ appId: appId! });
    },
    enabled: appId !== null,
  });

  // Sync to global state
  useEffect(() => {
    if (query.data) {
      setFeatures(query.data);
    }
  }, [query.data, setFeatures]);

  return query;
}
```

## Loading States

```tsx
function FeatureList({ appId }) {
  const { features, isLoading, error } = useFeatures(appId);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!features?.length) return <EmptyState />;

  return <List items={features} />;
}
```

## Optimistic Updates

```typescript
const updateMutation = useMutation({
  mutationFn: async (newData) => {
    const ipcClient = IpcClient.getInstance();
    return ipcClient.updateFeature(newData);
  },
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ["feature", id] });
    
    // Snapshot previous value
    const previous = queryClient.getQueryData(["feature", id]);
    
    // Optimistically update
    queryClient.setQueryData(["feature", id], (old) => ({ ...old, ...newData }));
    
    return { previous };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(["feature", id], context?.previous);
    showError(err);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["feature", id] });
  },
});
```

## Common Mistakes

| Issue | Cause | Fix |
|-------|-------|-----|
| Stale data after mutation | Missing invalidation | Add `queryClient.invalidateQueries()` in onSuccess |
| Infinite re-renders | Unstable queryFn | Ensure queryFn doesn't change on every render |
| "enabled" not working | Wrong condition | Use `enabled: id !== null` not `enabled: !!id` |
| Error not shown | Missing onError | Add `onError: showError` to mutations |
| Loading never ends | Query never enabled | Check `enabled` condition is met |
