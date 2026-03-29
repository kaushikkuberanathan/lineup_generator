import { Component } from "react";

/**
 * ErrorBoundary
 *
 * Wraps any component subtree. On JS error during render, renders an inline
 * fallback card instead of white-screening the entire app.
 *
 * Props:
 *   fallback  {string}    Section name shown in fallback UI, e.g. "Game Day"
 *   onError   {function}  Optional callback(error, errorInfo)
 *
 * NOTE: React error boundaries only catch errors thrown during the RENDER of
 * child COMPONENTS (i.e., <ComponentName /> syntax). They cannot catch errors
 * in parent-scope code like inline IIFEs or render-function calls (renderGrid(),
 * etc.) — those run as part of the parent's own render. Boundaries here provide
 * real protection for named components (NowBattingBar, LockFlow, etc.) and act
 * as infrastructure for sections that will be extracted to components over time.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, resetAttempted: false };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(
      "[ErrorBoundary][" + (this.props.fallback || "unknown") + "]",
      error,
      errorInfo
    );
    if (typeof this.props.onError === "function") {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset() {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      resetAttempted: true,
    }));
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    var section = this.props.fallback || "This section";
    var stillBroken = this.state.resetAttempted;

    return (
      <div
        onClick={stillBroken ? undefined : this.handleReset}
        style={{
          background: "#fffbeb",
          border: "1px solid #fcd34d",
          borderRadius: "8px",
          padding: "16px",
          margin: "8px 0",
          cursor: stillBroken ? "default" : "pointer",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span style={{ fontSize: "16px" }}>⚠️</span>
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#92400e", fontFamily: "Georgia, serif" }}>
            {section} is unavailable
          </span>
        </div>
        <div style={{ fontSize: "13px", color: "#b45309" }}>
          {stillBroken
            ? "Still having trouble — try refreshing the page"
            : "Tap to reload this section"}
        </div>
      </div>
    );
  }
}
