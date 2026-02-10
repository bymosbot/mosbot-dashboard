import { Component } from 'react';
import logger from '../utils/logger';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    logger.error('ErrorBoundary caught an error', error, {
      componentStack: errorInfo.componentStack,
    });
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="flex min-h-screen items-center justify-center bg-dark-950 px-4">
          <div className="w-full max-w-md">
            <div className="bg-dark-900 border border-dark-800 rounded-lg p-8 shadow-xl">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-900/20 rounded-lg mb-4">
                  <span className="text-red-400 text-4xl">⚠️</span>
                </div>
                <h1 className="text-2xl font-bold text-dark-100 mb-2">
                  Something went wrong
                </h1>
                <p className="text-dark-400 text-sm">
                  An unexpected error occurred. Please try refreshing the page.
                </p>
              </div>

              {this.state.error && (
                <div className="mt-6 p-4 bg-dark-800 border border-dark-700 rounded-lg">
                  <p className="text-xs text-red-400 font-mono mb-2">
                    {this.state.error.toString()}
                  </p>
                  {import.meta.env.DEV && this.state.errorInfo && (
                    <details className="text-xs text-dark-400">
                      <summary className="cursor-pointer mb-2">Stack trace</summary>
                      <pre className="overflow-auto max-h-40 text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-dark-200 font-medium rounded-lg transition-colors"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
