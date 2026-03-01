import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[Beer Garden] Render error:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-full w-full items-center justify-center bg-slate-900 p-8">
          <div className="max-w-md text-center">
            <h2 className="mb-4 text-xl font-semibold text-white">
              Something went wrong
            </h2>
            <p className="mb-6 text-sm text-slate-400">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
            <button
              className="rounded-lg bg-amber-500 px-6 py-3 text-sm font-medium text-slate-900 active:bg-amber-600"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
