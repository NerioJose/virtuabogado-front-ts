'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    // Call parent reset logic if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
    
    // Attempt to recover by resetting state
    this.setState({ hasError: false, error: null });
    // If it's a ChunkLoadError, a reload is often necessary
    if (this.state.error?.name === 'ChunkLoadError' || this.state.error?.message.includes('Loading chunk')) {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center">
          <FiAlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-red-800 mb-2">Ops! Algo salió mal</h2>
          <p className="text-red-600 mb-6 max-w-md mx-auto">
            {this.state.error?.name === 'ChunkLoadError' 
              ? 'Hubo un problema al cargar una parte de la aplicación. Esto suele ocurrir tras una actualización.'
              : 'Ha ocurrido un error inesperado al renderizar esta sección.'}
          </p>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <FiRefreshCw />
            Reintentar / Recargar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
