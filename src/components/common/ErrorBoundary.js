import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ServerNode Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white border-2 border-red-300 rounded-lg shadow-lg flex flex-col items-center justify-center p-4 min-h-32">
          <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
          <p className="text-sm text-red-600 text-center">
            Something went wrong with this node
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 px-3 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;