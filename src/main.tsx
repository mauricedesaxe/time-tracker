// Initialize Sentry at the very beginning
import * as Sentry from "@sentry/react";

// Get DSN from environment variable
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

// Only initialize if DSN is available
if (SENTRY_DSN) {
  console.log("Initializing Sentry");

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.VITE_NODE_ENV || "development",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Performance monitoring sample rates
    tracesSampleRate:
      import.meta.env.VITE_NODE_ENV === "production" ? 0.2 : 1.0,
    // Session replay sample rates
    replaysSessionSampleRate:
      import.meta.env.VITE_NODE_ENV === "production" ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
  });
} else {
  console.warn("Sentry DSN not found. Error tracking disabled.");
}

// Import other dependencies
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Create root and render app with error boundary
const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <Sentry.ErrorBoundary
        fallback={
          <div className="p-8 text-center">
            An error has occurred. We've been notified and will fix it soon.
            Please refresh the page.
          </div>
        }
      >
        <App />
      </Sentry.ErrorBoundary>
    </StrictMode>
  );
}
