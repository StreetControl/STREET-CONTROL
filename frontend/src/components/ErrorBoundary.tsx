/**
 * ERROR BOUNDARY
 * Catches React errors and prevents app crashes
 */

import React, { Component, ReactNode } from 'react';
import type { ErrorBoundaryProps, ErrorBoundaryState } from '../types';

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Ignore browser extension errors
    if (error.message?.includes('message channel closed')) {
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Ignore errors from extensions
    if (error.message?.includes('message channel closed')) {
      return;
    }
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-dark-bg">
          <div className="card p-8 max-w-md text-center">
            <h1 className="text-2xl font-bold text-danger mb-4">
              Oops! Qualcosa è andato storto
            </h1>
            <p className="text-dark-text-secondary mb-6">
              Si è verificato un errore inaspettato. Ricarica la pagina per continuare.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Ricarica Pagina
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
