"use client";

/**
 * ScreenErrorBoundary — MeenTrack V2
 *
 * Wraps a single screen so a render/runtime error in one screen shows a
 * recoverable fallback instead of unmounting the whole AppShell + BottomNav
 * (which would strand the user with a blank app — unacceptable for a safety
 * tool used at sea). `resetKey` lets the parent clear the error on tab change
 * so navigating away from a broken screen recovers automatically.
 */

import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Change this (e.g. the active tab id) to auto-reset the boundary. */
  resetKey?: string;
  /** Screen name for the fallback copy + console diagnostics. */
  name?: string;
}

interface State {
  error: Error | null;
}

export class ScreenErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    // Auto-recover when the parent switches screens.
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Production: forward to Sentry here (P8). For now, console for triage.
    console.error(
      `[MeenTrack] screen "${this.props.name ?? "unknown"}" crashed:`,
      error,
      info.componentStack,
    );
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="w-14 h-14 rounded-full bg-mt-red/10 border border-mt-red/25 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-mt-red" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-mt-ink">Something went wrong</p>
            <p className="text-[12px] text-mt-muted mt-1 leading-relaxed">
              This screen hit an error. Your trip and safety data are safe — try reloading.
            </p>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-mt-aqua/10 border border-mt-aqua/30 text-mt-aqua text-[13px] font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Reload screen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ScreenErrorBoundary;
