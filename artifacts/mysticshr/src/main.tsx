import { createRoot } from "react-dom/client";
import App from "./App";
import { ChunkErrorBoundary } from "./components/ChunkErrorBoundary";
import "./index.css";

// Auto-reload on stale lazy-chunk fetch failures that fire outside React's
// render cycle (e.g. the browser preloads a chunk whose URL no longer exists
// after Vite restarts with a new build hash).
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
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(
  <ChunkErrorBoundary>
    <App />
  </ChunkErrorBoundary>,
);
