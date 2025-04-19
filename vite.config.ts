import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Add Sentry plugin in production mode only
    process.env.NODE_ENV === "production" &&
      sentryVitePlugin({
        org: process.env.VITE_SENTRY_ORG,
        project: process.env.VITE_SENTRY_PROJECT,
        authToken: process.env.VITE_SENTRY_AUTH_TOKEN,
      }),
  ].filter(Boolean),

  build: {
    // Enable source maps in production for Sentry
    sourcemap: true,
  },
  // Add this to define global variables
  define: {
    // This prevents "process is not defined" errors
    "process.env": {},
  },
});
