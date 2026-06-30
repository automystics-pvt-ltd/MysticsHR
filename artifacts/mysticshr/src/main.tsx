import { createRoot } from "react-dom/client";
import App from "./App";
import { ChunkErrorBoundary } from "./components/ChunkErrorBoundary";
import "./index.css";

// ─── Stale-chunk auto-recovery ───────────────────────────────────────────────
// Replit restarts the Vite dev server after every checkpoint/environment cycle.
// When Vite reconnects, it sometimes does NOT send a full-reload event, leaving
// the browser with stale lazy-chunk URLs. Any subsequent navigation to a lazy
// route then gets a "Failed to fetch dynamically imported module" crash.
//
// Fix 1 (proactive): force a page reload on every Vite *reconnection* (not the
// first connection on page load). This runs before any chunk fetch is attempted.
if (import.meta.hot) {
  let firstConnect = true;
  import.meta.hot.on("vite:ws:connect", () => {
    if (firstConnect) { firstConnect = false; return; }
    // Vite reconnected after a restart — reload so all module URLs are fresh.
    setTimeout(() => window.location.reload(), 300);
  });
}

// Fix 2 (reactive): catch chunk-fetch rejections that escape React's tree
// (e.g. prefetch initiated by the router before React can catch it).
window.addEventListener("unhandledrejection", (ev) => {
  const err = ev.reason;
  if (
    err instanceof Error &&
    (err.message.includes("Failed to fetch dynamically imported module") ||
      err.message.includes("Importing a module script failed") ||
      err.message.includes("error loading dynamically imported module") ||
      /Loading chunk \d+ failed/.test(err.message))
  ) {
    ev.preventDefault();
    // Small delay so Vite's HTTP server is ready if it just restarted.
    setTimeout(() => window.location.reload(), 1500);
  }
});

createRoot(document.getElementById("root")!).render(
  <ChunkErrorBoundary>
    <App />
  </ChunkErrorBoundary>,
);
