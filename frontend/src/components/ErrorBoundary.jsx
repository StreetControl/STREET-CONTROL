/**
 * 🛡️ ERROR BOUNDARY
 * Cattura errori React e previene crash app
 */

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Ignora errori da estensioni browser
    if (error.message?.includes('message channel closed')) {
      return { hasError: false };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Ignora errori da estensioni
    if (error.message?.includes('message channel closed')) {
      return;
    }
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
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
