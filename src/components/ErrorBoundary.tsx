import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  onSkip: () => void;
}

interface State {
  failed: boolean;
}

/** If a chapter crashes, show a way forward instead of a blank screen. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[film roll] A chapter crashed", error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        className="film-bg"
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeContent: "center",
          gap: 20,
          padding: 24,
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontStyle: "italic",
            fontSize: 22,
          }}
        >
          Oops, this reel got tangled.
        </p>
        <button
          type="button"
          className="btn btn-light"
          onClick={this.props.onSkip}
        >
          Skip ahead
        </button>
      </div>
    );
  }
}
