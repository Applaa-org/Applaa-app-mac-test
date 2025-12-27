import { createRouter } from "@tanstack/react-router";
import { rootRoute } from "./routes/root";
import { homeRoute } from "./routes/home";
import { chatRoute } from "./routes/chat";
// import { libraryRoute } from "./routes/library"; // Disabled for MVP
import { settingsRoute } from "./routes/settings";
import { docsRoute } from "./routes/docs";
import { providerSettingsRoute } from "./routes/settings/providers/$provider";
import { appDetailsRoute } from "./routes/app-details";
import { hubRoute } from "./routes/hub";
import { promptToProjectRoute } from "./routes/create-with-prompt";
import { blocklyRoute } from "./routes/blockly";
import { arcadeRoute } from "./routes/arcade";
import { browserAgentRoute } from "./routes/browser-agent";


const routeTree = rootRoute.addChildren([
  homeRoute,
  hubRoute,
  chatRoute,
  blocklyRoute,
  arcadeRoute,
  promptToProjectRoute,
  browserAgentRoute,
  // libraryRoute, // Disabled for MVP
  appDetailsRoute,
  settingsRoute.addChildren([providerSettingsRoute]),
  docsRoute,
]);

// src/components/NotFoundRedirect.tsx
import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { ErrorBoundary } from "./components/ErrorBoundary";

export function NotFoundRedirect() {
  const navigate = useNavigate();

  React.useEffect(() => {
    // Navigate to the main route ('/') immediately on mount
    // 'replace: true' prevents the invalid URL from being added to browser history
    navigate({ to: "/", replace: true });
  }, [navigate]); // Dependency array ensures this runs only once

  // Optionally render null or a loading indicator while redirecting
  // The redirect is usually very fast, so null is often fine.
  return null;
  // Or: return <div>Redirecting...</div>;
}

// 🚀 PERFORMANCE: Optimized TanStack Router configuration
export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFoundRedirect,
  defaultErrorComponent: ErrorBoundary,
  // 🚀 PERFORMANCE: Enable route preloading for faster navigation
  defaultPreload: 'intent', // Preload routes on hover/focus
  defaultPreloadStaleTime: 1000 * 60 * 5, // Cache preloaded routes for 5 minutes
  // 🚀 PERFORMANCE: Optimize route matching
  caseSensitive: false, // Faster route matching
  // 🚀 PERFORMANCE: Enable route caching
  defaultGcTime: 1000 * 60 * 5, // Keep route data cached for 5 minutes
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
