import { Component, type ReactNode } from "react";

/** Last line of defence: a render error shows a calm recovery screen instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("BUPC Navi crashed:", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="splash" role="alert">
        <h1 className="serif">Something went wrong</h1>
        <p className="muted">The map hit an unexpected error. Reloading usually fixes it.</p>
        <button className="btn primary" onClick={() => { location.hash = "#/"; location.reload(); }}>Reload</button>
      </div>
    );
  }
}
