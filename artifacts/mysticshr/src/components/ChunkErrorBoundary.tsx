import { Component, type ReactNode, type ErrorInfo } from "react";

interface State {
  crashed: boolean;
  reloading: boolean;
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

export class ChunkErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { crashed: false, reloading: false };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    if (isChunkError(error)) return { crashed: true };
    return {};
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (isChunkError(error)) {
      this.setState({ reloading: true });
      setTimeout(() => window.location.reload(), 800);
    } else {
      console.error("[ChunkErrorBoundary] unhandled render error:", error, info);
    }
  }

  render() {
    if (this.state.crashed) {
      return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-background text-foreground">
          <div className="text-center space-y-3 px-4">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-muted-foreground">
              {this.state.reloading ? "Refreshing app…" : "Loading update…"}
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
