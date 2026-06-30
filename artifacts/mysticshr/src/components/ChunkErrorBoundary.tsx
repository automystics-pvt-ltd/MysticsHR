import { Component, type ReactNode, type ErrorInfo } from "react";

interface State {
  hasError: boolean;
  isChunk: boolean;
}

function isChunkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message ?? "";
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("Unable to preload CSS") ||
    /Loading chunk \d+ failed/.test(msg)
  );
}

/**
 * Top-level error boundary.
 *
 * Chunk errors (stale lazy-module URLs after Vite restart) → show spinner and
 * auto-reload after 1.5 s so Vite's HTTP server has time to come back up.
 *
 * Any other unhandled render error → show a minimal "something went wrong"
 * message with a manual reload button so the app never shows a blank screen.
 */
export class ChunkErrorBoundary extends Component<
  { children: ReactNode },
  State
> {
  state: State = { hasError: false, isChunk: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, isChunk: isChunkError(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (isChunkError(error)) {
      setTimeout(() => window.location.reload(), 1500);
    } else {
      console.error("[ErrorBoundary] Unhandled render error:", error, info);
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.state.isChunk) {
      return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-background text-foreground">
          <div className="text-center space-y-3 px-4">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-muted-foreground">Refreshing app…</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4 px-6 max-w-sm">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred. Refreshing the page usually fixes it.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
