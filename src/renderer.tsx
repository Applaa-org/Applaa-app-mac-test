import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { router } from "./router";
import { RouterProvider } from "@tanstack/react-router";
import { PostHogProvider } from "posthog-js/react";
import posthog from "posthog-js";
import { getTelemetryUserId, isTelemetryOptedIn } from "./hooks/useSettings";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
  MutationCache,
} from "@tanstack/react-query";
import { showError } from "./lib/toast";
import { IpcClient } from "./ipc/ipc_client";

// @ts-ignore
console.log("Running in mode:", import.meta.env.MODE);

interface MyMeta extends Record<string, unknown> {
  showErrorToast: boolean;
}

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: MyMeta;
    mutationMeta: MyMeta;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.showErrorToast) {
        showError(error);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.showErrorToast) {
        showError(error);
      }
    },
  }),
});

const posthogClient = posthog.init(
  "phc_5Vxx0XT8Ug3eWROhP6mm4D6D2DgIIKT232q4AKxC2ab",
  {
    api_host: "https://us.i.posthog.com",
    // @ts-ignore
    debug: import.meta.env.MODE === "development",
    autocapture: false,
    capture_exceptions: true,
    capture_pageview: false,
    before_send: (event) => {
      if (!isTelemetryOptedIn()) {
        console.debug("Telemetry not opted in, skipping event");
        return null;
      }
      const telemetryUserId = getTelemetryUserId();
      if (telemetryUserId) {
        posthogClient.identify(telemetryUserId);
      }

      if (event?.properties["$ip"]) {
        event.properties["$ip"] = null;
      }

      console.debug(
        "Telemetry opted in - UUID:",
        telemetryUserId,
        "sending event",
        event,
      );
      return event;
    },
    persistence: "localStorage",
  },
);

// Initialize Sentry in renderer process
async function initializeRendererSentry() {
  try {
    // Get Sentry DSN from main process via IPC
    const ipcClient = IpcClient.getInstance();
    const envVars = await ipcClient.getEnvVars();
    const sentryDsn = envVars.SENTRY_DSN;
    
    // Only initialize if DSN is available
    if (sentryDsn) {
      // Check analytics config status and user consent
      const configStatus = await ipcClient.analyticsGetConfigStatus();
      const consentResult = await ipcClient.analyticsGetConsent();
      
      const hasConsent = consentResult.success && consentResult.consent?.crash_reporting;
      const isConfigured = configStatus.success && configStatus.status?.hasSentry;
      
      // Only initialize if user has consented to crash reporting
      if (hasConsent && isConfigured) {
        // Import Sentry renderer SDK
        const Sentry = await import("@sentry/electron/renderer");
        
        Sentry.init({
          dsn: sentryDsn,
          environment: import.meta.env.MODE === "production" ? "production" : "development",
          // Enable automatic instrumentation
          integrations: [Sentry.browserTracingIntegration()],
          // Adjust sample rate based on environment
          tracesSampleRate: import.meta.env.MODE === "production" ? 0.1 : 1.0,
          // Set trace propagation targets (adjust to your API endpoints)
          tracePropagationTargets: ["localhost", /^https:\/\/.*\.sentry\.io/],
          // Privacy filter - remove sensitive data
          beforeSend: (event) => {
            // Remove sensitive data from breadcrumbs
            if (event.breadcrumbs) {
              event.breadcrumbs = event.breadcrumbs.map((breadcrumb: any) => {
                if (breadcrumb.data) {
                  const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'apiKey'];
                  for (const key of sensitiveKeys) {
                    if (breadcrumb.data[key]) {
                      breadcrumb.data[key] = '[REDACTED]';
                    }
                  }
                }
                return breadcrumb;
              });
            }
            
            // Remove sensitive data from extra context
            if (event.extra) {
              const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'apiKey'];
              for (const key of sensitiveKeys) {
                if (event.extra[key]) {
                  event.extra[key] = '[REDACTED]';
                }
              }
            }
            
            return event;
          },
        });
        
        // Set user ID if available
        const telemetryUserId = getTelemetryUserId();
        if (telemetryUserId) {
          Sentry.setUser({ id: telemetryUserId });
        }
        
        console.log("✅ Sentry initialized in renderer process");
      }
    }
  } catch (error) {
    console.error("Failed to initialize Sentry in renderer:", error);
    // Don't throw - Sentry is optional
  }
}

// Initialize Sentry before rendering
initializeRendererSentry();

function App() {
  useEffect(() => {
    // Subscribe to navigation state changes
    const unsubscribe = router.subscribe("onResolved", (navigation) => {
      // Capture the navigation event in PostHog
      posthog.capture("navigation", {
        toPath: navigation.toLocation.pathname,
        fromPath: navigation.fromLocation?.pathname,
      });

      // Optionally capture as a standard pageview as well
      posthog.capture("$pageview", {
        path: navigation.toLocation.pathname,
      });
    });

    // Clean up subscription when component unmounts
    return () => {
      unsubscribe();
    };
  }, []);

  return <RouterProvider router={router} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <PostHogProvider client={posthogClient}>
        <App />
      </PostHogProvider>
    </QueryClientProvider>
  </StrictMode>,
);
