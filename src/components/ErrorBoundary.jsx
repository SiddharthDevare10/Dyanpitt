import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import logger from '../utils/logger';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));
    
    logger.error('ErrorBoundary caught an error:', error, errorInfo);

    // Report to error tracking service
    if (window.reportError) {
      window.reportError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorCount } = this.state;
      const isDevelopment = import.meta.env.MODE === 'development';

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-red-100 p-4 rounded-full">
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
            </div>

            {/* Error Title */}
            <h1 className="text-3xl font-bold text-gray-900 text-center mb-4">
              Oops! Something went wrong
            </h1>

            {/* Error Message */}
            <p className="text-gray-600 text-center mb-6">
              We encountered an unexpected error. Don't worry, our team has been notified.
            </p>

            {/* Error Count Warning */}
            {errorCount > 1 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800 text-sm">
                  ⚠️ This error has occurred {errorCount} times. Please try going back to the home page.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center mb-6">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                <Home className="w-5 h-5" />
                Go Home
              </button>
            </div>

            {/* Developer Error Details */}
            {isDevelopment && error && (
              <details className="mt-6 bg-gray-50 rounded-lg p-4">
                <summary className="cursor-pointer font-semibold text-gray-700 mb-2">
                  Error Details (Development Only)
                </summary>
                <div className="mt-4 space-y-4">
                  <div>
                    <h3 className="font-semibold text-red-600 mb-2">Error Message:</h3>
                    <pre className="bg-red-50 p-3 rounded text-sm overflow-auto">
                      {error.toString()}
                    </pre>
                  </div>
                  {errorInfo && errorInfo.componentStack && (
                    <div>
                      <h3 className="font-semibold text-red-600 mb-2">Component Stack:</h3>
                      <pre className="bg-red-50 p-3 rounded text-sm overflow-auto">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                  {error.stack && (
                    <div>
                      <h3 className="font-semibold text-red-600 mb-2">Stack Trace:</h3>
                      <pre className="bg-red-50 p-3 rounded text-xs overflow-auto max-h-64">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Contact Support */}
            <div className="mt-6 text-center text-sm text-gray-500">
              If the problem persists, please contact support with error code: 
              <span className="font-mono ml-2 text-gray-700">
                {Date.now().toString(36).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;